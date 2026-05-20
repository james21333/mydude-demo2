# demo2.mydude.live Architecture Reference

Repo-specific reference for **demo2.mydude.live**.

This repo is a frozen fork of the finished My Dude live avatar app. Its job is to keep demo2 deployable without mutating the original baseline, while preserving the browser app, worker shell, and local bridge wiring that make the demo work end to end.

## What this repo does

- Serves the public demo at `https://demo2.mydude.live`
- Routes all demo traffic through the Cloudflare Worker shell
- Runs the browser app that listens, speaks, renders avatars, and handles reset/barge-in
- Uses the local Node bridge for speaker-agent replies and scene generation
- Shares the drawing grammar and quality presets between browser and bridge

## Main entrypoints

- `wrangler.jsonc` — worker config and route binding
- `src/index.js` — Cloudflare Worker HTML shell
- `index.html` — Vite entry HTML for local/dev builds
- `src/App.jsx` — browser app, listener, speaker, avatar build, render, reset
- `src/styles.css` — demo2-specific UI and stage styling
- `bridge/mydude-bridge.mjs` — websocket bridge for brain/speech/scene replies
- `shared/avatar-drawing-grammar.json` — allowed shapes, materials, anchors, sockets
- `shared/avatar-quality-presets.json` — preset scene recipes for common transform prompts

## Build / deploy structure

- Vite builds the browser bundle into `dist/`
- Wrangler serves `dist/` as Cloudflare assets
- `src/index.js` uses the built manifest to emit the HTML shell with the correct JS/CSS asset paths
- GitHub Actions / Wrangler deploy `main` to the demo2 route

## Worker shell flow

`src/index.js` is a tiny manifest-driven shell:

1. Try `env.ASSETS.fetch(request)` first.
2. If the asset exists, return it.
3. Otherwise render a simple HTML document with:
   - title chosen from hostname / subdomain
   - CSS links from the Vite manifest
   - one root `<div id="root"></div>`
   - one module script for the built app bundle

This means the worker is mostly a delivery shell, not an app server.

## Browser app flow

The demo app lives in `src/App.jsx`.

### Listener flow

- Start button activates the demo
- Browser SpeechRecognition is created in `startListening()`
- Final recognition results call `handleUserUtterance()`
- Recognition is aborted when user speech is accepted so the app does not hear itself
- `listenTokenRef` guards against stale listener restarts

### Utterance routing

`handleUserUtterance()` decides:

1. reset phrases → `resetDemo()`
2. transform phrases → `buildAvatar()`
3. everything else → `talkWithBrain()`

### Speaker flow

- `talkWithBrain()` sets speaking state and streams a spoken reply
- `buildAvatar()` also streams a reply, but first creates a local avatar spec with `makeAvatar()`
- Brain mode opens `wss://bridge.mydude.live/speak`
- The browser consumes streamed `delta`, `scene`, `reply`, `thinking`, and `reset` messages

### Reset flow

`resetDemo()` clears:

- listener state and tokens
- speech synthesis queue
- bridge socket
- mouth animation timers
- avatar and personality state
- session id for the bridge reset path

## Bridge flow

`bridge/mydude-bridge.mjs` is the local Node service that keeps Josh’s auth off the client.

- Reads the shared JSON contracts directly from `shared/`
- Exchanges the OpenClaw GitHub Copilot auth profile for a Copilot chat token
- Streams assistant deltas over websocket
- Optionally builds a scene spec in parallel for transform prompts
- Persists speaker-agent state files under the agent dir

Bridge websocket lifecycle:

- `ready` → browser sends `say`
- `thinking` → bridge starts model work
- `delta` → streamed speech chunks
- `scene` → optional avatar/scene JSON
- `reply` → final text + optional sceneSpec
- `pong` / `reset` / `error` for control and failure paths

## Shared JSON contracts

### `shared/avatar-drawing-grammar.json`

Defines the canonical 3D-cartoon drawing vocabulary used by both browser and bridge:

- allowed `shapes`
- allowed `materials`
- allowed `anchors`
- allowed attachment sockets
- max layers / coordinate / scale / rotation ranges
- required face + mouth rules

### `shared/avatar-quality-presets.json`

Defines higher-level preset scenes that can short-circuit transform prompts like boat/computer/car/cow/dragon/funny idea.

Browser and bridge both use the same preset data so the prompt can map to the same structure on either side.

## Speech recognition flow

- `SpeechRecognition` is the browser listener
- Final results call `handleUserUtterance()`
- Interim text updates the transcript UI only
- Aborts and token bumps prevent stale result handling
- Barge-in logic can stop speech when the user starts talking over it

## Speech synthesis flow

- `speak()` compiles chunks and controls browser TTS directly
- `startStreamingSpeakerReply()` receives streamed bridge text and re-synthesizes it as chunks
- `compileSpeechPlan()` supports director tags like `[warm]`, `[pause:250]`, `[beat]`
- `mouthPhase` is driven from speech chunk start/end and word-boundary events

## Mouth animation flow

- `mouthPhase` is a shared speaking state for both built and scene avatars
- `pulseMouthFrame()` cycles mouth open/closed states
- `DrawingLayer` scales mouth layers vertically when `role === 'mouth'`
- `Shape3D` also changes geometry for mouth-specific shapes like `mouthSmile`, `mouthScreen`, and `mouthGrille`

Important invariant:

- scene avatars should have exactly one mouth layer with `role: "mouth"`
- it should usually attach to `head.mouth`
- the render path uses that layer as the speaking target

## Rendering path

There are two avatar modes:

### Legacy built avatar

`CartoonAvatar` renders a simple DOM/CSS character for non-scene avatar state.

### Scene avatar

`SceneAvatar` renders the rich SVG avatar path:

- sanitize scene data
- choose palette
- map layers to `DrawingLayer`
- compute rig positions with `rigPoint()`
- render the layer using `Shape3D`

Rendering depends on these helpers staying aligned:

- `sanitizeSceneSpec()`
- `sanitizeDrawingLayers()`
- `normalizeAttach()`
- `rigPoint()`
- `DrawingLayer`
- `Shape3D`

## Major state / refs

Key browser state:

- `activated`
- `status`
- `transcript`
- `message`
- `avatar`
- `volume`
- `mouthPhase`
- `buildProgress`
- `log`
- `debug`
- `brainStatus`
- `voiceInventory`
- `voiceChoice`
- `micDevices`
- `selectedMicId`
- `typedFallback`

Key refs:

- `recognitionRef`
- `audioRef`
- `analyserRef`
- `speakingTimer`
- `mouthCloseTimer`
- `mouthStepRef`
- `lastMouthPulseRef`
- `activatedRef`
- `statusRef`
- `listenTokenRef`
- `listenRestartTimerRef`
- `listenerOptionsRef`
- `sessionIdRef`
- `voiceRef`
- `speechRunRef`
- `streamQueueRef`
- `streamSpeakingRef`
- `streamAfterRef`
- `speakerSocketRef`
- `speechStartedAtRef`
- `bargeInFramesRef`
- `bargeInCooldownRef`
- `personalityRef`

## Known coupling / risk areas

These are the places where small edits often break demo2:

- transform detection regexes in browser and bridge
- local avatar build vs streamed scene build split
- sanitize functions that silently drop invalid layers
- mouth role/socket invariants
- speech cancellation / restart timing
- websocket payload names and ordering
- preset grammar changes without matching renderer updates
- stale listener tokens after reset, stop, or barge-in

If you touch listener, speaker, mouth, websocket, transform, scene/drawing, JSON, background, or on-screen-object behavior, read the transform guardrails doc first.
