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
3) `docs/DEMO2_PHASES_MASTER_PROMPT.md`

## Phase 1 replacement rule (non-negotiable)

We are starting **Phase 1** of the saved demo2 master prompt.

- Phase 1 work is expected to **REPLACE the current** "turn into a" / "change into" style **transform pipeline**.
- Phase 1 must **NOT** replace or break the demo2 **runtime contract**:
  - listener routing + anti-feedback behavior (keep the `handleUserUtterance()` pattern: log → bump `listenTokenRef` → abort recognition → route reset/build/talk)
  - never listen while speaking/building
  - browser ↔ bridge websocket protocol compatibility (`ready → say → thinking → delta* → (optional scene) → reply`, plus `pong/reset/error`; browser must tolerate `scene` mid-stream)
  - `mouthPhase` remains the *single* speaking signal driving mouth visuals; timer cleanup must remain correct on stop/reset/barge-in
  - scene avatars must contain **exactly one** mouth layer with `role:"mouth"` (prefer `attach.socket:"head.mouth"`)
- Browser `shouldUpdateAvatar()` and bridge `wantsSceneSpec()` must remain aligned (or the divergence must be explicitly documented).
- Phase 1 output must remain valid under the existing shared contracts + sanitizers/renderer expectations unless you are explicitly migrating those contracts:
  - `shared/avatar-drawing-grammar.json`
  - `shared/avatar-quality-presets.json`


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
