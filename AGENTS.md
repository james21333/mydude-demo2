# Repo Rules (demo2.mydude.live)

This repo powers **https://demo2.mydude.live**.

## Must-read before changes

Before touching anything related to:

- listener (SpeechRecognition)
- speaker (speechSynthesis / bridge streaming)
- mouth animation / `mouthPhase`
- websocket payloads (`/speak` bridge)
- transform detection/routing ("turn into / become / transform / change into")
- scene / drawing layers / `Shape3D` rendering
- shared JSON contracts (grammar/presets)
- background / on-screen object behavior

You must read:

1) `docs/DEMO2_ARCHITECTURE.md`
2) `docs/DEMO2_TRANSFORM_PIPELINE.md`

## Non-negotiable invariants

- Browser + bridge transform detection regexes must stay aligned (or the divergence must be explicitly documented).
- Scene avatar must have **one** mouth layer with `role:"mouth"`, ideally `attach.socket:"head.mouth"`.
- Listener/speaker transitions must never allow listening while speaking (self-feedback) and must never get stuck in speaking/building.
- WebSocket message `type` values are a contract: keep backward compatibility.

## Working rules

- Keep changes specific to `demo2.mydude.live`.
- Prefer the smallest correct change.
- If you change the transform pipeline, update the docs in `docs/` in the same PR.
- Run `npm test` before shipping changes.
- Do not push unless explicitly asked.
