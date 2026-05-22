# demo2.mydude.live Deployment

`mydude-demo2` is a separate Cloudflare Worker deployment for the finished My Dude avatar demo.

- Repo: `james21333/mydude-demo2`
- Worker: `mydude-demo2`
- Route: `demo2.mydude.live/*`
- Deploy path: GitHub Actions → Cloudflare Wrangler (`.github/workflows/deploy.yml`)

## GitHub setup (required)

Repository secrets:
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Optional:
- Create a GitHub Environment named `production` (the workflow targets it) and apply protection rules if desired.

This repo should not reference or modify the original frozen demo deployment. If demo2 evolves, keep those changes in this repo or a new fork/version.
