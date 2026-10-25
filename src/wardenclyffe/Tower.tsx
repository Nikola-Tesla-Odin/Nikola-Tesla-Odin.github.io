// Wardenclyffe as Tesla drew it: a tapering octagonal lattice capped by a copper hemisphere, beside Stanford White's
// brick laboratory. Parts not yet built are drawn as a faint blueprint.

const BASE_Y = 392;
const TOP_Y = 150;
const BASE_W = 92;
const TOP_W = 34;
const CX = 150;

/** Half-width of the shaft at height y. */
function half(y: number) {
  const t = (BASE_Y - y) / (BASE_Y - TOP_Y);
  return (BASE_W + (TOP_W - BASE_W) * t) / 2;
}

function Lattice({ y0, y1, built }: { y0: number; y1: number; built: boolean }) {
  const rows = 4;
  const parts: JSX.Element[] = [];
  for (let i = 0; i < rows; i++) {
    const a = y0 - ((y0 - y1) * i) / rows;
    const b = y0 - ((y0 - y1) * (i + 1)) / rows;
    const [la, lb] = [half(a), half(b)];
    parts.push(
      <line key={`h${i}`} x1={CX - la} y1={a} x2={CX + la} y2={a} />,
      <line key={`x${i}`} x1={CX - la} y1={a} x2={CX + lb} y2={b} />,
      <line key={`y${i}`} x1={CX + la} y1={a} x2={CX - lb} y2={b} />,
      <line key={`c${i}`} x1={CX - la * 0.42} y1={a} x2={CX - lb * 0.42} y2={b} />,
      <line key={`d${i}`} x1={CX + la * 0.42} y1={a} x2={CX + lb * 0.42} y2={b} />,
    );
  }
  return (
    <g className={built ? "part built" : "part ghost"}>
      <line x1={CX - half(y0)} y1={y0} x2={CX - half(y1)} y2={y1} className="leg" />
      <line x1={CX + half(y0)} y1={y0} x2={CX + half(y1)} y2={y1} className="leg" />
      {parts}
      <line x1={CX - half(y1)} y1={y1} x2={CX + half(y1)} y2={y1} />
    </g>
  );
}

export function Tower({ built }: { built: number }) {
  const has = (n: number) => built >= n;
  const ribs = [-1, -0.62, -0.25, 0.25, 0.62, 1];
  return (
    <svg viewBox="0 0 300 420" className={`tower stage-${built}`} role="img" aria-label={`Wardenclyffe tower, stage ${built} of 8`}>
      <defs>
        <radialGradient id="glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#bfe3ff" stopOpacity="0.9" />
          <stop offset="45%" stopColor="#6eb4ff" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#6eb4ff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="copper" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e7a46a" />
          <stop offset="100%" stopColor="#8a4d26" />
        </linearGradient>
      </defs>

      {has(7) && <circle cx={CX} cy={118} r={has(8) ? 150 : 90} fill="url(#glow)" className="halo" />}

      <line x1="8" y1={BASE_Y} x2="292" y2={BASE_Y} className="ground" />

      {/* Laboratory */}
      <g className={has(1) ? "part built lab" : "part ghost"}>
        <rect x="206" y="350" width="80" height="42" />
        <polygon points="202,350 246,330 290,350" />
        <rect x="239" y="312" width="14" height="24" />
        {[214, 230, 258, 272].map((x) => <rect key={x} x={x} y="362" width="8" height="14" className="win" />)}
      </g>

      <Lattice y0={BASE_Y} y1={312} built={has(2)} />
      <Lattice y0={312} y1={232} built={has(3)} />
      <Lattice y0={232} y1={TOP_Y} built={has(4)} />

      {/* Dome: hemisphere on a short neck */}
      <g className={has(5) ? "part built" : "part ghost"}>
        <line x1={CX - 10} y1={TOP_Y} x2={CX - 14} y2={128} />
        <line x1={CX + 10} y1={TOP_Y} x2={CX + 14} y2={128} />
        <path d={`M ${CX - 62} 128 A 62 40 0 0 1 ${CX + 62} 128 Z`} className={has(6) ? "dome plated" : "dome"} />
        {ribs.map((r) => (
          <path key={r} d={`M ${CX + r * 62} 128 Q ${CX + r * 40} ${92 - Math.abs(r) * 4} ${CX} 88`} className="rib" />
        ))}
        <line x1={CX - 62} y1={128} x2={CX + 62} y2={128} />
      </g>

      {has(8) && (
        <g className="bolts">
          {[-150, -115, -65, -30, 30, 65, 115, 150].map((a) => {
            const r = (a * Math.PI) / 180;
            const x = CX + Math.sin(r) * 140;
            const y = 108 - Math.cos(r) * 100;
            return <path key={a} d={`M ${CX} 96 L ${(CX + x) / 2 + 8} ${(96 + y) / 2 - 6} L ${(CX + x) / 2 - 6} ${(96 + y) / 2 + 6} L ${x} ${y}`} />;
          })}
        </g>
      )}
    </svg>
  );
}
