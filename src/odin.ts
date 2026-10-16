import { OdinConnect, type OdinToken } from "odin-connect";

// One instance per page load (the SDK restores the session and finishes redirects from its constructor).
export const odin = new OdinConnect({ name: "Token Voices", env: "prod" });

/** The fields the studio server needs. BigInt market fields are dropped: they don't JSON-serialize. */
export type TokenInfo = {
  id: string;
  name: string;
  ticker: string;
  description: string | null;
  creator: string;
  website: string | null;
  twitter: string | null;
  telegram: string | null;
  image: string | null;
};

export function toInfo(t: OdinToken): TokenInfo {
  return {
    id: t.id,
    name: t.name,
    ticker: t.ticker,
    description: t.description,
    creator: t.creator,
    website: t.website,
    twitter: t.twitter,
    telegram: t.telegram,
    image: t.image,
  };
}

/** Tokens this user holds and also created. Creators who sold all of theirs can add a token by ID. */
export async function createdTokens(principal: string): Promise<TokenInfo[]> {
  const found: TokenInfo[] = [];
  for (let page = 1; page <= 5; page++) {
    const res = await odin.api.getUserTokens(principal, { page, limit: 50 });
    for (const { token } of res.data) if (token.creator === principal) found.push(toInfo(token));
    if (res.data.length < 50) break;
  }
  return found;
}

export async function tokenById(id: string): Promise<TokenInfo> {
  return toInfo(await odin.api.getToken(id.trim()));
}
