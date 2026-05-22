const MAX_TEXT = 200_000;

export function clampText(value, max = MAX_TEXT) {
  const text = String(value ?? '');
  return text.length > max ? text.slice(0, max) : text;
}

// Fast/naive sanitizer for demo use.
// Guardrails: no <script>, no inline event handlers, no javascript: URLs.
export function sanitizeHtml(inputHtml = '') {
  let html = clampText(inputHtml, MAX_TEXT);
  html = html.replace(/<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, '');
  html = html.replace(/<\s*script[^>]*\/\s*>/gi, '');
  html = html.replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  html = html.replace(/(href|src)\s*=\s*("|')\s*javascript:[\s\S]*?\2/gi, '$1="#"');
  return html;
}

export function sanitizeCss(inputCss = '') {
  let css = clampText(inputCss, MAX_TEXT);
  // Disallow @import urls (simple guard).
  css = css.replace(/@import\s+url\([^)]*\)\s*;?/gi, '');
  css = css.replace(/@import\s+[^;]+;?/gi, '');
  return css;
}

export function validateJsxForBuild(inputJsx = '') {
  const jsx = clampText(inputJsx, MAX_TEXT);
  const problems = [];
  // Fail-closed guardrails for the build lanes.
  // These are intentionally naive regex checks: the goal is to stop obvious
  // networking/dangerous primitives, not to fully parse JS.
  const banned = [
    // Node / build-time escape hatches
    { re: /\bchild_process\b/, msg: 'banned: child_process' },
    { re: /\bnode:child_process\b/, msg: 'banned: node:child_process' },
    { re: /\bfs\b/, msg: 'banned: fs' },
    { re: /\bnode:fs\b/, msg: 'banned: node:fs' },
    { re: /\bprocess\b\s*\./, msg: 'banned: process.*' },
    { re: /\bglobalThis\s*\./, msg: 'banned: globalThis.* (too much surface)' },

    // JS execution primitives
    { re: /\beval\s*\(/, msg: 'banned: eval(' },
    { re: /new\s+Function\b/, msg: 'banned: new Function' },
    { re: /\bFunction\s*\(/, msg: 'banned: Function(' },
    { re: /\bAsyncFunction\b/, msg: 'banned: AsyncFunction' },
    { re: /\bWebAssembly\b/, msg: 'banned: WebAssembly' },

    // Module/network escape hatches
    { re: /\bimport\s+\(/, msg: 'banned: dynamic import(' },
    { re: /\bimportScripts\s*\(/, msg: 'banned: importScripts(' },
    { re: /\brequire\s*\(/, msg: 'banned: require(' },

    // Networking in the browser runtime
    { re: /\bfetch\s*\(/, msg: 'banned: fetch(' },
    { re: /\bXMLHttpRequest\b/, msg: 'banned: XMLHttpRequest' },
    { re: /\bWebSocket\b/, msg: 'banned: WebSocket' },
    { re: /\bEventSource\b/, msg: 'banned: EventSource' },
    { re: /\bnavigator\s*\.\s*sendBeacon\b/, msg: 'banned: navigator.sendBeacon' },

    // Obvious remote URLs / protocols
    { re: /\bhttps?:\/\//i, msg: 'banned: http(s):// URL literal' },
    { re: /\bws(s)?:\/\//i, msg: 'banned: ws(s):// URL literal' },
    { re: /\bdata:\s*text\/html/i, msg: 'banned: data:text/html' },
  ];
  for (const { re, msg } of banned) if (re.test(jsx)) problems.push(msg);
  return { ok: problems.length === 0, problems };
}
