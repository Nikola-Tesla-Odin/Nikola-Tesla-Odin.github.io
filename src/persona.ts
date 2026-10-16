import { parse, stringify } from "yaml";
import { z } from "zod";
import type { TokenInfo } from "./odin";

/** Same shape as the bot's persona YAML (persona_agent/persona.py), minus fields the bot fills in. */
export const PersonaSchema = z.object({
  name: z.string(),
  tagline: z.string(),
  bio: z.string(),
  voice: z.array(z.string()),
  themes: z.array(z.string()),
  examples: z.array(z.string()),
  avoid: z.array(z.string()),
  languages: z.array(z.string()),
  format: z.object({
    kind: z.string(),
    max_words: z.number().int(),
    max_chars: z.number().int(),
    signoff: z.string(),
    plain_language: z.boolean(),
  }),
});

export type Persona = z.infer<typeof PersonaSchema> & { portrait?: string; context?: string };

export type BotSettings = { every_hours: number; budget_usd: number; trending: boolean };

const files = import.meta.glob("./personas/*.yaml", { query: "?raw", import: "default", eager: true });

/** The bot's bundled voices. Portrait paths are relative to persona_agent/personas/ in the bot repo. */
export const BUNDLED: { slug: string; persona: Persona }[] = Object.entries(files)
  .map(([path, raw]) => ({ slug: path.split("/").pop()!.replace(".yaml", ""), persona: parse(raw as string) as Persona }))
  .sort((a, b) => a.persona.name.localeCompare(b.persona.name));

export function portraitUrl(p: Persona): string | null {
  return p.portrait?.endsWith("nikola_tesla.jpg") ? `${import.meta.env.BASE_URL}nikola_tesla.jpg` : null;
}

/** Mirrors studio/server.py token_context: what the persona speaks for, and the hard no-price rules. */
export function tokenContext(t: TokenInfo): string {
  const links = [
    ["website", t.website],
    ["X", t.twitter],
    ["Telegram", t.telegram],
  ]
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");
  return (
    `You are the voice of ${t.name} ($${t.ticker}), a token on Odin.fun, the Bitcoin token platform. ` +
    `About it, in its creator's words: ${t.description || "no description given"}. ${links}\n` +
    `Most of your posts should tie your theme to ${t.name} or the $${t.ticker} community by name, so readers ` +
    "know who is speaking; now and then a pure thought in your own voice is fine. NEVER mention price, " +
    "charts, market cap, or gains; never predict anything; never tell anyone to buy, sell, or hold. This is " +
    "not financial advice and must never sound like it."
  );
}

/** The persona as it will run for this token. */
export function forToken(p: Persona, t: TokenInfo): Persona {
  return {
    ...p,
    context: tokenContext(t),
    format: { ...p.format, signoff: `${p.format.signoff || `— ${p.name}`} · $${t.ticker}` },
  };
}

/** Mirrors Persona.system_prompt in the bot, so the preview speaks the way the bot will. */
export function systemPrompt(p: Persona): string {
  const lines = [`You are ${p.name} — ${p.tagline}`, "", "## Who you are", p.bio.trim(), "", "## How you speak", ...p.voice.map((v) => `- ${v}`)];
  if (p.context) lines.push("", "## What you speak for", p.context.trim());
  if (p.avoid.length) lines.push("", "## Never", ...p.avoid.map((a) => `- ${a}`));
  if (p.examples.length)
    lines.push("", "## Lines in your voice (for tone only; never repeat them verbatim)", ...p.examples.map((e) => `- ${e}`));
  lines.push(
    "",
    "## Rules",
    `- Stay fully in character as ${p.name}. Never mention being an AI or a language model.`,
    "- Write original lines. Do not present invented words as historical quotations.",
    "- Apply your perspective to the modern topic you're given; don't refuse it as anachronistic."
  );
  return lines.join("\n");
}

/** bot/persona.yaml for the owner's copy of Nikola-Tesla-Odin/token-voice-bot. */
export function botYaml(p: Persona, settings: BotSettings): string {
  const { portrait, ...rest } = p;
  const doc: Record<string, unknown> = { bot: settings, ...rest };
  // The file lives in bot/, the bundled portraits in persona_agent/personas/assets/.
  if (portrait) doc.portrait = `../persona_agent/personas/${portrait}`;
  return (
    "# Your token's voice. Edit freely: the bot reads this file on every run.\n" +
    "# bot.every_hours: 2-24 · bot.budget_usd: monthly Claude cap · bot.trending: react to safe news\n" +
    stringify(doc, { lineWidth: 100 })
  );
}
