# demo2.mydude.live Deployment

`mydude-demo2` is a separate Cloudflare Worker deployment for the finished My Dude avatar demo.

- Repo: `james21333/mydude-demo2`
- Worker: `mydude-demo2`
- Route: `demo2.mydude.live/*`
- Deploy path: GitHub Actions → Cloudflare Wrangler (`.github/workflows/deploy.yml`)

## Public demo vs local dev routes

In production, the Worker is intentionally strict: only `/test1` is meant to be public. `/test2`–`/test4` are localhost-only developer routes and should return 404 on `demo2.mydude.live`.

## GitHub setup (required)

### First publish (bootstrap note)

GitHub will not offer **Run workflow** / `workflow_dispatch` until the workflow file exists on the remote default branch.

So the **first** approved publish must push/merge this branch to `main` so GitHub registers:

- `.github/workflows/deploy.yml`

After that initial merge, deploys will happen on the `push` trigger to `main`, and future manual runs via `workflow_dispatch` will be available.

### Repository secrets

Set these GitHub repository secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID` (Cloudflare dashboard → your account)

#### Cloudflare token requirements

The `CLOUDFLARE_API_TOKEN` must be an API token that can:

- deploy/update the `mydude-demo2` Worker (Workers access)
- manage the route/zone needed to bind `demo2.mydude.live/*`

Use the Cloudflare dashboard to generate a token with the minimal permissions that cover those two capabilities.

Optional:
- Create a GitHub Environment named `production` (the workflow targets it) and apply protection rules if desired.

This repo should not reference or modify the original frozen demo deployment. If demo2 evolves, keep those changes in this repo or a new fork/version.
