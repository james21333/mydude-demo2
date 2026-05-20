# mydude-demo2

Separate My Dude demo fork for `demo2.mydude.live`.

This repo intentionally carries its own copy of the finished live avatar code so future demo2 work cannot mutate the frozen original finished-demo baseline.

## Routes

- Public demo: `https://demo2.mydude.live`
- Cloudflare Worker route: `demo2.mydude.live/*`
- Worker name: `mydude-demo2`

## Workflow

Pushes to `main` deploy through the repo's GitHub Actions Cloudflare workflow.
Do not edit the frozen demo baseline repo for demo2 changes.
