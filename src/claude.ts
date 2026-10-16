import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { PersonaSchema, systemPrompt, type Persona } from "./persona";

// Same model the bots post with, so previews match. The key is the visitor's own: it goes from their
// browser straight to Anthropic and nowhere else, which is why browser use is acceptable here.
const MODEL = "claude-haiku-5-5";

function client(apiKey: string) {
  return new Anthropic({ apiKey: apiKey.trim(), dangerouslyAllowBrowser: true });
}

function explain(e: unknown): string {
  if (e instanceof Anthropic.AuthenticationError) return "That Claude API key was rejected. Check it and try again.";
  if (e instanceof Anthropic.PermissionDeniedError) return "This Claude API key isn't allowed to do that.";
  if (e instanceof Anthropic.RateLimitError) return "Claude is rate-limiting this key. Wait a minute and try again.";
  if (e instanceof Anthropic.BadRequestError && /credit balance/i.test(e.message))
    return "Your Anthropic account has no credits. Add some at console.anthropic.com → Billing.";
  if (e instanceof Anthropic.APIConnectionError) return "Couldn't reach Claude. Check your connection.";
  if (e instanceof Anthropic.APIError) return `Claude returned an error: ${e.message}`;
  return e instanceof Error ? e.message : String(e);
}

async function parseOrThrow<T>(run: () => Promise<{ stop_reason: string | null; parsed_output: T | null }>): Promise<T> {
  try {
    const res = await run();
    if (res.stop_reason === "refusal") throw new Error("Claude declined this request. Try a different description.");
    if (!res.parsed_output) throw new Error("Claude's answer couldn't be read. Try again.");
    return res.parsed_output;
  } catch (e) {
    throw new Error(explain(e));
  }
}

/** Turn a name or description into a full voice. Mirrors design_persona in the bot. */
export function designPersona(apiKey: string, who: string): Promise<Persona> {
  const prompt =
    `Design a persona definition for an AI agent that speaks as: ${who}\n\n` +
    "The agent will post short original lines in this voice for a crypto token's community. Make it vivid " +
    "and specific enough that the voice is unmistakable:\n" +
    "- bio: 3-5 sentences grounding era, life, and worldview (for fictional or archetypal characters, invent " +
    "a coherent backstory).\n" +
    "- voice: 5-8 concrete style rules (sentence shape, vocabulary, imagery, rhetorical habits, tone).\n" +
    "- themes: 8-12 topics they'd naturally address, mixing timeless and modern ones. No war or politics.\n" +
    "- examples: 4-6 ORIGINAL sample lines in their voice. Never present real quotations.\n" +
    "- avoid: 3-6 things that would break character, including any talk of prices or financial advice.\n" +
    "- languages: English, plus their native language if it differs.\n" +
    "- format: the kind of short output that suits them (quote, aphorism, verse, rant, tweet...), " +
    "max_words around 45, max_chars 260, a signoff like '— Name', plain_language true.";
  return parseOrThrow(() =>
    client(apiKey).messages.parse({
      model: MODEL,
      max_tokens: 16000,
      output_config: { effort: "medium", format: zodOutputFormat(PersonaSchema) },
      messages: [{ role: "user", content: prompt }],
    })
  );
}

const Sample = z.object({ text: z.string() });

/** One sample post in the voice, as the bot would write it (without translations or a card). */
export async function samplePost(apiKey: string, p: Persona): Promise<string> {
  const topic = p.themes[Math.floor(Math.random() * p.themes.length)] ?? "today";
  const task = [
    `Write one original ${p.format.kind} about: ${topic}`,
    "- Make one clear point a stranger gets on first read: say the idea plainly, and use at most one simple image.",
    "- Use simple, everyday words a 12-year-old would understand and short sentences.",
    `- At most ${p.format.max_words} words and ${p.format.max_chars} characters.`,
    `- Language: ${p.languages[0] ?? "English"}.`,
    "- Find a fresh image and idea. Don't repeat or closely paraphrase any of these:",
    ...p.examples.map((e) => `  • ${e}`),
  ].join("\n");
  const out = await parseOrThrow(() =>
    client(apiKey).messages.parse({
      model: MODEL,
      max_tokens: 16000,
      system: systemPrompt(p),
      output_config: { effort: "low", format: zodOutputFormat(Sample) },
      messages: [{ role: "user", content: task }],
    })
  );
  return out.text;
}
