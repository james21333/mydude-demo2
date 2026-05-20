# demo2 Phase 1 Implementation Plan (Durable)

**Repo:** `mydude-demo2` (https://demo2.mydude.live)

## Purpose / scope

Phase 1 replaces the **internal scene/avatar planning** logic with a deterministic, shared **procedural generator**, while **keeping demo2 runtime contracts stable** (listener/speaker/mouth/websocket/scene spec shape) during rollout.

**In scope**

- Add a shared Phase 1 generator module used by **both** browser + bridge.
- Roll out behind flags, preserving existing behavior when flags are off.
- Keep existing `SceneSpec` shape and existing sanitizers/renderer/websocket contract.
- Maintain legacy transform utterance triggers and routing during rollout.

**Out of scope (Phase 1)**

- Changing websocket message types/order/payload names.
- Rewriting listener/speaker state machine, `mouthPhase` semantics, or anti-feedback logic.
- Breaking or migrating `shared/avatar-drawing-grammar.json` or `shared/avatar-quality-presets.json`.
- Full removal of legacy LLM scene prompting (that’s a later cleanup phase).

## Current-state summary (today)

- Browser detects transform-like utterances via `shouldUpdateAvatar()` / `handleUserUtterance()` routing and calls an avatar/scene planner.
- Bridge may generate a scene spec via `askSceneBrain()` (currently via Copilot JSON prompting) and streams back over websocket.
- Browser must tolerate `scene` mid-stream and must preserve the **exact websocket ordering contract** for each utterance:
  - Bridge → browser: `ready`
  - Browser → bridge: `say`
  - Bridge → browser: `thinking`
  - Bridge → browser: `delta` (0+ times)
  - Bridge → browser: `scene` (optional; may arrive mid-stream)
  - Bridge → browser: `reply` (final)
  - (Also supported out-of-band: `pong`, `reset`, `error`)
- Output must remain valid under:
  - `sanitizeSceneSpec()` / `sanitizeDrawingLayers()`
  - `shared/avatar-drawing-grammar.json` (canonical grammar)
  - `shared/avatar-quality-presets.json` (canonical presets)
- **Invariant:** exactly **one** mouth layer with `role:"mouth"` attached to `head.mouth`.

## Architecture decision: what stays stable vs what changes

### Stays stable (non-negotiable)

- `handleUserUtterance()` anti-feedback routing pattern (log → bump `listenTokenRef` → abort recognition → route reset/build/talk).
- Never listen while speaking/building.
- `mouthPhase` as the only speaking signal.
- Websocket contract + ordering + payload names (browser ↔ bridge).
- Scene-mid-stream tolerance.
- Sanitizers: `sanitizeSceneSpec()` / `sanitizeDrawingLayers()`.
- Shared JSON contracts as canonical during rollout:
  - `shared/avatar-drawing-grammar.json`
  - `shared/avatar-quality-presets.json`
- Exactly one mouth layer invariant (attached to `head.mouth`).
- Trigger behavior parity: do not change `shouldUpdateAvatar()` or bridge `wantsSceneSpec()` behavior initially.

### Changes (replaced over time)

- LLM-driven avatar/scene planner internals.
- Bridge `askSceneBrain()` Copilot JSON-planning path (internals), under a bridge flag.

## Phase flags / gating

- **Browser gate:** `?phase1=1` **or** `localStorage.phase1 = "1"`.
- **Bridge gate:** `MYDUDE_PHASE1=1`.
- Later (Phase 3): default Phase 1 on, plus `?legacy=1` fallback.

## Target data-contract direction

**Near-term:** keep the existing `SceneSpec` shape already consumed by browser + bridge.

**Add-only metadata allowed:**

```json
{
  "engine": {
    "id": "phase1-procedural",
    "version": 1,
    "seed": 12345
  }
}
```

**Determinism:** generator output should be deterministic from `{ prompt, seed }` (and optionally a session/user salt) so presets become repeatable “recipes”.

**Attachment rule:** generator must attach anatomy strictly via sockets/anchors (no free-positioned anatomy that sanitizers will drop).

## Generator module (shared)

Add a shared module, used from both browser + bridge:

- `shared/phase1-avatar-engine.{js,mjs}` (choose the module format that fits the repo’s existing conventions)
- Export:

```ts
generatePhase1SceneSpec({
  prompt,
  seed,
  qualityPresetId?
}) => SceneSpec
```

**Phase 1 output requirements (must hold in every phase once enabled):**

- Produces a `SceneSpec` in the existing shape.
- Output passes `sanitizeSceneSpec()` and `sanitizeDrawingLayers()`.
- Exactly one mouth layer, with `role:"mouth"`, attached to `head.mouth`.
- No websocket contract changes needed to consume it.

## Phased rollout plan

### Step 0 — no-behavior-change scaffolding

**Goal:** land shared generator + flags with **zero** user-visible behavior change when flags are off.

**Work:**

- Add shared generator module and export `generatePhase1SceneSpec(...)`.
- Add feature gates:
  - browser: `?phase1=1` or `localStorage.phase1=1`
  - bridge: `MYDUDE_PHASE1=1`
- Keep generator output in existing `SceneSpec` shape.

**Acceptance criteria:**

- Flags off ⇒ behavior unchanged.
- Generator output (when called in a dev harness) passes sanitizers and maintains single-mouth invariant.

---

### Step 1 — browser-local Phase 1 parity mode

**Goal:** browser can generate a Phase 1 scene locally under the flag without changing routing or websocket behavior.

**Work:**

- Keep `shouldUpdateAvatar()` + `handleUserUtterance()` routing unchanged.
- Update `makeAvatar(prompt)`:
  - under browser Phase 1 flag: call `generatePhase1SceneSpec(...)`, then `sanitizeSceneSpec(...)`.
  - otherwise: preserve legacy behavior.
- Do **not** change websocket usage; browser still accepts later bridge scene updates.

**Mixed-flag rollout rule (deterministic precedence, Phase 1 Step 1):**

- If the browser builds a **local Phase 1** `SceneSpec` for a given utterance, it may render that scene immediately as a **provisional** scene for that utterance.
- If the bridge later sends a `scene` (or `reply.sceneSpec`) for that **same** utterance, the browser treats the **first** bridge-provided scene that arrives after the `say` as **authoritative** and may replace the provisional local scene **at most once**.
- Any additional bridge `scene` messages for that same utterance (after the first authoritative replacement) should be ignored until the next utterance begins.

This keeps the contract deterministic and avoids flicker/repeated swaps during mixed-flag rollout.

**Acceptance criteria:**

- “turn into a cow” works under `?phase1=1`.
- Mouth animates via `mouthPhase` and listener/speaker cycle remains stable.
- `reset` works; no websocket changes.

---

### Step 2 — bridge Phase 1 scene generation

**Goal:** bridge generates Phase 1 scenes under bridge flag while keeping the same websocket contract.

**Work:**

- Replace `askSceneBrain()` internals **under `MYDUDE_PHASE1=1`** to call shared generator (instead of Copilot JSON prompting).
- Keep `wantsSceneSpec()` unchanged.
- Keep websocket message types/order unchanged.

**Acceptance criteria:**

- Websocket sequence unchanged.
- When `wantsSceneSpec()` is true, bridge always emits a valid `SceneSpec`.
- `reset`/`ping` (`pong`) behavior still works.

---

### Step 3 — cutover + cleanup

**Goal:** Phase 1 becomes the default behavior, with legacy fallback while we quarantine old code.

**Work:**

- Make Phase 1 default in browser + bridge.
- Add `?legacy=1` fallback.
- Quarantine (or later remove) legacy LLM scene prompt code path.
- Treat presets as deterministic recipes (seeded and repeatable).

**Acceptance criteria:**

- Defaults cut over safely.
- `?legacy=1` keeps the old path working until explicitly removed.

## Validation matrix (minimum)

| Phase | Flags | Validation focus | Pass criteria |
|------:|------|------------------|---------------|
| Step 0 | all off | No behavior change | Smoke on dev + build/validate passes |
| Step 0 | phase1 on (dev-only) | Generator correctness | Sanitizers pass; exactly one mouth |
| Step 1 | browser on | Local parity | “turn into a cow” works; no ws changes; reset ok |
| Step 2 | bridge on | Contract stability | ws message types/order unchanged; valid `scene` when needed |
| Step 3 | defaults on | Rollout safety | `legacy=1` fallback works; runtime invariants unchanged |

## Explicit invariants (do not break)

- **Listener/speaker:** never listen while speaking/building; anti-feedback token/routing pattern remains.
- **Mouth:** `mouthPhase` is the *only* speaking signal; exactly one mouth layer with `role:"mouth"` attached to `head.mouth`.
- **Websocket:** keep message `type` values/order/payload names stable, and keep “scene mid-stream tolerance”.

  Concretely, for each utterance we must preserve the ordering contract:

  `ready → say → thinking → delta* → (scene) → reply`

  (Also supported out-of-band: `pong`, `reset`, `error`)
- **Triggers:** preserve legacy transform triggers; do not change `shouldUpdateAvatar()` or `wantsSceneSpec()` behavior initially.
- **Contracts:** keep shared grammar/presets canonical; generator must attach via sockets/anchors (no free-positioned anatomy).

## Risks + sequencing mistakes (and how we avoid them)

- **Breaking the single-mouth invariant** → add explicit generator checks and keep sanitize step; add a minimal test/harness if needed.
- **Browser/bridge trigger drift** → keep triggers unchanged at first; optionally centralize regexes later (`shared/transform-triggers.js`) with parity tests.
- **Changing websocket contract** → prohibited in Phase 1; treat message types/order/payload names as frozen.
- **Emitting free-positioned anatomy** → enforce sockets/anchors-only attachments in generator.
- **Cutting over bridge first** → do not; Step 1 browser-local fallback must land before Step 2 bridge cutover.
- **Removing legacy path too early** → keep `?legacy=1` fallback through Step 3.

## Rollback strategy

- Phase 0–2: turn off flags (`?phase1=0`, clear localStorage, unset `MYDUDE_PHASE1`).
- Phase 3: use `?legacy=1` and/or revert to pre-cutover commit.
- Keep websocket contract constant so rollback does not require coordinated client/server deploy changes.

## Recommended first PR scope (smallest safe start)

**PR 1 (Step 0 only):**

- Add `shared/phase1-avatar-engine.*` exporting `generatePhase1SceneSpec(...)`.
- Add browser + bridge feature gates (no default behavior change).
- (Optional) add a tiny dev-only harness or script that runs the generator through sanitizers to guard the mouth invariant.
- Update docs to point to this plan.
