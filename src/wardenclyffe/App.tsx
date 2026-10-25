import { useEffect, useMemo, useState } from "react";
import { track } from "../track";
import { CITIES, type City } from "./cities";
import { ago, fmtTokens, litLine, tradeLine } from "./lines";
import { CREATOR, loadWorld, odin, postClaim, TOKEN, type World } from "./odin";
import { need, progress, STAGES } from "./stages";
import { Tower } from "./Tower";
import { lampsOf, WorldMap } from "./WorldMap";

const ODIN_PAGE = `https://odin.fun/token/${TOKEN}`;
const PAGE = "https://nikola-tesla-odin.github.io/wardenclyffe/";

/** `?demo` fills the map with made-up lamps so the page can be previewed before anyone has lit one. */
const DEMO = new URLSearchParams(location.search).has("demo");
/** With `?demo`, `&stage=N` shows the tower at any stage. */
const DEMO_STAGE = DEMO ? Number(new URLSearchParams(location.search).get("stage")) || 0 : 0;

function demoWorld(w: World): World {
  const picks = ["Lagos, Nigeria", "Mumbai, India", "Belgrade, Serbia", "São Paulo, Brazil", "Tokyo, Japan", "Berlin, Germany", "Delhi, India", "Toronto, Canada", "Dubai, United Arab Emirates", "Sydney, Australia", "Bengaluru, India", "London, United Kingdom", "Nairobi, Kenya", "Seoul, South Korea", "Mexico City, Mexico", "Zagreb, Croatia"];
  const fake = picks.map((label, i) => ({ user: `demo-${i}`, name: `demo-${i}`, tokens: 2e6 / (i + 1), city: CITIES.find((c) => c.id === label.toLowerCase()) ?? null }));
  return { ...w, holders: [...w.holders, ...fake], token: { ...w.token, holders: w.token.holders + fake.length } };
}

function useWorld() {
  const [world, setWorld] = useState<World | null>(null);
  const [error, setError] = useState("");
  async function refresh() {
    try {
      const w = await loadWorld();
      setWorld(DEMO ? demoWorld(w) : w);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }
  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 60_000);
    return () => clearInterval(id);
  }, []);
  return { world, error, refresh };
}

function useSignIn() {
  const [principal, setPrincipal] = useState<string | null>(() => odin.restoreSession()?.principal ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function signIn() {
    setError("");
    setBusy(true);
    try {
      // requires_api hands us Odin's session token; the lamp registry shows it to Odin to learn who is lighting a lamp.
      const user = await odin.connect({ requires_api: true, requires_delegation: false });
      setPrincipal(user.principal);
      track("w-signed-in", "Wardenclyffe: signed in");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(/closed|reject/i.test(msg) ? "Sign-in was cancelled. Try again." : `Sign-in failed: ${msg}`);
    } finally {
      setBusy(false);
    }
  }
  function signOut() {
    odin.disconnect();
    setPrincipal(null);
  }
  return { principal, busy, error, signIn, signOut };
}

function shareUrl(city: City) {
  const text = `My lamp is lit in ${city.name} ⚡\n\n$TSLA holders are rebuilding Nikola Tesla's Wardenclyffe tower, one city at a time. Light yours:`;
  return `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(PAGE)}`;
}

function Receiver({ world, onLit }: { world: World; onLit: () => void }) {
  const { principal, busy, error, signIn, signOut } = useSignIn();
  const me = world.holders.find((h) => h.user === principal) ?? null;
  const [query, setQuery] = useState("");
  const [state, setState] = useState<"idle" | "posting" | "failed" | "posted">("idle");
  const [failure, setFailure] = useState("");
  const [chosen, setChosen] = useState<City | null>(null);
  const [moving, setMoving] = useState(false);
  const city = useMemo(() => CITIES.find((c) => `${c.name}, ${c.country}`.toLowerCase() === query.trim().toLowerCase()) ?? null, [query]);

  async function light() {
    if (!city) return;
    setChosen(city);
    setState("posting");
    track("w-light-clicked", "Wardenclyffe: light clicked");
    try {
      if (!odin.api.apiKey) throw new Error("no session token");
      await postClaim(odin.api.apiKey, city);
      setState("posted");
      setMoving(false);
      track("w-lit", "Wardenclyffe: lamp lit");
      setTimeout(onLit, 1500);
    } catch (e) {
      setFailure(e instanceof Error ? e.message : String(e));
      setState("failed");
      track("w-light-failed", "Wardenclyffe: light failed");
    }
  }

  if (!principal) {
    return (
      <section className="card receiver">
        <h2>Light your receiver</h2>
        <p>Hold any amount of $TSLA, sign in with Odin, and pick your city. Your lamp joins the map, and the more you hold, the brighter it burns.</p>
        <div className="row">
          <button onClick={signIn} disabled={busy}>{busy ? "Waiting for Odin…" : "Sign in with Odin"}</button>
          <a className="btn ghost" href={ODIN_PAGE} target="_blank" rel="noreferrer" onClick={() => track("w-buy-clicked", "Wardenclyffe: buy clicked")}>Get $TSLA on Odin.fun</a>
        </div>
        {error && <p className="error">{error}</p>}
      </section>
    );
  }

  const header = (
    <div className="who">
      <span className="hint">Signed in as <code>{principal.slice(0, 11)}…</code></span>
      <button className="copy" onClick={signOut}>Sign out</button>
    </div>
  );

  if (!me) {
    return (
      <section className="card receiver">
        {header}
        <h2>You're not in the circuit yet</h2>
        <p>This Odin account holds no $TSLA. Buy any amount and your receiver appears here within a minute.</p>
        <div className="row">
          <a className="btn" href={ODIN_PAGE} target="_blank" rel="noreferrer" onClick={() => track("w-buy-clicked", "Wardenclyffe: buy clicked")}>Get $TSLA on Odin.fun</a>
          <button className="ghost" onClick={onLit}>I bought, check again</button>
        </div>
      </section>
    );
  }

  const lit = state === "posted" ? chosen : me.city;
  return (
    <section className="card receiver">
      {header}
      {lit ? (
        <>
          <h2>Your lamp burns in {lit.name}</h2>
          <p>{fmtTokens(me.tokens)} $TSLA feeds it. Tell your city to come and stand beside you.</p>
          <div className="row">
            <a className="btn" href={shareUrl(lit)} target="_blank" rel="noreferrer" onClick={() => track("w-shared", "Wardenclyffe: shared")}>Share my lamp on X</a>
            {!moving && <button className="ghost" onClick={() => { setMoving(true); setState("idle"); }}>Move my lamp</button>}
          </div>
        </>
      ) : (
        <h2>You hold {fmtTokens(me.tokens)} $TSLA. Where is your receiver?</h2>
      )}

      {(state === "idle" || state === "posting" || state === "failed") && (!lit || moving) ? (
        <div className="pick">
          <label htmlFor="city" className="hint">Your city</label>
          <input id="city" list="cities" placeholder="Start typing, e.g. Lagos" value={query} onChange={(e) => setQuery(e.target.value)} autoComplete="off" />
          <datalist id="cities">
            {CITIES.map((c) => <option key={c.id} value={`${c.name}, ${c.country}`} />)}
          </datalist>
          <button onClick={light} disabled={!city || state === "posting"}>{state === "posting" ? "Lighting…" : "Light my lamp"}</button>
          {state === "failed" && <p className="error">Couldn't light it: {failure}</p>}
          <p className="hint">Your Odin sign-in proves the lamp is yours. The city is shown publicly next to your Odin name, so pick your city, never your street.</p>
        </div>
      ) : null}

    </section>
  );
}

export default function App() {
  const { world, error, refresh } = useWorld();
  const [mine] = useState<string | null>(() => odin.restoreSession()?.principal ?? null);

  useEffect(() => track("w-visit", "Wardenclyffe: visit"), []);

  if (!world) {
    return (
      <main className="wc">
        <p className="label">$TSLA · Odin.fun</p>
        <h1>Rebuild Wardenclyffe</h1>
        <p className="muted">{error ? `Couldn't reach Odin: ${error}` : "Tuning the receivers…"}</p>
      </main>
    );
  }

  const t = world.token;
  const real = progress(t);
  const built = DEMO_STAGE || real.built;
  const next = DEMO_STAGE ? STAGES.find((s) => s.n === built + 1) ?? null : real.next;
  const stage = STAGES.find((s) => s.n === built);
  const lamps = lampsOf(world.holders.filter((h) => h.user !== CREATOR));
  const dark = world.holders.filter((h) => !h.city && h.user !== CREATOR);
  const asc = Math.min(100, (t.sold / t.threshold) * 100);

  const log = [
    ...world.trades.filter((tr) => tr.user !== CREATOR).map((tr) => ({ key: tr.id, time: tr.time, buy: tr.buy, text: tradeLine(tr.id, tr.buy, tr.name, tr.tokens) })),
  ].sort((a, b) => b.time - a.time).slice(0, 12);

  return (
    <main className="wc">
      <header className="wc-head">
        <div>
          <p className="label">$TSLA · Odin.fun{DEMO && " · demo preview, made-up lamps"}</p>
          <h1>Rebuild Wardenclyffe</h1>
          <p className="lede">In 1917 they tore down Tesla's tower, the one meant to send power to the whole world for free. We're building it again. Every $TSLA holder is a receiver on the map, and every receiver raises the tower.</p>
        </div>
      </header>

      <section className="stage-grid">
        <div className="card tower-card">
          <Tower built={built} />
        </div>
        <div className="card stage-card">
          <p className="label">Stage {built} of 8</p>
          <h2>{stage ? stage.name : "Bare ground"}</h2>
          <p className="tesla">“{stage ? stage.line : "The site lies empty. I have waited a century; I can wait a little longer."}”</p>
          <ol className="stages">
            {STAGES.map((s) => <li key={s.n} className={s.n <= built ? "done" : s.n === built + 1 ? "next" : ""}>{s.name}</li>)}
          </ol>
          {next && <p className="goal"><strong>{need(next, t)}</strong> until <em>{next.name}</em>.</p>}
          <div className="meter" aria-label={`Ascension ${asc.toFixed(1)}%`}>
            <div style={{ width: `${Math.max(asc, 0.8)}%` }} />
          </div>
          <p className="hint">Charge (Odin ascension): {asc.toFixed(1)}%. The tower fires at 100%.</p>
          <dl className="stats">
            <div><dt>Receivers</dt><dd>{t.holders}</dd></div>
            <div><dt>Lamps lit</dt><dd>{lamps.reduce((n, l) => n + l.holders.length, 0)}</dd></div>
            <div><dt>Cities</dt><dd>{lamps.length}</dd></div>
          </dl>
        </div>
      </section>

      <section className="card map-card">
        <div className="map-head">
          <h2>The circuit</h2>
          <p className="hint">{lamps.length ? `${lamps.length} ${lamps.length === 1 ? "city" : "cities"} lit` : "No city lit yet. Yours could be the first."}{dark.length ? ` · ${dark.length} receiver${dark.length === 1 ? "" : "s"} still dark` : ""}</p>
        </div>
        <WorldMap lamps={lamps} mine={mine} fired={built === 8} />
        {dark.length > 0 && (
          <p className="hint dark">Dark receivers, holding $TSLA with no city yet: {dark.map((h) => h.name).join(", ")}. Is one of these you? Sign in below and light it.</p>
        )}
      </section>

      <Receiver world={world} onLit={refresh} />

      <section className="card">
        <h2>Tesla's log</h2>
        <ul className="log">
          {lamps.slice(-3).reverse().map((l) => <li key={l.city.id} className="lit"><span>{litLine(l.city.name)}</span></li>)}
          {log.map((l) => (
            <li key={l.key} className={l.buy ? "buy" : "sell"}><span>{l.text}</span><time>{ago(l.time)}</time></li>
          ))}
        </ul>
      </section>

      <footer className="hint">
        Live from Odin.fun, refreshed every minute. A lamp is a city a holder picked after signing in with Odin; its brightness is their $TSLA balance on Odin. The tower rises with the number of holders and fires when $TSLA ascends. A community art project, not financial advice. Made by <a href="https://x.com/NikolaTesla_eth">@NikolaTesla_eth</a>.
      </footer>
    </main>
  );
}
