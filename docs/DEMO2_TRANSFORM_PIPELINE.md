# demo2.mydude.live Transform Pipeline Guardrails

This document describes the exact end-to-end path for prompts like:

- `turn into a cow`
- `change into a robot`
- `become a car`
- `transform into a dragon`
- `make you look like ...`

This is the most fragile path in demo2 because it crosses:

- listener routing
- speaking state transitions
- local avatar construction
- bridge scene generation
- drawing grammar enforcement
- mouth animation
- reset / barge-in behavior

## Phase 1 replacement guardrails (REPLACES the current "turn into / change into" pipeline)

Phase 1 may replace *how* avatar/scene specs are generated, but it **MUST preserve** the demo2 runtime contract.

Also: **Phase 1 rollout must keep accepting the legacy transform utterance triggers** unless/until we explicitly decide otherwise (at minimum: "turn into", "change into", "become", and any equivalent existing trigger paths), even if the underlying avatar-generation pipeline is replaced.

The runtime contract includes:

- **Listener routing + anti-feedback:** keep the `handleUserUtterance()` pattern (log → bump `listenTokenRef` → abort recognition → route reset/build/talk). The abort/token bump prevents hearing-itself loops.
- **Never listen while speaking/building.**
- **Browser ↔ bridge websocket protocol compatibility:** `ready → say → thinking → delta* → (optional scene) → reply`, plus `pong/reset/error`. Browser must tolerate `scene` arriving mid-stream.
- **Mouth/lip-sync contract:** `mouthPhase` remains the single speaking signal; stop/reset/barge-in must clear timers correctly.
- **Single mouth layer invariant:** scene avatars must contain **exactly one** mouth layer with `role: "mouth"` (prefer `attach.socket: "head.mouth"`).
- **Shared contracts stay authoritative:** Phase 1 output must survive existing sanitizers/renderer expectations unless you are explicitly migrating those contracts: `shared/avatar-drawing-grammar.json` + `shared/avatar-quality-presets.json`.

### Phase 1 fragile seams to keep aligned

If you touch any of these, treat it as a contract migration and update docs/tests accordingly:

- browser gate: `shouldUpdateAvatar()`
- utterance router: `handleUserUtterance()`
- transform entrypoint: `buildAvatar()` / `makeAvatar()`
- talk entrypoint: `talkWithBrain()`
- browser sanitizers: `sanitizeSceneSpec()` / `sanitizeDrawingLayers()`
- speaker streaming + mouth timers: `speak()` / `startStreamingSpeakerReply()`
- lifecycle resets: `resetDemo()` / `stopSpeakingAndListen()`
- bridge gate + scene builder: `wantsSceneSpec()` / `askSceneBrain()`
- bridge sanitizers: `sanitizeSceneSpec()` (bridge side)
- mouth placement: `role: "mouth"` + preferred `head.mouth` attachment

### Phase 1 rollout checklist

- [ ] Re-read `docs/DEMO2_ARCHITECTURE.md` before changing any Phase 1 code.
- [ ] Confirm browser `shouldUpdateAvatar()` and bridge `wantsSceneSpec()` remain aligned (or document why they diverge).
- [ ] Keep websocket message `type` names and ordering backward-compatible unless explicitly migrating.
- [ ] Confirm the browser keeps speaking streamed text while the avatar can update mid-stream.
- [ ] Confirm scene specs remain valid under the existing sanitizers and shared grammar/presets contracts.
- [ ] Confirm exactly one mouth layer remains after sanitization and it still animates via `mouthPhase`.

## End-to-end path

### 1) Detection in the browser

Location: `src/App.jsx`

`shouldUpdateAvatar(text)` is the browser gate.

It matches phrases including:

- `look like`
- `make you`
- `avatar`
- `turn into`
- `become`
- `transform`
- `change into`
- `be a`
- `be an`
- plus keywords like `robot`, `cat`, `alien`, `computer`, `boat`, `car`, `truck`, `cow`, `dragon`, color words, `eyes`, etc.

### 2) Routing in `handleUserUtterance()`

Still in `src/App.jsx`.

The flow is:

1. append transcript log
2. bump `listenTokenRef`
3. abort active recognition
4. if reset phrase → `resetDemo()`
5. else if transform phrase → `buildAvatar(text)`
6. else → `talkWithBrain(text)`

That abort step matters. If the listener is not stopped early enough, the app can hear its own TTS and recurse.

### 3) Split between `buildAvatar()` and `talkWithBrain()`

- `talkWithBrain(prompt)` sets speaking mode and just talks
- `buildAvatar(prompt)` sets building mode, creates a local avatar with `makeAvatar(prompt)`, then talks

The demo intentionally lets the avatar change while speech is still streaming.

### 4) `makeAvatar(prompt)`

`makeAvatar(prompt)` is intentionally thin.

It returns the sanitized scene spec path, so local transform builds are basically:

- choose preset/defaults
- sanitize into a valid scene object
- render immediately

### 5) Browser sanitizers

The browser-side scene path depends on:

- `sanitizeSceneSpec(spec, prompt)`
- `sanitizeDrawingLayers(rawLayers, prompt)`
- `normalizeAttach(raw, shape, role)`

These functions enforce the demo2 drawing contract.

Key behavior:

- clamp coordinates, scale, rotation, opacity, z
- reject or infer invalid sockets
- drop floating artifact shapes when they are not convincingly attached
- force a core mascot silhouette if the input is missing one
- guarantee a mouth layer exists

## Bridge side of the transform path

Location: `bridge/mydude-bridge.mjs`

### 1) Detection gate

`wantsSceneSpec(text)` decides whether the bridge even tries to generate a scene.

It overlaps with the browser gate on purpose.

### 2) Scene planner

`askSceneBrain(userText, sessionId)`:

- reads `shared/avatar-drawing-grammar.json`
- reads `shared/avatar-quality-presets.json`
- builds the `SCENE_SCHEMA` / `DRAWING_PROMPT`
- calls Copilot chat
- parses JSON
- sanitizes with bridge-side `sanitizeSceneSpec()`
- falls back to a local scene if the model fails

### 3) WebSocket message order

When the browser sends `{ type: 'say' }`, the bridge sends:

- `thinking`
- zero or more `delta`
- optional `scene`
- final `reply`

The browser accepts both streamed text and a late scene update.

## Shared grammar / preset contracts

Files:

- `shared/avatar-drawing-grammar.json`
- `shared/avatar-quality-presets.json`

Why they are shared:

- browser needs them to render safely
- bridge needs them to constrain LLM output safely

If you change shapes, materials, anchors, sockets, or preset layers, update both the bridge prompt/sanitizer and the browser renderer/sanitizer.

## Core structural types

### `SceneAvatar`

The SVG avatar renderer for scene mode.

It chooses a palette, sanitizes the layers again, and renders the final drawing.

### `DrawingLayer`

Per-layer render wrapper.

It:

- computes the socket rig position with `rigPoint(item)`
- applies translation / rotation / scaling
- applies extra mouth scaling when `item.role === 'mouth'`
- chooses speaking/listening micro-animations for some parts

### `Shape3D`

Maps a shape id to SVG geometry.

This is where mouth geometry changes with `mouthPhase`.

## Mouth invariant

This is the most important rule in the whole transform system:

- scene avatars need **one** mouth layer with `role: "mouth"`
- it should ideally attach to `head.mouth`
- do not add a second decorative mouth unless you want broken speaking visuals

Why it matters:

- `DrawingLayer` scales the mouth layer during speech
- `Shape3D` changes mouth geometry for open / mid / closed states
- if the mouth is not attached to `head.mouth`, it can slide off the face or disappear during animation

## Background / object / layer rules

- The renderer is a layered character builder, not a full scene engine
- Objects are just more layers
- Background cues should stay light and should not replace the mascot silhouette
- Floating ears, horns, hooves, spots, patches, buttons, badges, and similar details are usually dropped unless they are attached
- A layer that cannot attach convincingly should be omitted rather than rendered as a sticker

## Why this path often breaks listening / speaking / mouth / new-avatar behavior

Because a small transform edit changes multiple coupled systems at once:

- the listener decides whether to stop and re-enter listening
- speech synthesis runs while the avatar is changing
- bridge scene updates can arrive after the first speech delta
- sanitizers can delete the exact layer that the mouth animation expects
- if the transform regex misses a prompt, the app talks instead of building
- if the bridge regex misses a prompt, the browser waits for a scene that never comes
- if the mouth layer is malformed, the avatar may still build but look dead while speaking

## Concrete checklist for future changes

### If you change detection text

- [ ] update both browser `shouldUpdateAvatar()` and bridge `wantsSceneSpec()`
- [ ] keep reset phrases stronger than transform phrases
- [ ] test `turn into`, `become`, `change into`, `transform`, and one noun keyword like `cow`

### If you change scene sanitization

- [ ] keep exactly one mouth layer in scene mode
- [ ] preserve `role: 'mouth'`
- [ ] keep `attach.socket: 'head.mouth'` as the preferred target
- [ ] do not let floating artifact cleanup remove valid attached parts

### If you change the shared grammar

- [ ] update the browser renderer for any new shape ids
- [ ] update bridge prompt and allowed sets
- [ ] check preset layers against the new socket/shape list

### If you change websocket payloads

- [ ] keep existing `type` names stable
- [ ] keep `delta`, `scene`, `reply`, `thinking`, `reset`, `pong`, `error`, `ready` compatible
- [ ] confirm browser still handles out-of-order `scene` vs `reply`

### If you change mouth animation

- [ ] verify `mouthPhase` still drives both CSS/DOM avatar and SVG scene avatar
- [ ] verify `speak()` and `startStreamingSpeakerReply()` still clear timers
- [ ] verify barge-in still cancels speech and restarts the listener

### If you change listener / speaker transitions

- [ ] check `listenTokenRef` invalidation
- [ ] check `recognition.abort()` / `recognition.stop()` cleanup
- [ ] check `stopSpeakingAndListen()` returns to listening
- [ ] check `resetDemo()` restores a clean speaking/listening cycle

### Smoke test to run manually

- Start demo
- Say: `turn into a cow`
- Confirm:
  - listener stops cleanly
  - status changes to building/speaking
  - avatar becomes a scene avatar
  - mouth animates while speech plays
  - listener resumes afterward
- Say: `reset`
- Confirm avatar clears and listening restarts

## Why the cow / turn-into path is especially brittle

The cow-style transform touches all the risky pieces at once:

- keyword detection
- preset matching
- socket inference
- mouth attachment
- hoof/ear/spot attachment
- render sort order
- speech timing
- listener restart timing

That is why a small edit in transform logic often shows up as a listener, speaker, or mouth regression rather than an obvious transform bug.
