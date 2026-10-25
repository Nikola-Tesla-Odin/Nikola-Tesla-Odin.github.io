// Wardenclyffe lamps: which city each $TSLA holder's receiver burns in.
//
// GET  /lamps  → { "<principal>": { city, time }, … }
// POST /lamp   { city } with "Authorization: Bearer <Odin session token>"
//
// Odin signs its session tokens with a secret, so instead of checking the token here we ask Odin whose it is
// (GET /v2/auth answers with the principal). The token is used for that one call and never stored.
//
// Every 15 minutes it also checks $TSLA on Odin and, when the tower reaches a new highest stage, posts that stage's
// card to X (through Buffer) and Telegram. Odin blocks GitHub's servers, so the TSLA bot can't do this itself.

import { progress, need, STAGES } from "../../src/wardenclyffe/stages";

interface Env {
  LAMPS: KVNamespace;
  BUFFER_API_KEY: string;
  BUFFER_CHANNEL_ID: string;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_CHAT_ID: string;
  DRY_RUN?: string;
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

const PAGE = "https://nikola-tesla-odin.github.io/wardenclyffe/";
const TOKEN_PAGE = "https://odin.fun/token/hjcd";
const UNIT = 1e11; // Odin token amounts carry decimals (3) + divisibility (8) extra digits

async function currentStage() {
  const res = await fetch("https://api.odin.fun/v2/token/hjcd", { headers: { "User-Agent": "Mozilla/5.0 (Wardenclyffe lamp registry)" } });
  if (!res.ok) throw new Error(`Odin answered ${res.status}`);
  const t = (await res.json()) as { holder_count: number; sold: number; threshold: number; bonded: boolean; price: number; marketcap: number };
  const token = { holders: t.holder_count, sold: t.sold / UNIT, threshold: t.threshold / UNIT, ascended: t.bonded, priceSats: t.price / 1000, marketcapSats: t.marketcap / 1000 };
  return { token, ...progress(token) };
}

function stagePost(built: number, nextLine: string) {
  const stage = STAGES[built - 1];
  return `${stage.line}\n\nWardenclyffe, stage ${built} of 8: ${stage.name}. ${nextLine}\n\nLight your receiver: ${PAGE}\n$TSLA: ${TOKEN_PAGE}`;
}

async function buffer(env: Env, text: string, image: string) {
  const res = await fetch("https://api.buffer.com", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.BUFFER_API_KEY}`, "User-Agent": "wardenclyffe" },
    body: JSON.stringify({
      query: `mutation($input: CreatePostInput!) { createPost(input: $input) { ... on PostActionSuccess { post { id } } ... on MutationError { message } } }`,
      variables: { input: { text, channelId: env.BUFFER_CHANNEL_ID, schedulingType: "automatic", mode: "shareNow", aiAssisted: true, assets: [{ image: { url: image } }] } },
    }),
  });
  const body = (await res.json()) as { data?: { createPost: { post?: { id: string }; message?: string } }; errors?: { message: string }[] };
  const err = body.errors?.[0]?.message ?? body.data?.createPost.message;
  if (err) throw new Error(`Buffer: ${err}`);
}

async function telegram(env: Env, text: string, image: string) {
  const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendPhoto`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, photo: image, caption: text }),
  });
  if (!res.ok) throw new Error(`Telegram answered ${res.status}`);
}

/** Posts when the tower passes its highest stage so far. Stages can fall back when holders sell; that stays quiet. */
async function announceStage(env: Env) {
  const { token, built, next } = await currentStage();
  const seen = await env.LAMPS.get<{ max: number }>("stage", "json");
  if (!seen) {
    await env.LAMPS.put("stage", JSON.stringify({ max: built })); // first run: remember where we are, don't post
    return;
  }
  if (built <= seen.max) return;

  const nextLine = next ? `${need(next, token)} until ${next.name}.` : "The tower is complete.";
  const text = stagePost(built, nextLine);
  const image = `${PAGE}stage-${built}.jpg`;
  if (env.DRY_RUN) {
    console.log(`[dry run] would post stage ${built}:\n${text}\n${image}`);
  } else {
    const results = await Promise.allSettled([buffer(env, text, image), telegram(env, text, image)]);
    for (const r of results) if (r.status === "rejected") console.log(`stage ${built}: ${r.reason}`);
  }
  await env.LAMPS.put("stage", JSON.stringify({ max: built }));
}

export default {
  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(announceStage(env));
  },

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
