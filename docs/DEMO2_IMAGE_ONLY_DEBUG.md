# demo2 imageOnly debug mode (URL-driven)

This repo includes an **additive image-only debug UI** inside the browser bundle.

It is activated **only** by query params and is intended for validating scene/vector output through the real:

- `sanitizeSceneSpec()` / `sanitizeDrawingLayers()`
- `SceneAvatar` renderer path

Hard rules:

- No SpeechRecognition startup
- No speechSynthesis output
- No behavior changes unless `?imageOnly=1` is present

## Params

- `imageOnly=1` — master switch
- `source=local|bridge`
- `prompt=<url-encoded>`
- `seed=<uint32>` — optional; used for deterministic local Phase 1 generation
- `phase1=1` — enable local Phase 1 generator for `source=local`
- `showJson=1` — show sanitized `sceneSpec` JSON in the UI
- `auto=1` — run immediately on load

## Examples

Local Phase 1 (no bridge):

```
/?imageOnly=1&prompt=turn%20into%20a%20cow&source=local&phase1=1&showJson=1&auto=1
```

Bridge scene fetch (no speech output):

```
/?imageOnly=1&prompt=turn%20into%20a%20cow&source=bridge&showJson=1&auto=1
```
