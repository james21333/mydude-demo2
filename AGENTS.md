# Repo Rules for demo2.mydude.live

Anyone changing this repo must read these docs first:

1. `docs/demo2-architecture-reference.md`
2. `docs/demo2-transform-pipeline-guardrails.md`

Do this before touching any of the following areas:

- listener behavior
- speaker / TTS behavior
- mouth animation
- websocket message handling
- transform detection or routing
- scene / drawing rendering
- shared JSON contracts
- background handling
- on-screen object / layer behavior

## Working rules

- Keep changes specific to `demo2.mydude.live`
- Prefer the smallest correct change
- Preserve the browser / bridge contract unless a change intentionally updates both sides
- If you change the transform path, update both docs if the behavior meaningfully changes
- Run the repo’s smallest meaningful validation before shipping changes
- Do not push unless explicitly asked

## Practical reminder

Transform edits in this repo often affect listening, speaking, and render state even when the diff looks local. Read the guardrails doc before making those edits.