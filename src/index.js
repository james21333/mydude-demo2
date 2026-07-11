export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Serve static assets from ./public
    const asset = await env.ASSETS?.fetch(request);
    if (asset && asset.status !== 404) return asset;

    // SPA fallback — serve index.html for any unmatched path
    const index = await env.ASSETS?.fetch(new Request(new URL('/index.html', url), request));
    if (index && index.status !== 404) return index;

    return new Response('Not found', { status: 404 });
  },
};
