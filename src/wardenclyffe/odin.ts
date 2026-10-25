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
/** Every claim is a comment on the token page ending in this tag, e.g. "… lit in Lagos, Nigeria #wardenclyffe". */
export const TAG = "#wardenclyffe";

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
type RawComment = { user: string; time: string; message: string; is_deleted: boolean; blocked: boolean };
type RawTrade = { id: string; user: string; user_username: string | null; time: string; buy: boolean; amount_token: number; amount_btc: number };
type RawToken = { holder_count: number; sold: number; threshold: number; bonded: boolean; price: number; marketcap: number };

/** Where each user last said their receiver is. Later comments win, so moving a lamp is just commenting again. */
export function claimsFrom(comments: RawComment[]): Map<string, City> {
  const claims = new Map<string, City>();
  const sorted = [...comments].sort((a, b) => Date.parse(a.time) - Date.parse(b.time));
  for (const c of sorted) {
    if (c.is_deleted || c.blocked) continue;
    const m = c.message.match(/lit in (.+?)\s*#wardenclyffe/i);
    const city = m && cityByLabel(m[1]);
    if (city) claims.set(c.user, city);
  }
  return claims;
}

export async function loadWorld(): Promise<World> {
  const [raw, owners, comments, trades] = await Promise.all([
    get<RawToken>(`/token/${TOKEN}`),
    pages<RawOwner>(`/token/${TOKEN}/owners`),
    pages<RawComment>(`/token/${TOKEN}/comments`, 10),
    get<{ data: RawTrade[] }>(`/token/${TOKEN}/trades?limit=40`),
  ]);
  const claims = claimsFrom(comments);
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

export function claimText(city: City) {
  return `⚡ My Wardenclyffe receiver is lit in ${city.name}, ${city.country} ${TAG}`;
}

/**
 * Posts the claim as a comment on the $TSLA page, signed in as the holder, so Odin itself vouches for who lit which
 * lamp and no server of ours is needed. Odin's API isn't documented for this; on any failure the page falls back to
 * showing the line for the holder to paste on odin.fun.
 */
export async function postClaim(jwt: string, city: City): Promise<void> {
  const res = await fetch(`${API}/token/${TOKEN}/comment`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
    body: JSON.stringify({ message: claimText(city) }),
  });
  if (!res.ok) throw new Error(`Odin answered ${res.status}`);
}
