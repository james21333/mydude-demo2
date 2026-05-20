# Demo2 Listener + Speech Guardrails

These rules exist because demo2 listener/speaker regressions have happened more than once. Read this before changing `src/App.jsx` listener, speech, mouth, bridge streaming, or barge-in behavior.

## Current stable points

- `04fe97c` — demo2 frontend uses isolated `bridge2.mydude.live` / local port `8788`.
- `aff5e6c` — reverted broken voice/lipsync tuning commit `c58fc45` while preserving bridge2 isolation.
- `00cd743` — current cautious voice-tuning slice: louder/sustained barge-in and no pre-speech mouth pulse.

Use `git notes show <commit>` for the lessons attached to `aff5e6c` and `00cd743`.

## What broke

Commit `c58fc45` changed too many coupled speech/listener things at once:

- speech streaming / pending-delta queue behavior
- `speechStartedAtRef` semantics
- `SpeechSynthesisUtterance.onstart` mouth timing
- barge-in thresholds
- queue cleanup / listener resume timing

Josh reported the listener broke. We reverted that whole commit with `aff5e6c`.

## Non-negotiable rule

**Listener stability beats lipsync and latency.**

Do not bundle listener lifecycle changes with lip-sync or latency tuning. If any listener regression appears, revert the smallest newest speech/listener commit first.

## Safe-change rules

When improving voice, lipsync, latency, or barge-in:

1. Keep each commit small and bisectable.
2. Do not rewrite the speech queue and listener lifecycle in the same commit.
3. Do not change `resumeListening`, `startListening`, `handleUserUtterance`, `listenTokenRef`, `speechRunRef`, websocket close behavior, and mouth timers together.
4. Mouth animation is cosmetic. It may follow `onstart` / `onboundary`, but must not drive listener state, queue state, run ids, or callbacks.
5. Preserve the `after` callback semantics that return from speaking/building to listening.
6. Preserve the invariant: never listen while speaking/building, and never get stuck speaking/building.
7. Make barge-in use hysteresis: louder and sustained input, not one loud frame.
8. If trying latency improvements, do that as a separate experiment from mouth/barge-in changes.
9. If changing browser TTS or SpeechRecognition behavior, test in the real browser path before calling it stable.

## Known safe slice from `00cd743`

`00cd743` intentionally did only this:

- raised barge-in from an easy trigger to a louder/sustained trigger:
  - ~1s minimum speech time before interruption
  - `0.12` mic threshold
  - `8` sustained frames
- removed immediate pre-speech `startMouthPulse()` calls so lips wait for TTS `onstart`

It did **not** rewrite streaming queue behavior, pending-delta flushing, status lifecycle, or listener resume logic.

## Validation checklist before pushing

- `npm run build`
- Confirm no refs to frozen demo/shared bridge:
  - no `demo.mydude.live`
  - no `mydude-live`
  - no `wss://bridge.mydude.live`
  - no `8787` client default for demo2
- Verify live demo2 asset after deploy.
- Verify `https://bridge2.mydude.live/health` returns `mydude-demo2-openclaw-bridge`.
- Ask Josh to browser-test actual listener behavior if the change touches SpeechRecognition, SpeechSynthesis, queueing, mouth timers, or barge-in.

## Git notes requirement

For every demo2 speech/listener/mouth/barge-in commit, add a git note:

```bash
git notes add -m "What changed, why it was safe, what to revert first if listener breaks." HEAD
git push origin refs/notes/commits
```

If a commit breaks the listener, add/update the note on both the bad commit and the revert commit with the failure mode and lesson.
