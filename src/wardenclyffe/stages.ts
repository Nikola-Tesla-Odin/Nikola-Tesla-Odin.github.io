import type { Token } from "./odin";

/**
 * The tower rises in eight stages. The early ones are counted in receivers (holders) so every new holder is a visible
 * step; the last two follow Odin's ascension, which is `sold / threshold`.
 */
export type Stage = { n: number; name: string; line: string; holders?: number; ascension?: number };

export const STAGES: Stage[] = [
  { n: 1, name: "Foundation", holders: 3, line: "The brick laboratory stands on Long Island soil again." },
  { n: 2, name: "The shaft", holders: 10, line: "The first timbers of the shaft rise. Ten receivers hold them upright." },
  { n: 3, name: "Middle lattice", holders: 21, line: "Twenty-one receivers. The lattice climbs past the treetops." },
  { n: 4, name: "Upper lattice", holders: 50, line: "Fifty receivers. From the top of the lattice one can see the Sound." },
  { n: 5, name: "Dome frame", holders: 100, line: "One hundred receivers. The ribs of the dome are bolted into the sky." },
  { n: 6, name: "Dome plated", holders: 210, line: "The copper hemisphere is sealed. The tower is whole, and silent." },
  { n: 7, name: "Coil charged", ascension: 0.5, line: "Half the charge is gathered. The air around the dome begins to hum." },
  { n: 8, name: "Transmission", ascension: 1, line: "The tower fires. Every receiver on the map lights at once." },
];

export function reached(stage: Stage, t: Token) {
  if (stage.n === 8) return t.ascended;
  if (stage.ascension !== undefined) return t.ascended || t.sold / t.threshold >= stage.ascension;
  return t.holders >= (stage.holders ?? 0);
}

/** The highest stage reached so far (0 = nothing built) and the next one to aim for. */
export function progress(t: Token) {
  let built = 0;
  for (const s of STAGES) if (reached(s, t)) built = s.n;
  else break;
  return { built, next: STAGES.find((s) => s.n === built + 1) ?? null };
}

export function need(next: Stage, t: Token): string {
  if (next.holders !== undefined) {
    const left = next.holders - t.holders;
    return `${left} more receiver${left === 1 ? "" : "s"}`;
  }
  const pct = Math.max(0, (next.ascension ?? 1) - t.sold / t.threshold) * 100;
  return `${pct.toFixed(1)}% more ascension`;
}
