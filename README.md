# mydude-demo2

Separate My Dude development fork for `demo2.mydude.live`.

## Baseline

- Source repo: `james21333/mydude-live`
- Source tag: `v1.4`
- Source commit: `0a26561` (`Tune My Dude mouth sync and open size`)
- Release: `My Dude v1.4 - Dudette Paulina and mouth sync`
- Date: 2026-05-17

This fork intentionally starts before the later generated-avatar / creation experiments. It preserves the working original My Dude / Dudette voice-theme and mouth-sync checkpoint, then gives us a clean place to rebuild the `create` / `turn into` experience a different way.

## Dev

```bash
npm install
npm run build
npm run dev
```

## Deploy target

Cloudflare Worker route: `demo2.mydude.live/*` via `wrangler.jsonc`.
