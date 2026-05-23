# mydude-demo2

Separate My Dude demo fork for `demo2.mydude.live`.

This repo intentionally carries its own copy of the finished live avatar code so future demo2 work cannot mutate the frozen original finished-demo baseline.

## Architecture notes / must-read

Before changing anything related to listener/speaker/mouth/websocket/transform/scene+drawing/shared JSON:

- `AGENTS.md` (repo rules)
- `docs/DEMO2_LISTENER_SPEECH_GUARDRAILS.md` (mandatory before listener/speaker/mouth/barge-in/latency changes)
- `docs/DEMO2_ARCHITECTURE.md`
- `docs/DEMO2_TRANSFORM_PIPELINE.md`
- `docs/DEMO2_PHASE1_IMPLEMENTATION_PLAN.md` (durable rollout plan)

## Routes

- Public demo: `https://demo2.mydude.live`
- Cloudflare Worker route: `demo2.mydude.live/*`
- Worker name: `mydude-demo2`

## Public demo vs local dev routes

This repo intentionally ships both a simple public demo lane and additional local-only test harnesses.

- `/test1` is the only public, prompt-first route intended to work on `demo2.mydude.live`.
- `/test2`–`/test4` are intentionally localhost-only for development/workbench workflows and should 404 in production.

Why: keep the public demo surface area small and avoid exposing internal test harnesses.

## Workflow

- The initial publish must push/merge to `main` so GitHub registers `.github/workflows/deploy.yml` on the remote default branch.
- After that bootstrap merge, pushes to `main` deploy via GitHub Actions → Cloudflare Wrangler, and `workflow_dispatch` becomes available for future manual runs.

Do not edit the frozen demo baseline repo for demo2 changes.
