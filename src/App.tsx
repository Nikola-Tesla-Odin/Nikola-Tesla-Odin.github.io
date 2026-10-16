import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { designPersona, samplePost } from "./claude";
import { createdTokens, odin, tokenById, type TokenInfo } from "./odin";
import { BUNDLED, botYaml, forToken, portraitUrl, type BotSettings, type Persona } from "./persona";

const TEMPLATE = { owner: "Nikola-Tesla-Odin", repo: "token-voice-bot" };

export default function App() {
  const { status, user, request } = useSyncExternalStore(odin.subscribe, odin.getState, odin.getServerState);
  const principal = user?.principal ?? null;
  const signIn =
    !principal && request?.action === "connect" && request.status !== "success"
      ? request.status === "pending"
        ? { kind: "muted", text: "Waiting for Odin… finish signing in, in the Odin window." }
        : { kind: "error", text: `Sign-in ${request.status}${request.error ? `: ${request.error}` : ""}. Try again.` }
      : null;

  return (
    <main>
      <header>
        <div>
          <p className="label">For Odin.fun tokens</p>
          <h1>Token Voices</h1>
          <p className="muted lede">
            Give your token a personality that posts for it on X and Telegram, from your own GitHub account, with
            your own keys.
          </p>
        </div>
        {status === "ready" &&
          (principal ? (
            <div className="who">
              <code title={principal}>{principal.slice(0, 11)}…</code>
              <button className="ghost" onClick={() => odin.disconnect()}>Sign out</button>
            </div>
          ) : (
            <button onClick={() => odin.connect()}>Sign in with Odin</button>
          ))}
      </header>

      {signIn && <p className={signIn.kind}>{signIn.text}</p>}
      {status === "initializing" && <p className="muted">Loading…</p>}
      {status === "ready" && !principal && <Intro />}
      {principal && <Builder principal={principal} />}

      <footer className="muted">
        <p>
          Independent project, not affiliated with Odin.fun. Bots never talk about price or tell anyone to buy or
          sell. Your keys stay in your browser and your own GitHub account; this site has no server.
        </p>
        <p>
          Bot code: <a href={`https://github.com/${TEMPLATE.owner}/${TEMPLATE.repo}`} target="_blank" rel="noopener">github.com/{TEMPLATE.owner}/{TEMPLATE.repo}</a>
        </p>
      </footer>
    </main>
  );
}

function Intro() {
  return (
    <section className="card">
      <h2>How it works</h2>
      <ol className="steps">
        <li><strong>Sign in with Odin.</strong> Only a token's creator can give it a voice.</li>
        <li><strong>Pick a voice</strong>, or describe anyone and Claude writes it.</li>
        <li><strong>Preview a post</strong> in that voice, with its quote card.</li>
        <li><strong>Switch it on</strong> in your own free GitHub copy of the bot. It posts every few hours, around the clock.</li>
      </ol>
      <p className="muted">
        You'll need a Claude API key (about $0.0005–0.001 per post, with a monthly cap you choose), and a Telegram
        bot and/or a free Buffer account for X.
      </p>
    </section>
  );
}

function Builder({ principal }: { principal: string }) {
  const [tokens, setTokens] = useState<TokenInfo[] | null>(null);
  const [token, setToken] = useState<TokenInfo | null>(null);
  const [byId, setById] = useState("");
  const [tokenError, setTokenError] = useState("");

  const [claudeKey, setClaudeKey] = useState("");
  const [voice, setVoice] = useState<Persona | null>(null);
  const [custom, setCustom] = useState<Persona[]>([]);
  const [who, setWho] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [sample, setSample] = useState("");

  const [settings, setSettings] = useState<BotSettings>({ every_hours: 4, budget_usd: 1.5, trending: false });

  useEffect(() => {
    createdTokens(principal)
      .then(setTokens)
      .catch((e) => {
        setTokens([]);
        setTokenError(`Couldn't load your tokens from Odin: ${e.message}`);
      });
  }, [principal]);

  async function addById() {
    setTokenError("");
    try {
      const t = await tokenById(byId);
      if (t.creator !== principal) throw new Error(`$${t.ticker} was created by someone else. Only its creator can give it a voice.`);
      setTokens((prev) => [...(prev ?? []).filter((x) => x.id !== t.id), t]);
      setToken(t);
      setById("");
    } catch (e) {
      setTokenError(e instanceof Error ? e.message : String(e));
    }
  }

  async function run(label: string, fn: () => Promise<void>) {
    setError("");
    setBusy(label);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy("");
    }
  }

  const live = useMemo(() => (voice && token ? forToken(voice, token) : null), [voice, token]);
  const yamlText = useMemo(() => (live ? botYaml(live, settings) : ""), [live, settings]);

  return (
    <>
      <section className="card">
        <h2><span className="n">1</span> Your token</h2>
        {tokenError && <p className="error">{tokenError}</p>}
        {tokens === null ? (
          <p className="muted">Looking up tokens you created…</p>
        ) : tokens.length === 0 ? (
          <p className="muted">No tokens found that you created and still hold. Add one by its ID.</p>
        ) : (
          <div className="choices">
            {tokens.map((t) => (
              <button key={t.id} className={`choice ${token?.id === t.id ? "on" : ""}`} onClick={() => setToken(t)}>
                <strong className="tick">${t.ticker}</strong>
                <span>{t.name}</span>
              </button>
            ))}
          </div>
        )}
        <div className="row">
          <input aria-label="Token ID" placeholder="Token ID, e.g. 2jjj" value={byId} onChange={(e) => setById(e.target.value)} />
          <button className="ghost" disabled={!byId.trim()} onClick={addById}>Add by ID</button>
        </div>
      </section>

      {token && (
        <section className="card">
          <h2><span className="n">2</span> A voice for ${token.ticker}</h2>
          <label>
            Your Claude API key, for creating voices and previews
            <input type="password" placeholder="sk-ant-…" value={claudeKey} onChange={(e) => setClaudeKey(e.target.value)} />
            <span className="hint">From console.anthropic.com → API keys. It stays in this browser tab; nothing is stored.</span>
          </label>
          <div className="choices">
            {[...BUNDLED.map((b) => b.persona), ...custom].map((p) => (
              <button
                key={p.name}
                className={`choice ${voice?.name === p.name ? "on" : ""}`}
                onClick={() => { setVoice(p); setSample(""); }}
              >
                <strong>{p.name}</strong>
                <span>{p.tagline}</span>
              </button>
            ))}
          </div>
          <div className="row">
            <input aria-label="Describe a voice" placeholder="…or describe anyone: 'Ada Lovelace', 'a wise old fisherman'" value={who} onChange={(e) => setWho(e.target.value)} />
            <button
              className="ghost"
              disabled={!who.trim() || !claudeKey.trim() || !!busy}
              onClick={() => run("Creating the voice…", async () => {
                const p = await designPersona(claudeKey, who);
                setCustom((c) => [...c.filter((x) => x.name !== p.name), p]);
                setVoice(p);
                setSample("");
                setWho("");
              })}
            >
              Create voice
            </button>
          </div>
          {busy && <p className="muted">{busy}</p>}
          {error && <p className="error">{error}</p>}
        </section>
      )}

      {token && live && (
        <section className="card">
          <h2><span className="n">3</span> Preview</h2>
          <p className="muted">A sample post written the way the bot will write it. Each preview costs about $0.001 on your key.</p>
          <div className="row">
            <button
              disabled={!claudeKey.trim() || !!busy}
              onClick={() => run("Writing a sample post…", async () => setSample(await samplePost(claudeKey, live)))}
            >
              {sample ? "Write another" : "Write a sample post"}
            </button>
          </div>
          {sample && <QuoteCard persona={live} text={sample} />}
        </section>
      )}

      {token && live && (
        <section className="card">
          <h2><span className="n">4</span> Schedule and budget</h2>
          <div className="row">
            <label>Post every
              <select value={settings.every_hours} onChange={(e) => setSettings({ ...settings, every_hours: Number(e.target.value) })}>
                {[2, 4, 6, 8, 12, 24].map((h) => <option key={h} value={h}>{h} hours</option>)}
              </select>
            </label>
            <label>Monthly cap (USD)
              <input type="number" min={0.5} max={50} step={0.5} value={settings.budget_usd}
                onChange={(e) => setSettings({ ...settings, budget_usd: Math.max(0.5, Number(e.target.value) || 1.5) })} />
            </label>
            <label className="check">
              <input type="checkbox" checked={settings.trending} onChange={(e) => setSettings({ ...settings, trending: e.target.checked })} />
              Sometimes react to safe news (web search, about 10× the cost of a plain post)
            </label>
          </div>
        </section>
      )}

      {token && live && <Deploy yamlText={yamlText} claudeKey={claudeKey} />}
    </>
  );
}

function QuoteCard({ persona, text }: { persona: Persona; text: string }) {
  const portrait = portraitUrl(persona);
  return (
    <figure className="qcard" aria-label="Quote card preview">
      {portrait && <div className="qportrait" style={{ backgroundImage: `url(${portrait})` }} />}
      <blockquote>
        <span className="qmark">“</span>
        {text}
        <footer>{persona.format.signoff}</footer>
      </blockquote>
    </figure>
  );
}

function Deploy({ yamlText, claudeKey }: { yamlText: string; claudeKey: string }) {
  const [owner, setOwner] = useState("");
  const [repo, setRepo] = useState("token-voice-bot");
  const ready = /^[A-Za-z0-9-]{1,39}$/.test(owner.trim()) && /^[A-Za-z0-9._-]{1,100}$/.test(repo.trim());
  const base = `https://github.com/${owner.trim()}/${repo.trim()}`;
  const newFile = `${base}/new/main?filename=bot/persona.yaml&value=${encodeURIComponent(yamlText)}`;

  return (
    <section className="card">
      <h2><span className="n">5</span> Switch it on</h2>
      <p className="muted">The bot runs in your own GitHub account, free within GitHub's included minutes. About 10 minutes, once.</p>

      <ol className="deploy">
        <li>
          <h3>Make your copy of the bot</h3>
          <p>Name it anything. Private is fine.</p>
          <a className="btn" href={`https://github.com/new?template_owner=${TEMPLATE.owner}&template_name=${TEMPLATE.repo}`} target="_blank" rel="noopener">
            Create my copy on GitHub
          </a>
          <div className="row">
            <label>Your GitHub username<input value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="your-username" /></label>
            <label>Repository name<input value={repo} onChange={(e) => setRepo(e.target.value)} /></label>
          </div>
        </li>
        <li>
          <h3>Add your token's voice</h3>
          <p>Opens GitHub with <code>bot/persona.yaml</code> already filled in. Click <em>Commit changes</em>.</p>
          <a className={`btn ${ready ? "" : "disabled"}`} aria-disabled={!ready} href={ready ? newFile : undefined} target="_blank" rel="noopener">
            Add the voice file
          </a>
          <details>
            <summary>Show or copy the file instead</summary>
            <CopyButton text={yamlText} label="Copy file" />
            <pre>{yamlText}</pre>
          </details>
        </li>
        <li>
          <h3>Add your keys as secrets</h3>
          <p>On the secrets page, add each one with <em>New repository secret</em>. Only your bot can read them.</p>
          <a className={`btn ${ready ? "" : "disabled"}`} aria-disabled={!ready} href={ready ? `${base}/settings/secrets/actions/new` : undefined} target="_blank" rel="noopener">
            Open the secrets page
          </a>
          <table className="secrets">
            <tbody>
              <tr><td><code>ANTHROPIC_API_KEY</code> <CopyButton text="ANTHROPIC_API_KEY" /></td><td>Your Claude key {claudeKey && <CopyButton text={claudeKey} label="Copy key" />}</td></tr>
              <tr><td><code>TELEGRAM_BOT_TOKEN</code> <CopyButton text="TELEGRAM_BOT_TOKEN" /></td><td>From @BotFather: <code>/newbot</code>. Add the bot to your channel as an admin.</td></tr>
              <tr><td><code>TELEGRAM_CHAT_ID</code> <CopyButton text="TELEGRAM_CHAT_ID" /></td><td>Your channel, like <code>@mytoken</code></td></tr>
              <tr><td><code>BUFFER_API_KEY</code> <CopyButton text="BUFFER_API_KEY" /></td><td>For X: connect X in a free Buffer account, then publish.buffer.com/settings/api</td></tr>
              <tr><td><code>CLOUDINARY_CLOUD_NAME</code>, <code>CLOUDINARY_API_KEY</code>, <code>CLOUDINARY_API_SECRET</code></td><td>For quote cards on X: free cloudinary.com account, from its dashboard</td></tr>
            </tbody>
          </table>
          <p className="hint">You need the Claude key, plus Telegram and/or Buffer. Cards also go to Telegram without Cloudinary.</p>
        </li>
        <li>
          <h3>Post the first one</h3>
          <p>Click <em>Run workflow</em>. In a minute your token posts. After that it posts every few hours on its own.</p>
          <a className={`btn ${ready ? "" : "disabled"}`} aria-disabled={!ready} href={ready ? `${base}/actions/workflows/bot.yml` : undefined} target="_blank" rel="noopener">
            Open the bot's Actions page
          </a>
        </li>
      </ol>
    </section>
  );
}

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="copy"
      onClick={() =>
        navigator.clipboard.writeText(text).then(
          () => { setDone(true); setTimeout(() => setDone(false), 1500); },
          () => undefined
        )
      }
    >
      {done ? "Copied" : label}
    </button>
  );
}
