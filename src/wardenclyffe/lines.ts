// Tesla's log: short lines in his voice, picked from fixed sets so the page costs nothing to run.

const BUY = [
  "A new current flows from {who}. The circuit grows stronger.",
  "{who} has joined the circuit. I felt it in the coil before I saw it on the ledger.",
  "Another receiver tuned to our frequency: {who}. Welcome.",
  "{who} adds {n} to the charge. The dome remembers every spark.",
  "The meters stir. {who} has chosen the future over the financiers.",
  "{who} feeds the tower. Somewhere a lamp grows brighter.",
];
const SELL = [
  "{who} has stepped out of the circuit. I have known desertion before; the tower stands.",
  "A current withdrawn by {who}. No matter. Lightning does not ask permission.",
  "{who} sold {n}. Morgan also lost his nerve. History was not kind to him.",
  "A receiver dims: {who}. The others hum louder to cover the silence.",
];
const LIT = [
  "A lamp is lit in {city}. The circuit reaches another shore.",
  "{city} answers the call. I can see its glow from Long Island.",
  "Receiver confirmed in {city}. One more point of light on the dark map.",
];

function pick(set: string[], seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return set[Math.abs(h) % set.length];
}

function fill(line: string, vars: Record<string, string>) {
  return line.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
}

export function tradeLine(id: string, buy: boolean, who: string, tokens: number) {
  return fill(pick(buy ? BUY : SELL, id), { who, n: `${fmtTokens(tokens)} $TSLA` });
}

export function litLine(city: string) {
  return fill(pick(LIT, city), { city });
}

export function fmtTokens(n: number) {
  if (n >= 1e6) return `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(n >= 1e4 ? 0 : 1)}K`;
  return n.toFixed(0);
}

export function ago(ms: number) {
  const s = Math.max(1, Math.round((Date.now() - ms) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}
