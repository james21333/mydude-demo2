# My Dude Demo2 Streaming Bridge

Local Node bridge for the demo2 My Dude speaker agent.

- Public route: `wss://bridge2.mydude.live/speak`
- Health route: `https://bridge2.mydude.live/health`
- Local health route: `http://127.0.0.1:8788/health`
- Runtime model: `github-copilot/gpt-4o-mini`
- Local service path on Fast Panda: `/home/josh/.openclaw/bridge-demo2/mydude-bridge.mjs`
- Agent self files: `/home/josh/.openclaw/bridge-demo2/mydude-speaker-agent/`
- Demo2 grammar/preset files: `/home/josh/.openclaw/repos/mydude-demo2/shared/`

The browser never receives Josh's GitHub/Copilot auth. The bridge reads the existing server-side OpenClaw GitHub Copilot auth profile, exchanges it for a Copilot chat token, and streams deltas back over the WebSocket.

Demo2 intentionally uses `bridge2.mydude.live` and the isolated local port `8788`, not the frozen demo bridge.
