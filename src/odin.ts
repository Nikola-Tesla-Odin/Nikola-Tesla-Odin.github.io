import { useState } from "react";
import { OdinConnect, type OdinConnectedUser, type OdinToken } from "odin-connect";
import { track } from "./track";

// odin-connect 1.7: Odin's live sign-in page doesn't yet send the identity proof that 2.x requires.
// This site has no server that trusts the sign-in, so the 1.x flow loses nothing that matters here.
export const odin = new OdinConnect({ name: "Token Voices", env: "prod" });

/** Odin sign-in state for the page: restores a saved session, signs in through Odin's popup. */
export function useOdin() {
  const [user, setUser] = useState<OdinConnectedUser | null>(() => odin.restoreSession());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function signIn() {
    setError("");
    setBusy(true);
    try {
      setUser(await odin.connect());
      track("2-signed-in", "Signed in with Odin");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      track("signin-failed", "Sign-in failed or cancelled");
      setError(/closed|reject/i.test(msg) ? "Sign-in was cancelled. Try again." : `Sign-in failed: ${msg}`);
    } finally {
      setBusy(false);
    }
  }

  function signOut() {
    odin.disconnect();
    setUser(null);
  }

  return { principal: user?.principal ?? null, busy, error, signIn, signOut };
}

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
