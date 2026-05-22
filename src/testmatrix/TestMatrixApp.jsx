import React, { useEffect, useMemo, useState } from 'react';
import { clampText, sanitizeCss, sanitizeHtml } from './sanitize.mjs';

const API_ORIGIN = 'http://localhost:8799';

const EXECUTION = Object.freeze({
  test1: { id: 'browser', label: 'browser-only (public)' },
  test2: { id: 'local', label: 'developer-only (requires local runner on this machine)' },
  test3: { id: 'local', label: 'developer-only (requires local runner on this machine)' },
  test4: { id: 'local', label: 'developer-only (requires local runner on this machine)' },
});

function useRunnerHealth(enabled) {
  const [state, setState] = useState({ ok: enabled ? null : true, checkedAt: 0, error: '' });

  useEffect(() => {
    if (!enabled) return;

    let alive = true;

    async function ping() {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 1200);
      try {
        const res = await fetch(`${API_ORIGIN}/health`, { method: 'GET', signal: controller.signal });
        const json = await res.json().catch(() => ({}));
        if (!alive) return;
        if (res.ok && json?.ok) setState({ ok: true, checkedAt: Date.now(), error: '' });
        else setState({ ok: false, checkedAt: Date.now(), error: json?.error || `HTTP ${res.status}` });
      } catch (err) {
        if (!alive) return;
        setState({ ok: false, checkedAt: Date.now(), error: err?.message || String(err) });
      } finally {
        clearTimeout(t);
      }
    }

    ping();
    const iv = setInterval(ping, 5000);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, [enabled]);

  return state;
}

function usePathTestId() {
  const [path, setPath] = useState(window.location.pathname || '/');
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname || '/');
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  const match = path.match(/^\/(test[1-4])(\/|$)/);
  return match?.[1] || 'test1';
}

function Nav({ active }) {
  const rawHost = String(window.location.hostname || '').toLowerCase();
  const host = rawHost.startsWith('[') && rawHost.endsWith(']') ? rawHost.slice(1, -1) : rawHost;
  const isLocalhost = ['localhost', '127.0.0.1', '::1'].includes(host);
  const items = isLocalhost
    ? [
        { id: 'test1', label: 'test1 (client sandbox)' },
        { id: 'test4', label: 'test4 (dev-only build runner)' },
        { id: 'test3', label: 'test3 (dev-only build+validate)' },
        { id: 'test2', label: 'test2 (dev-only scratchpad)' },
      ]
    : [{ id: 'test1', label: 'test1 (client sandbox)' }];
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
      {items.map((it) => (
        <a
          key={it.id}
          href={`/${it.id}`}
          style={{
            padding: '8px 10px',
            borderRadius: 10,
            textDecoration: 'none',
            color: 'white',
            background: it.id === active ? 'rgba(56,189,248,.28)' : 'rgba(255,255,255,.10)',
            border: '1px solid rgba(255,255,255,.18)',
          }}
        >
          {it.label}
        </a>
      ))}
    </div>
  );
}

function Layout({ title, mode, children }) {
  const requiresRunner = mode !== 'test1';
  const runner = useRunnerHealth(requiresRunner);
  const exec = EXECUTION[mode] || { id: 'unknown', label: 'unknown' };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg,#0b1220,#0b1220 50%,#020617)', color: 'white' }}>
      <div style={{ maxWidth: 1160, margin: '0 auto', padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
          <h1 style={{ margin: 0, fontSize: 18, letterSpacing: '.2px' }}>{title}</h1>
          <div style={{ opacity: 0.9, fontSize: 12, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <span>
              execution: <strong>{exec.label}</strong>
            </span>
            {requiresRunner ? (
              <>
                <span>
                  runner: <code>{API_ORIGIN}</code>
                </span>
                <span style={{ opacity: 0.9 }}>
                  status:{' '}
                  {runner.ok === null ? (
                    <span style={{ opacity: 0.8 }}>checking…</span>
                  ) : runner.ok ? (
                    <span style={{ color: '#34d399' }}>online</span>
                  ) : (
                    <span style={{ color: '#fb7185' }}>offline</span>
                  )}
                </span>
              </>
            ) : null}
          </div>
        </div>

        {requiresRunner && runner.ok === false ? (
          <div
            style={{
              marginTop: 10,
              padding: '10px 12px',
              borderRadius: 12,
              border: '1px solid rgba(251,113,133,.35)',
              background: 'rgba(251,113,133,.12)',
              fontSize: 12,
              lineHeight: 1.35,
            }}
          >
            <strong>Developer-only page (not available on public deploy):</strong> this route is intentionally blocked unless the local
            runner is running <em>on this machine</em> at <code>{API_ORIGIN}</code>.
            <br />Start it with: <code>node scripts/testmatrix-server.mjs</code>
            <br />If you just want a hosted/browser-only demo, use <a href="/test1" style={{ color: 'white' }}>/test1</a>.
            {runner.error ? (
              <>
                <br />Last error: <code>{runner.error}</code>
              </>
            ) : null}
          </div>
        ) : null}

        {typeof children === 'function'
          ? children({ requiresRunner, runnerOk: runner.ok, runnerError: runner.error })
          : children}
      </div>
    </div>
  );
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function nowId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function PromptPanel({
  mode,
  prompt,
  setPrompt,
  seed,
  setSeed,
  deterministic,
  setDeterministic,
  status,
  onRender,
  onRegenerate,
  history,
  onRestore,
  allowPersist,
  blocked,
  blockedReason,
}) {
  return (
    <div style={{ display: 'grid', gap: 10, marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={onRender}
            disabled={Boolean(blocked)}
            style={{ ...btnStyle, opacity: blocked ? 0.55 : 1, cursor: blocked ? 'not-allowed' : 'pointer' }}
            title={blocked ? blockedReason || 'blocked' : ''}
          >
            Render
          </button>
          <button
            onClick={onRegenerate}
            disabled={Boolean(blocked)}
            style={{ ...btnStyleSecondary, opacity: blocked ? 0.55 : 1, cursor: blocked ? 'not-allowed' : 'pointer' }}
            title={blocked ? blockedReason || 'blocked' : ''}
          >
            Retry / Regenerate
          </button>
          <div style={{ fontSize: 12, opacity: 0.85 }}>{status}</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, opacity: 0.9 }}>
            <input type="checkbox" checked={deterministic} onChange={(e) => setDeterministic(e.target.checked)} />
            deterministic
          </label>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, opacity: 0.9 }}>
            seed
            <input
              type="number"
              value={seed}
              onChange={(e) => setSeed(Number(e.target.value || 0))}
              style={{ ...inputStyle, width: 120 }}
            />
          </label>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        <label style={{ fontSize: 12, opacity: 0.85 }}>Prompt</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(clampText(e.target.value, 20_000))}
          placeholder={`Describe what you want ${mode === 'test1' ? '(HTML/CSS only)' : '(a small React app)'}…`}
          style={promptStyle}
          rows={5}
        />
        <div style={{ fontSize: 12, opacity: 0.75, lineHeight: 1.35 }}>
          {mode === 'test1' ? (
            <>Fast lane: client-only HTML/CSS. Preview is sandboxed + sanitized.</>
          ) : mode === 'test2' ? (
            <>
              Developer-only lane (not available on public deploy): scratchpad + non-persistent. Requires the local runner on this machine.
              Does not touch git.
            </>
          ) : mode === 'test3' ? (
            <>Developer-only lane (not available on public deploy): generates an app, then fail-closed validation runs before build.</>
          ) : (
            <>Developer-only lane (not available on public deploy): server-side Vite build runner. Preview/artifacts first; logs are secondary.</>
          )}
          {!allowPersist ? (
            <>
              <br />History is in-memory only for this route.
            </>
          ) : null}
        </div>
      </div>

      {blocked ? (
        <div
          style={{
            padding: '10px 12px',
            borderRadius: 12,
            border: '1px solid rgba(251,113,133,.35)',
            background: 'rgba(251,113,133,.12)',
            fontSize: 12,
            lineHeight: 1.35,
          }}
        >
          <strong>Blocked:</strong> {blockedReason || 'runner is offline'}
        </div>
      ) : null}

      <details style={detailsStyle}>
        <summary style={{ cursor: 'pointer' }}>Run history</summary>
        {history?.length ? (
          <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
            {history.slice(0, 12).map((h) => (
              <button
                key={h.id}
                onClick={() => onRestore(h)}
                style={{
                  ...btnStyleGhost,
                  textAlign: 'left',
                  display: 'grid',
                  gap: 4,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <span style={{ fontSize: 12, opacity: 0.9 }}>{new Date(h.createdAt).toLocaleTimeString()}</span>
                  <span style={{ fontSize: 12, opacity: 0.75 }}>
                    seed {h.seed}
                    {h.deterministic ? '' : ' (randomized)'}
                  </span>
                </div>
                <div style={{ fontSize: 13 }}>{(h.prompt || '').slice(0, 120) || '(empty prompt)'}</div>
              </button>
            ))}
          </div>
        ) : (
          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>No runs yet.</div>
        )}
      </details>
    </div>
  );
}

function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeJsxText(s) {
  // Prevent accidentally closing tags/expressions in our template literal.
  return String(s).replaceAll('{', '').replaceAll('}', '').replaceAll('`', '');
}

function generateFromPrompt({ mode, prompt, seed, deterministic }) {
  const s = deterministic ? (seed >>> 0) : ((seed ^ (Date.now() & 0xffffffff)) >>> 0);
  const rnd = mulberry32(s || 1);
  const stylePick = Math.floor(rnd() * 4);
  const safeText = String(prompt || '').trim() || (mode === 'test1' ? 'Hello from test1.' : 'Hello from demo2 testmatrix.');

  if (mode === 'test1') {
    const palette = [
      { bg: '#0ea5e9', fg: 'white' },
      { bg: '#a78bfa', fg: '#0b1220' },
      { bg: '#34d399', fg: '#052e2b' },
      { bg: '#fb7185', fg: '#0b1220' },
    ][stylePick];
    const html = `\n<div class="wrap">\n  <div class="card">\n    <div class="badge">test1</div>\n    <h2>${escapeHtml(safeText.slice(0, 140))}</h2>\n    <p>Client-side HTML/CSS only. No scripts, no fetch.</p>\n  </div>\n</div>\n`;
    const css = `\n:root{color-scheme:light}\nbody{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial}\n.wrap{min-height:100vh;display:grid;place-items:center;background:#f8fafc}\n.card{max-width:720px;margin:24px;padding:22px 20px;border-radius:18px;background:${palette.bg};color:${palette.fg};box-shadow:0 12px 40px rgba(2,6,23,.18)}\n.badge{display:inline-block;font-size:12px;opacity:.9;padding:4px 10px;border-radius:999px;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.28)}\nh2{margin:14px 0 8px;line-height:1.1;letter-spacing:-.02em}\np{margin:0;opacity:.9;line-height:1.45}\n`;
    return { html, css };
  }

  const theme = [
    { bg: '#0b1220', fg: 'white', accent: '#38bdf8' },
    { bg: '#0b1220', fg: 'white', accent: '#a78bfa' },
    { bg: '#0b1220', fg: 'white', accent: '#34d399' },
    { bg: '#0b1220', fg: 'white', accent: '#fb7185' },
  ][stylePick];

  const jsx = `import React from 'react';\n\nexport default function App(){\n  return (\n    <div style={{minHeight:'100vh',background:'${theme.bg}',color:'${theme.fg}',fontFamily:'system-ui',padding:18}}>
      <div style={{maxWidth:920,margin:'0 auto',display:'grid',gap:14}}>
        <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',gap:10,flexWrap:'wrap'}}>
          <h2 style={{margin:0,letterSpacing:'-.02em'}}>demo2 ${mode}</h2>
          <div style={{fontSize:12,opacity:.8}}>prompt-first generator (no network)</div>
        </div>
        <div style={{border:'1px solid rgba(255,255,255,.14)',borderRadius:16,padding:16,background:'rgba(255,255,255,.06)'}}>
          <div style={{display:'inline-block',fontSize:12,padding:'4px 10px',borderRadius:999,background:'rgba(56,189,248,.18)',border:'1px solid rgba(255,255,255,.12)'}}>seed ${s}</div>
          <h3 style={{margin:'12px 0 8px',color:'${theme.accent}'}}>${escapeJsxText(safeText.slice(0, 160))}</h3>
          <p style={{margin:0,opacity:.9,lineHeight:1.45}}>This app was generated from your prompt. It avoids fetch/import/eval. Use Advanced to view/edit source.</p>
        </div>
      </div>
    </div>\n  );\n}\n`;

  const css = `:root{color-scheme:dark}body{margin:0}`;
  return { jsx, css };
}

function IframePreview({ html, css }) {
  const srcDoc = useMemo(() => {
    const safeHtml = sanitizeHtml(html);
    const safeCss = sanitizeCss(css);
    return `<!doctype html><html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" />\n<style>${safeCss}</style></head><body>${safeHtml}</body></html>`;
  }, [html, css]);

  return (
    <iframe
      // No scripts, no popups, no top-nav.
      sandbox=""
      referrerPolicy="no-referrer"
      style={{ width: '100%', height: 560, border: '1px solid rgba(255,255,255,.18)', borderRadius: 14, background: 'white' }}
      srcDoc={srcDoc}
      title="preview"
    />
  );
}

function Test1() {
  const storageKey = 'demo2_testmatrix_test1_history_v1';
  const [prompt, setPrompt] = useState('A friendly welcome card that mentions “test1”.');
  const [seed, setSeed] = useState(1);
  const [deterministic, setDeterministic] = useState(true);
  const [status, setStatus] = useState('');
  const [html, setHtml] = useState('');
  const [css, setCss] = useState('');
  const [history, setHistory] = useState(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(history.slice(0, 24)));
    } catch {}
  }, [history]);

  async function onRender() {
    setStatus('rendering…');
    try {
      const out = generateFromPrompt({ mode: 'test1', prompt, seed, deterministic });
      setHtml(out.html);
      setCss(out.css);
      setHistory((h) => [{ id: nowId(), createdAt: Date.now(), prompt, seed, deterministic, ...out }, ...h].slice(0, 24));
      setStatus('ok');
    } catch (err) {
      setStatus(`error: ${err?.message || err}`);
    }
  }

  function onRegenerate() {
    const next = Number.isFinite(seed) ? seed + 1 : 1;
    setSeed(next);
    setDeterministic(true);
    // Render immediately with the next seed (avoid setState timing issues).
    setStatus('rendering…');
    try {
      const out = generateFromPrompt({ mode: 'test1', prompt, seed: next, deterministic: true });
      setHtml(out.html);
      setCss(out.css);
      setHistory((h) => [{ id: nowId(), createdAt: Date.now(), prompt, seed: next, deterministic: true, ...out }, ...h].slice(0, 24));
      setStatus('ok');
    } catch (err) {
      setStatus(`error: ${err?.message || err}`);
    }
  }

  function onRestore(h) {
    setPrompt(h.prompt || '');
    setSeed(Number(h.seed || 0));
    setDeterministic(Boolean(h.deterministic));
    setHtml(h.html || '');
    setCss(h.css || '');
    setStatus('restored');
  }

  useEffect(() => {
    if (!html && !css) onRender();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Layout mode="test1" title="demo2 /test1 — client-side HTML/CSS sandbox (sanitized)">
      <Nav active="test1" />
      <PromptPanel
        mode="test1"
        prompt={prompt}
        setPrompt={setPrompt}
        seed={seed}
        setSeed={setSeed}
        deterministic={deterministic}
        setDeterministic={setDeterministic}
        status={status}
        onRender={onRender}
        onRegenerate={onRegenerate}
        history={history}
        onRestore={onRestore}
        allowPersist={true}
        blocked={false}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: 10 }}>
          <details style={detailsStyle}>
            <summary style={{ cursor: 'pointer' }}>Advanced: view/edit source</summary>
            <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button onClick={() => navigator.clipboard?.writeText(html || '')} style={btnStyleTiny}>
                  Copy HTML
                </button>
                <button onClick={() => navigator.clipboard?.writeText(css || '')} style={btnStyleTiny}>
                  Copy CSS
                </button>
              </div>
              <label style={{ fontSize: 12, opacity: 0.85 }}>HTML</label>
              <textarea value={html} onChange={(e) => setHtml(clampText(e.target.value))} style={taStyle} rows={10} />
              <label style={{ fontSize: 12, opacity: 0.85 }}>CSS</label>
              <textarea value={css} onChange={(e) => setCss(clampText(e.target.value))} style={taStyle} rows={10} />
              <div style={{ fontSize: 12, opacity: 0.75, lineHeight: 1.35 }}>
                Guardrails: strips <code>&lt;script&gt;</code>, inline <code>on*</code> handlers, <code>javascript:</code> URLs, and{' '}
                <code>@import</code>.
              </div>
            </div>
          </details>
        </div>
        <div>
          <IframePreview html={html} css={css} />
        </div>
      </div>
    </Layout>
  );
}

async function callBuild(endpoint, payload) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 70_000);
  try {
    const res = await fetch(`${API_ORIGIN}${endpoint}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
    return json;
  } catch (err) {
    const msg = String(err?.message || err);
    if (/failed to fetch/i.test(msg) || /networkerror/i.test(msg) || /load failed/i.test(msg) || /abort/i.test(msg)) {
      throw new Error('local runner not responding — start: node scripts/testmatrix-server.mjs');
    }
    throw err;
  } finally {
    clearTimeout(t);
  }
}

function BuildUi({ mode, runnerOk }) {
  const allowPersist = mode !== 'test2';
  const storageKey = `demo2_testmatrix_${mode}_history_v1`;
  const [prompt, setPrompt] = useState(`A small ${mode} demo app that makes it obvious the prompt worked.`);
  const [seed, setSeed] = useState(1);
  const [deterministic, setDeterministic] = useState(true);
  const [status, setStatus] = useState('');
  const [jobUrl, setJobUrl] = useState('');
  const [jsx, setJsx] = useState('');
  const [css, setCss] = useState('');
  const [history, setHistory] = useState(() => {
    if (!allowPersist) return [];
    try {
      const raw = localStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const blocked = runnerOk !== true;
  const blockedReason =
    runnerOk === null
      ? 'checking local runner…'
      : `developer-only route (not available on public deploy): start the local runner on this machine with node scripts/testmatrix-server.mjs (expects ${API_ORIGIN})`;

  useEffect(() => {
    if (!allowPersist) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(history.slice(0, 24)));
    } catch {}
  }, [history, allowPersist, storageKey]);

  async function onRender(opts = null) {
    if (blocked) return;
    const seedUsed = opts?.seed ?? seed;
    const deterministicUsed = opts?.deterministic ?? deterministic;
    setStatus('generating…');
    setJobUrl('');
    try {
      const out = generateFromPrompt({ mode, prompt, seed: seedUsed, deterministic: deterministicUsed });
      setJsx(out.jsx);
      setCss(out.css);

      setStatus('building…');
      const json = await callBuild(`/api/${mode}/build`, { jsx: out.jsx, css: out.css });
      setJobUrl(json.url);
      setStatus(`ok: ${json.jobId}`);

      const rec = {
        id: nowId(),
        createdAt: Date.now(),
        prompt,
        seed: seedUsed,
        deterministic: deterministicUsed,
        jsx: out.jsx,
        css: out.css,
        jobUrl: json.url,
        jobId: json.jobId,
      };
      setHistory((h) => [rec, ...h].slice(0, 24));
    } catch (err) {
      setStatus(`error: ${err?.message || err}`);
    }
  }

  async function onBuildCurrentSource() {
    if (blocked) return;
    setStatus('building…');
    setJobUrl('');
    try {
      const json = await callBuild(`/api/${mode}/build`, { jsx, css });
      setJobUrl(json.url);
      setStatus(`ok: ${json.jobId}`);
    } catch (err) {
      setStatus(`error: ${err?.message || err}`);
    }
  }

  function onRegenerate() {
    if (blocked) return;
    const next = Number.isFinite(seed) ? seed + 1 : 1;
    setSeed(next);
    setDeterministic(true);
    queueMicrotask(() => onRender({ seed: next, deterministic: true }));
  }

  function onRestore(h) {
    setPrompt(h.prompt || '');
    setSeed(Number(h.seed || 0));
    setDeterministic(Boolean(h.deterministic));
    setJsx(h.jsx || '');
    setCss(h.css || '');
    setJobUrl(h.jobUrl || '');
    setStatus('restored');
  }

  useEffect(() => {
    if (!jsx && !css) {
      const out = generateFromPrompt({ mode, prompt, seed, deterministic });
      setJsx(out.jsx);
      setCss(out.css);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <PromptPanel
        mode={mode}
        prompt={prompt}
        setPrompt={setPrompt}
        seed={seed}
        setSeed={setSeed}
        deterministic={deterministic}
        setDeterministic={setDeterministic}
        status={status}
        onRender={onRender}
        onRegenerate={onRegenerate}
        history={history}
        onRestore={onRestore}
        allowPersist={allowPersist}
        blocked={blocked}
        blockedReason={blockedReason}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: 10 }}>
          <details style={detailsStyle}>
            <summary style={{ cursor: 'pointer' }}>Advanced: view/edit source (then Render)</summary>
            <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button onClick={() => navigator.clipboard?.writeText(jsx || '')} style={btnStyleTiny}>
                  Copy JSX
                </button>
                <button onClick={() => navigator.clipboard?.writeText(css || '')} style={btnStyleTiny}>
                  Copy CSS
                </button>
                <button
                  onClick={onBuildCurrentSource}
                  disabled={blocked}
                  style={{ ...btnStyleTiny, opacity: blocked ? 0.55 : 1, cursor: blocked ? 'not-allowed' : 'pointer' }}
                  title={blocked ? blockedReason : ''}
                >
                  Build current source
                </button>
              </div>
              <label style={{ fontSize: 12, opacity: 0.85 }}>JSX (exports default component)</label>
              <textarea value={jsx} onChange={(e) => setJsx(clampText(e.target.value))} style={taStyle} rows={16} />
              <label style={{ fontSize: 12, opacity: 0.85 }}>CSS</label>
              <textarea value={css} onChange={(e) => setCss(clampText(e.target.value))} style={taStyle} rows={10} />
              <div style={{ fontSize: 12, opacity: 0.75, lineHeight: 1.35 }}>
                Requires local server <code>node scripts/testmatrix-server.mjs</code>. Writes under <code>.demo2/testmatrix</code> only.
                {mode === 'test3' ? (
                  <>
                    <br />Validation is fail-closed; errors show in the status line.
                  </>
                ) : null}
              </div>
            </div>
          </details>
        </div>
        <div>
          {jobUrl ? (
            <iframe
              sandbox="allow-scripts"
              referrerPolicy="no-referrer"
              style={{ width: '100%', height: 560, border: '1px solid rgba(255,255,255,.18)', borderRadius: 14, background: 'white' }}
              src={jobUrl}
              title="build-preview"
            />
          ) : (
            <div
              style={{
                height: 560,
                border: '1px dashed rgba(255,255,255,.28)',
                borderRadius: 14,
                display: 'grid',
                placeItems: 'center',
                opacity: 0.7,
              }}
            >
              Preview will appear here.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Test4() {
  return (
    <Layout mode="test4" title="demo2 /test4 — developer-only (local runner) server-side Vite build runner">
      {({ runnerOk }) => (
        <>
          <Nav active="test4" />
          <BuildUi mode="test4" runnerOk={runnerOk} />
        </>
      )}
    </Layout>
  );
}

function Test3() {
  return (
    <Layout mode="test3" title="demo2 /test3 — developer-only (local runner) build + validation gate">
      {({ runnerOk }) => (
        <>
          <Nav active="test3" />
          <BuildUi mode="test3" runnerOk={runnerOk} />
        </>
      )}
    </Layout>
  );
}

function Test2() {
  return (
    <Layout mode="test2" title="demo2 /test2 — developer-only scratchpad (local runner / commitless)">
      {({ runnerOk }) => (
        <>
          <Nav active="test2" />
          <div style={{ opacity: 0.9, lineHeight: 1.45, maxWidth: 920, marginBottom: 12 }}>
            <strong>Warning:</strong> highest contamination-risk path. This is intentionally local-only and does not touch git.
          </div>
          <BuildUi mode="test2" runnerOk={runnerOk} />
        </>
      )}
    </Layout>
  );
}

export default function TestMatrixApp() {
  const testId = usePathTestId();
  if (testId === 'test1') return <Test1 />;
  if (testId === 'test2') return <Test2 />;
  if (testId === 'test3') return <Test3 />;
  if (testId === 'test4') return <Test4 />;
  return <Test1 />;
}

const taStyle = {
  width: '100%',
  borderRadius: 12,
  padding: 12,
  resize: 'vertical',
  border: '1px solid rgba(255,255,255,.18)',
  background: 'rgba(2,6,23,.62)',
  color: 'white',
  outline: 'none',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  fontSize: 12,
  lineHeight: 1.35,
};

const btnStyle = {
  borderRadius: 12,
  padding: '10px 14px',
  border: '1px solid rgba(255,255,255,.18)',
  background: 'rgba(56,189,248,.22)',
  color: 'white',
  cursor: 'pointer',
};

const btnStyleSecondary = {
  ...btnStyle,
  background: 'rgba(255,255,255,.10)',
};

const btnStyleGhost = {
  borderRadius: 12,
  padding: '10px 12px',
  border: '1px solid rgba(255,255,255,.14)',
  background: 'rgba(2,6,23,.35)',
  color: 'white',
  cursor: 'pointer',
};

const btnStyleTiny = {
  borderRadius: 10,
  padding: '8px 10px',
  border: '1px solid rgba(255,255,255,.18)',
  background: 'rgba(255,255,255,.10)',
  color: 'white',
  cursor: 'pointer',
  fontSize: 12,
};

const inputStyle = {
  borderRadius: 10,
  padding: '8px 10px',
  border: '1px solid rgba(255,255,255,.18)',
  background: 'rgba(2,6,23,.62)',
  color: 'white',
  outline: 'none',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  fontSize: 12,
};

const promptStyle = {
  width: '100%',
  borderRadius: 12,
  padding: 12,
  resize: 'vertical',
  border: '1px solid rgba(255,255,255,.18)',
  background: 'rgba(2,6,23,.62)',
  color: 'white',
  outline: 'none',
  fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
  fontSize: 13,
  lineHeight: 1.4,
};

const detailsStyle = {
  borderRadius: 12,
  padding: '10px 12px',
  border: '1px solid rgba(255,255,255,.18)',
  background: 'rgba(255,255,255,.06)',
};
