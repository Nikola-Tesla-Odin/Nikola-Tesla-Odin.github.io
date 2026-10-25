// Wardenclyffe lamps: which city each $TSLA holder's receiver burns in.
//
// GET  /lamps  → { "<principal>": { city, time }, … }
// POST /lamp   { city } with "Authorization: Bearer <Odin session token>"
//
// Odin signs its session tokens with a secret, so instead of checking the token here we ask Odin whose it is
// (GET /v2/auth answers with the principal). The token is used for that one call and never stored.

interface Env {
  LAMPS: KVNamespace;
}

type Lamps = Record<string, { city: string; time: string }>;

const ORIGINS = ["https://nikola-tesla-odin.github.io", "http://localhost:5199"];
const KEY = "lamps";

function cors(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ORIGINS.includes(origin) ? origin : ORIGINS[0],
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    Vary: "Origin",
  };
}

function json(req: Request, body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...cors(req), ...extra } });
}

async function whoIs(token: string): Promise<string | null> {
  const res = await fetch("https://api.odin.fun/v2/auth", {
    headers: { Authorization: `Bearer ${token}`, Accept: "text/plain", "User-Agent": "Mozilla/5.0 (Wardenclyffe lamp registry)" },
  });
  if (!res.ok) return null;
  const principal = (await res.text()).trim().replace(/^"|"$/g, "");
  return /^[a-z0-9]{5}(-[a-z0-9]{3,5}){1,10}$/.test(principal) ? principal : null;
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(req.url);
    if (req.method === "OPTIONS") return new Response(null, { headers: cors(req) });

    if (req.method === "GET" && pathname === "/lamps") {
      const lamps = (await env.LAMPS.get<Lamps>(KEY, "json")) ?? {};
      return json(req, lamps, 200, { "Cache-Control": "public, max-age=15" });
    }

    if (req.method === "POST" && pathname === "/lamp") {
      const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? "";
      if (!token) return json(req, { error: "Sign in with Odin first." }, 401);
      let city = "";
      try {
        city = String(((await req.json()) as { city?: unknown }).city ?? "").trim();
      } catch {
        // falls through to the check below
      }
      if (!city || city.length > 80) return json(req, { error: "Pick a city." }, 400);

      const principal = await whoIs(token);
      if (!principal) return json(req, { error: "Odin didn't recognise this sign-in. Sign out and in again." }, 401);

      const lamps = (await env.LAMPS.get<Lamps>(KEY, "json")) ?? {};
      lamps[principal] = { city, time: new Date().toISOString() };
      await env.LAMPS.put(KEY, JSON.stringify(lamps));
      return json(req, { principal, city });
    }

    return json(req, { error: "Not found" }, 404);
  },
};
