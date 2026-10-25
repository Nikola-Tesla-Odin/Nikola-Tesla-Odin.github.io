import { useMemo } from "react";
import { geoGraticule10, geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import land110 from "world-atlas/land-110m.json";
import { SHOREHAM, type City } from "./cities";
import type { Holder } from "./odin";

const W = 960;
const H = 500;
const projection = geoNaturalEarth1().fitExtent([[8, 8], [W - 8, H - 8]], { type: "Sphere" });
const path = geoPath(projection);
const topo = land110 as unknown as Topology<{ land: GeometryCollection }>;
const LAND = path(feature(topo, topo.objects.land)) ?? "";
const GRID = path(geoGraticule10()) ?? "";
const SPHERE = path({ type: "Sphere" }) ?? "";

export type Lamp = { city: City; holders: Holder[]; tokens: number };

/** Holders who named a city, grouped by city. */
export function lampsOf(holders: Holder[]): Lamp[] {
  const by = new Map<string, Lamp>();
  for (const h of holders) {
    if (!h.city) continue;
    const lamp = by.get(h.city.id) ?? { city: h.city, holders: [], tokens: 0 };
    lamp.holders.push(h);
    lamp.tokens += h.tokens;
    by.set(h.city.id, lamp);
  }
  return [...by.values()].sort((a, b) => a.tokens - b.tokens); // biggest drawn last, on top
}

export function WorldMap({ lamps, mine, fired }: { lamps: Lamp[]; mine: string | null; fired: boolean }) {
  const max = Math.max(1, ...lamps.map((l) => l.tokens));
  const tower = projection([SHOREHAM.lon, SHOREHAM.lat])!;
  const arcs = useMemo(
    () => lamps.map((l) => path({ type: "LineString", coordinates: [[SHOREHAM.lon, SHOREHAM.lat], [l.city.lon, l.city.lat]] }) ?? ""),
    [lamps],
  );

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={fired ? "map fired" : "map"} role="img" aria-label={`World map with ${lamps.length} lit receivers`}>
      <defs>
        <radialGradient id="lamp">
          <stop offset="0%" stopColor="#fff6d8" />
          <stop offset="35%" stopColor="#ffd27a" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#f7931a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="towerlamp">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="35%" stopColor="#9fd0ff" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#6eb4ff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path d={SPHERE} className="sphere" />
      <path d={GRID} className="grid" />
      <path d={LAND} className="land" />
      {arcs.map((d, i) => <path key={i} d={d} className="arc" style={{ animationDelay: `${(i % 7) * 0.6}s` }} />)}
      {lamps.map((l) => {
        const [x, y] = projection([l.city.lon, l.city.lat])!;
        const r = 7 + 22 * Math.sqrt(l.tokens / max);
        const isMine = mine !== null && l.holders.some((h) => h.user === mine);
        return (
          <g key={l.city.id} className={isMine ? "lamp mine" : "lamp"} transform={`translate(${x} ${y})`}>
            <circle r={r} fill="url(#lamp)" className="flicker" />
            <circle r={2.2} className="core" />
            {isMine && <circle r={r * 0.75} className="ring" />}
            <title>{`${l.city.name}, ${l.city.country}: ${l.holders.map((h) => h.name).join(", ")}`}</title>
          </g>
        );
      })}
      <g transform={`translate(${tower[0]} ${tower[1]})`} className="towerpin">
        <circle r={26} fill="url(#towerlamp)" />
        <path d="M0 -12 L4 2 L-4 2 Z" className="core" />
        <title>Wardenclyffe, Shoreham, New York: the tower</title>
      </g>
    </svg>
  );
}
