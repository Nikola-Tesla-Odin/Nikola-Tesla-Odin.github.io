import { OdinConnect } from "odin-connect";
import { cityByLabel, type City } from "./cities";

// odin-connect 1.7, as in the studio: Odin's live sign-in doesn't yet send what 2.x requires.
export const odin = new OdinConnect({ name: "Wardenclyffe", env: "prod" });

export const TOKEN = "hjcd";
const API = "https://api.odin.fun/v2";
/** Odin token amounts carry decimals (3) + divisibility (8) extra digits. */
const UNIT = 1e11;
/** The creator's lamp stands at the tower itself, Shoreham, Long Island. */
export const CREATOR = "svt3k-45xi7-cln4t-sa2ns-k4sbp-m4i5d-gljaf-5644a-heo3s-2mvrm-vae";
/** The lamp registry (worker/ in this repo): which city each holder picked, checked against their Odin sign-in. */
export const LAMPS = "https://wardenclyffe.nikola-tesla-odin.workers.dev";

export type Holder = { user: string; name: string; tokens: number; city: City | null };
export type Trade = { id: string; user: string; name: string; time: number; buy: boolean; tokens: number; sats: number };
export type Token = { holders: number; sold: number; threshold: number; ascended: boolean; priceSats: number; marketcapSats: number };
export type World = { token: Token; holders: Holder[]; trades: Trade[] };

async function get<T>(path: string): Promise<T> {
  const res = await fetch(API + path);
  if (!res.ok) throw new Error(`Odin answered ${res.status} for ${path}`);
  return res.json();
}

async function pages<T>(path: string, max = 20): Promise<T[]> {
  const all: T[] = [];
  for (let page = 1; page <= max; page++) {
    const res = await get<{ data: T[]; count: number }>(`${path}${path.includes("?") ? "&" : "?"}limit=100&page=${page}`);
    all.push(...res.data);
    if (res.data.length < 100 || all.length >= res.count) break;
  }
  return all;
}

type RawOwner = { user: string; balance: number; user_username: string | null };
type RawTrade = { id: string; user: string; user_username: string | null; time: string; buy: boolean; amount_token: number; amount_btc: number };
type RawToken = { holder_count: number; sold: number; threshold: number; bonded: boolean; price: number; marketcap: number };

/** Where each holder's receiver is. A holder moves their lamp by picking another city. */
async function loadClaims(): Promise<Map<string, City>> {
  const res = await fetch(`${LAMPS}/lamps`);
  if (!res.ok) throw new Error(`The lamp registry answered ${res.status}`);
  const lamps: Record<string, { city: string }> = await res.json();
  const claims = new Map<string, City>();
  for (const [user, { city }] of Object.entries(lamps)) {
    const c = cityByLabel(city);
    if (c) claims.set(user, c);
  }
  return claims;
}

export async function loadWorld(): Promise<World> {
  const [raw, owners, claims, trades] = await Promise.all([
    get<RawToken>(`/token/${TOKEN}`),
    pages<RawOwner>(`/token/${TOKEN}/owners`),
    loadClaims().catch(() => new Map<string, City>()), // the map still shows holders if the registry is down
    get<{ data: RawTrade[] }>(`/token/${TOKEN}/trades?limit=40`),
  ]);
  return {
    token: {
      holders: raw.holder_count,
      sold: raw.sold / UNIT,
      threshold: raw.threshold / UNIT,
      ascended: raw.bonded,
      priceSats: raw.price / 1000, // prices and BTC amounts come in millisats
      marketcapSats: raw.marketcap / 1000,
    },
    holders: owners
      .filter((o) => o.balance > 0)
      .map((o) => ({ user: o.user, name: o.user_username || o.user.slice(0, 11), tokens: o.balance / UNIT, city: claims.get(o.user) ?? null }))
      .sort((a, b) => b.tokens - a.tokens),
    trades: trades.data.map((t) => ({
      id: t.id,
      user: t.user,
      name: t.user_username || t.user.slice(0, 11),
      time: Date.parse(t.time),
      buy: t.buy,
      tokens: t.amount_token / UNIT,
      sats: t.amount_btc / 1000,
    })),
  };
}

/**
 * Records the holder's city. The Worker asks Odin whose session token this is, so nobody can light a lamp for
 * someone else; the token is used for that one check and not kept.
 */
export async function postClaim(jwt: string, city: City): Promise<void> {
  const res = await fetch(`${LAMPS}/lamp`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
    body: JSON.stringify({ city: `${city.name}, ${city.country}` }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || `The lamp registry answered ${res.status}`);
  }
}
