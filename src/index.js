import manifest from '../dist/.vite/manifest.json' assert { type: 'json' };

const ROOT_DOMAIN = 'mydude.live';
const ENTRY = Object.values(manifest).find((item) => item.isEntry);
const JS_FILE = ENTRY?.file || 'assets/index.js';
const CSS_FILES = ENTRY?.css || [];

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api/test2/generate' && request.method === 'POST') {
      return handleTest2Generate(request, env);
    }

    // Public demo posture:
    // - /test1 and /test2 are public prompt-first routes.
    // - /test3-/test4 are developer-oriented harness routes.
    //   They remain reachable on hosted deploys, but the UI should clearly indicate
    //   when a local runner is required/unavailable.
    const assetResponse = await env.ASSETS?.fetch(request);
    if (assetResponse && assetResponse.status !== 404) return assetResponse;
    return new Response(renderShell(url.hostname.toLowerCase()), {
      headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=60' }
    });
  }
};

async function handleTest2Generate(request, env) {
  let body = {};
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Expected JSON body.' }, 400);
  }

  const prompt = clampText(body.prompt || '', 1200).trim();
  const seed = Number.isFinite(Number(body.seed)) ? Number(body.seed) : 1;
  if (!prompt) return jsonResponse({ error: 'Prompt is required.' }, 400);

  try {
    const generated = await generateWithWorkerAi({ env, prompt, seed });
    return jsonResponse(generated, 200);
  } catch (err) {
    return jsonResponse({
      error: err?.message || 'LLM generation failed.',
      hint: 'test2 requires a hosted LLM backend. Configure a Cloudflare Workers AI binding named AI or an OPENAI_API_KEY secret.',
    }, 502);
  }
}

async function generateWithWorkerAi({ env, prompt, seed }) {
  if (env.AI?.run) {
    const aiPrompt = buildGenerationPrompt(prompt, seed);
    const result = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        { role: 'system', content: 'You generate safe, self-contained React/SVG/CSS drawings. Return only valid JSON.' },
        { role: 'user', content: aiPrompt },
      ],
      max_tokens: 2400,
      temperature: 0.35,
    });
    const text = result?.response || result?.text || result?.content || '';
    const parsed = parseJsonObject(text);
    return normalizeGenerated(parsed, prompt, seed, 'cloudflare-workers-ai');
  }

  if (env.OPENAI_API_KEY) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0.35,
        max_tokens: 2400,
        messages: [
          { role: 'system', content: 'You generate safe, self-contained React/SVG/CSS drawings. Return only valid JSON.' },
          { role: 'user', content: buildGenerationPrompt(prompt, seed) },
        ],
      }),
    });
    if (!res.ok) throw new Error(`OpenAI generation failed: HTTP ${res.status}`);
    const json = await res.json();
    const text = json?.choices?.[0]?.message?.content || '';
    const parsed = parseJsonObject(text);
    return normalizeGenerated(parsed, prompt, seed, 'openai');
  }

  throw new Error('No hosted LLM backend is configured for test2.');
}

function buildGenerationPrompt(prompt, seed) {
  return `Create a recognizable browser-rendered drawing for this prompt: ${JSON.stringify(prompt)}.\nSeed: ${seed}.\n\nReturn ONLY strict JSON with double-quoted keys and JSON-escaped string values. Do not use markdown fences. Do not use JavaScript template literals/backticks. Keys:\n{\n  "jsx": "React component source string; no imports except optional React; no fetch/eval/network",\n  "css": "CSS string",\n  "html": "safe HTML string containing one inline <svg> drawing that visually satisfies the prompt",\n  "imageCss": "CSS string for the html/svg preview",\n  "summary": "one short sentence"\n}\n\nRules:\n- The html must include an inline <svg>...</svg> drawing, not just text. Never write <vg>; the tag must be exactly <svg>.\n- For simple prompts like car, dog, house, make the subject obvious at a glance.\n- Use a 720x420 SVG viewBox and at least 8 visible shapes for the main subject.\n- If the prompt is car/vehicle: include a clear side-profile car body, roof, windshield/glass panels, two large circular wheels, headlights, and a road.\n- No scripts, no event handlers, no external URLs, no images, no data URLs, no network calls.\n- Use only HTML/CSS/SVG that works in a sandboxed iframe.\n- Keep each string under 20k characters.`;
}

function normalizeGenerated(value, prompt, seed, provider) {
  const jsx = clampText(value?.jsx || '', 30000);
  const css = clampText(value?.css || '', 20000);
  const derivedHtml = extractSvgFromJsx(jsx);
  const html = repairSvgTypos(clampText(value?.html || derivedHtml || '', 20000));
  const imageCss = clampText(value?.imageCss || value?.css || '', 20000);
  if (!/<svg[\s>]/i.test(html)) throw new Error('LLM did not return an SVG drawing.');
  return {
    prompt,
    seed,
    provider,
    summary: clampText(value?.summary || 'Generated React/SVG drawing.', 500),
    jsx: jsx || `export default function App(){ return <div dangerouslySetInnerHTML={{__html:${JSON.stringify(html)}}} />; }`,
    css,
    html,
    imageCss,
  };
}

function repairSvgTypos(html) {
  return String(html || '')
    .replace(/<vg(\s|>)/gi, '<svg viewBox="0 0 150 100" xmlns="http://www.w3.org/2000/svg"$1')
    .replace(/<\/vg>/gi, '</svg>');
}

function extractSvgFromJsx(jsx) {
  const text = String(jsx || '');
  const match = text.match(/<svg[\s\S]*?<\/svg>/i);
  if (!match) return '';
  return match[0]
    .replace(/className=/g, 'class=')
    .replace(/strokeWidth=/g, 'stroke-width=')
    .replace(/strokeLinecap=/g, 'stroke-linecap=')
    .replace(/strokeLinejoin=/g, 'stroke-linejoin=')
    .replace(/fillRule=/g, 'fill-rule=')
    .replace(/clipRule=/g, 'clip-rule=')
    .replace(/<\/?React.Fragment[^>]*>/g, '');
}

function parseJsonObject(text) {
  const raw = String(text || '').trim();
  try { return JSON.parse(raw); } catch {}
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  if (fenced) {
    try { return JSON.parse(fenced); } catch {}
  }
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start >= 0 && end > start) {
    const objectText = raw.slice(start, end + 1);
    try { return JSON.parse(objectText); } catch {}
    const loose = parseLooseLlmObject(objectText);
    if (loose) return loose;
  }
  const loose = parseLooseLlmObject(raw);
  if (loose) return loose;
  throw new Error('LLM did not return valid JSON.');
}

function parseLooseLlmObject(raw) {
  const out = {};
  for (const key of ['jsx', 'css', 'html', 'imageCss', 'summary']) {
    const template = raw.match(new RegExp(`["']?${key}["']?\\s*:\\s*` + '`' + `([\\s\\S]*?)` + '`', 'i'));
    if (template) { out[key] = template[1]; continue; }
    const quoted = raw.match(new RegExp(`["']?${key}["']?\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`, 'i'));
    if (quoted) {
      try { out[key] = JSON.parse(`"${quoted[1]}"`); } catch { out[key] = quoted[1]; }
    }
  }
  return out.html || out.jsx || out.css ? out : null;
}

function jsonResponse(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

function clampText(value, max) { const text = String(value ?? ''); return text.length > max ? text.slice(0, max) : text; }

function renderShell(hostname) {
  const subdomain = getSubdomain(hostname);
  const title = subdomain === 'demo2' ? 'My Dude Demo2' : subdomain ? `${displayName(subdomain)} | mydude.live` : 'mydude.live AI Ecosystem';
  const cssTags = CSS_FILES.map(file => `<link rel="stylesheet" href="/${file}">`).join('\n    ');
  return `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${escapeHtml(title)}</title>${cssTags}</head><body><div id="root"></div><script type="module" src="/${JS_FILE}"></script></body></html>`;
}

function getSubdomain(hostname) {
  if (hostname === ROOT_DOMAIN || hostname === `www.${ROOT_DOMAIN}` || hostname === 'localhost' || hostname === '127.0.0.1') return '';
  if (hostname.endsWith(`.${ROOT_DOMAIN}`)) return hostname.slice(0, -1 * (`.${ROOT_DOMAIN}`).length).replace(/[^a-z0-9-]/gi, '').slice(0, 48);
  return hostname.split('.')[0]?.replace(/[^a-z0-9-]/gi, '').slice(0, 48) || '';
}
function displayName(value) { return (value || 'unknown').split('-').filter(Boolean).map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' '); }
function escapeHtml(value) { return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
