import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import dns from 'node:dns';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { build as viteBuild } from 'vite';
import react from '@vitejs/plugin-react';

import { clampText, sanitizeCss, validateJsxForBuild } from '../src/testmatrix/sanitize.mjs';

const PORT = Number(process.env.TESTMATRIX_PORT || 8799);
const ROOT_TMP = process.env.TESTMATRIX_TMP || path.join(process.cwd(), '.demo2', 'testmatrix');
const MAX_BODY_BYTES = 800_000;
const JOB_TTL_MS = 20 * 60 * 1000;

const jobs = new Map();

const JOB_CSP = [
  "default-src 'none'",
  "base-uri 'none'",
  "object-src 'none'",
  "form-action 'none'",
  // Allow local bundled assets only.
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  // No runtime networking by default.
  "connect-src 'none'",
  "media-src 'none'",
  // Keep preview embeddable in our UI; UI iframe sandbox does the isolation.
  // (So do NOT set frame-ancestors here.)
].join('; ');

function corsHeaders(req) {
  // Dev-only local runner; allow calls from Vite dev server (different port).
  const origin = req.headers.origin || '*';
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '600',
    vary: 'origin',
  };
}

function json(req, res, status, value) {
  const body = JSON.stringify(value, null, 2);
  res.writeHead(status, {
    ...corsHeaders(req),
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(body);
}

function text(req, res, status, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, { ...corsHeaders(req), 'content-type': type, 'cache-control': 'no-store' });
  res.end(body);
}

function jobSecurityHeaders() {
  return {
    'content-security-policy': JOB_CSP,
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
    'cache-control': 'no-store',
  };
}

function withNetworkBlocked(fn) {
  const originals = {
    fetch: globalThis.fetch,
    httpRequest: http.request,
    httpsRequest: https.request,
    netConnect: net.connect,
    netCreateConnection: net.createConnection,
    dnsLookup: dns.lookup,
  };

  const deny = () => {
    throw new Error('network disabled by default (testmatrix)');
  };

  // Best-effort: block common outbound primitives during the build.
  globalThis.fetch = deny;
  http.request = deny;
  https.request = deny;
  net.connect = deny;
  net.createConnection = deny;
  dns.lookup = deny;

  try {
    return fn();
  } finally {
    globalThis.fetch = originals.fetch;
    http.request = originals.httpRequest;
    https.request = originals.httpsRequest;
    net.connect = originals.netConnect;
    net.createConnection = originals.netCreateConnection;
    dns.lookup = originals.dnsLookup;
  }
}

function safeJoin(base, rel) {
  const full = path.resolve(base, rel);
  if (!full.startsWith(path.resolve(base) + path.sep)) throw new Error('path traversal blocked');
  return full;
}

async function readJsonBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new Error('body too large');
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  return JSON.parse(raw);
}

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

async function rimraf(p) {
  try {
    await fs.rm(p, { recursive: true, force: true });
  } catch {}
}

async function buildJob({ mode, jsx, css }) {
  const jobId = randomUUID();
  const jobRoot = safeJoin(ROOT_TMP, jobId);
  const root = safeJoin(jobRoot, 'project');
  await ensureDir(path.join(root, 'src'));

  const userJsx = clampText(jsx, 200_000);
  const userCss = sanitizeCss(css);

  // Fail-closed validation for all build lanes.
  // /test3 is explicitly "gated", but /test2 and /test4 still need to be safe.
  const v = validateJsxForBuild(userJsx);
  if (!v.ok) throw new Error(`validation failed: ${v.problems.join(', ')}`);

  const indexHtml = `<!doctype html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"UTF-8\" />\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />\n  <title>${mode} preview</title>\n</head>\n<body>\n  <div id=\"root\"></div>\n  <script type=\"module\" src=\"/src/main.jsx\"></script>\n</body>\n</html>\n`;

  const mainJsx = `import React from 'react';\nimport { createRoot } from 'react-dom/client';\nimport UserApp from './UserApp.jsx';\nimport './style.css';\n\ncreateRoot(document.getElementById('root')).render(<UserApp />);\n`;

  await fs.writeFile(path.join(root, 'index.html'), indexHtml);
  await fs.writeFile(path.join(root, 'src', 'main.jsx'), mainJsx);
  await fs.writeFile(path.join(root, 'src', 'UserApp.jsx'), userJsx);
  await fs.writeFile(path.join(root, 'src', 'style.css'), userCss);

  const startedAt = Date.now();
  await withTimeout(
    withNetworkBlocked(() =>
      viteBuild({
        root,
        base: './',
        configFile: false,
        plugins: [react()],
        logLevel: 'error',
        build: {
          outDir: 'dist',
          emptyOutDir: true,
          sourcemap: false,
          manifest: false,
        },
      })
    ),
    60_000,
    'vite build timeout'
  );

  const job = {
    id: jobId,
    mode,
    createdAt: Date.now(),
    startedAt,
    root: jobRoot,
    dist: path.join(root, 'dist'),
  };
  jobs.set(jobId, job);
  return job;
}

function withTimeout(promise, ms, message) {
  let t;
  const timeout = new Promise((_, reject) => {
    t = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(t));
}

function contentTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.html') return 'text/html; charset=utf-8';
  if (ext === '.js') return 'text/javascript; charset=utf-8';
  if (ext === '.css') return 'text/css; charset=utf-8';
  if (ext === '.json') return 'application/json; charset=utf-8';
  if (ext === '.svg') return 'image/svg+xml';
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';
  return 'application/octet-stream';
}

async function serveJobAsset(req, res, jobId, relPath) {
  const job = jobs.get(jobId);
  if (!job) return text(req, res, 404, 'job not found');

  const dist = job.dist;
  let fileRel = relPath || 'index.html';
  if (fileRel.endsWith('/')) fileRel += 'index.html';
  const filePath = safeJoin(dist, fileRel);

  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) return text(req, res, 404, 'not a file');
    const buf = await fs.readFile(filePath);
    res.writeHead(200, { ...corsHeaders(req), ...jobSecurityHeaders(), 'content-type': contentTypeFor(filePath) });
    res.end(buf);
  } catch {
    return text(req, res, 404, 'not found');
  }
}

async function cleanupLoop() {
  const now = Date.now();
  for (const [id, job] of jobs.entries()) {
    if (now - job.createdAt > JOB_TTL_MS) {
      jobs.delete(id);
      await rimraf(job.root);
    }
  }
}
setInterval(cleanupLoop, 30_000).unref();

await ensureDir(ROOT_TMP);

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (req.method === 'OPTIONS') return text(req, res, 204, '');

    if (req.method === 'GET' && url.pathname === '/health') return json(req, res, 200, { ok: true });

    if (req.method === 'POST' && url.pathname === '/api/test4/build') {
      const body = await readJsonBody(req);
      const job = await buildJob({ mode: 'test4', jsx: body.jsx || '', css: body.css || '' });
      return json(req, res, 200, { ok: true, jobId: job.id, url: `http://localhost:${PORT}/jobs/${job.id}/` });
    }

    if (req.method === 'POST' && url.pathname === '/api/test3/build') {
      const body = await readJsonBody(req);
      const job = await buildJob({ mode: 'test3', jsx: body.jsx || '', css: body.css || '' });
      return json(req, res, 200, { ok: true, jobId: job.id, url: `http://localhost:${PORT}/jobs/${job.id}/` });
    }

    if (req.method === 'POST' && url.pathname === '/api/test2/build') {
      const body = await readJsonBody(req);
      const job = await buildJob({ mode: 'test2', jsx: body.jsx || '', css: body.css || '' });
      return json(req, res, 200, { ok: true, jobId: job.id, url: `http://localhost:${PORT}/jobs/${job.id}/` });
    }

    // /test2 is local-only + commitless by design.

    const m = url.pathname.match(/^\/jobs\/([a-f0-9-]{20,})\/(.*)$/i);
    if (req.method === 'GET' && m) {
      const jobId = m[1];
      const rel = m[2] || '';
      return await serveJobAsset(req, res, jobId, rel);
    }

    return text(req, res, 404, 'not found');
  } catch (err) {
    return json(req, res, 500, { ok: false, error: err?.message || String(err) });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[testmatrix] server listening on http://127.0.0.1:${PORT}`);
  console.log(`[testmatrix] tmp root: ${ROOT_TMP}`);
});
