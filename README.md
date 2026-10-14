# I Love Conference client

The [www.iloveconference.org](https://www.iloveconference.org) front end: a SvelteKit site built
with `@sveltejs/adapter-static` and served as static files from S3 through CloudFront. Searches go
to the search API (the `server` repo), which runs on AWS Lambda behind the same CloudFront
distribution at `/api/*`.

## Requirements

- Node.js 22 or newer. `.npmrc` sets `engine-strict=true` and `package.json` sets
  `engines.node` to `>=22`, so pnpm refuses anything older. CI and the deploy build on
  22; newer is fine locally.
- pnpm 8, the version in `packageManager` in `package.json`. Run `corepack enable` once to use it
  automatically, or run `npx pnpm@8.15.9 …`.

## Install

```console
pnpm install
```

## Develop

The dev server proxies `/api/*` to `http://localhost:8000` (see `vite.config.ts`). For working
searches, start the search API from the `server` repo first:

```console
# in the server repo
uvicorn server.main:app --port 8000
```

Then start the site at http://localhost:5173:

```console
pnpm dev
```

Without the API, every page except search works. Search shows "Search is temporarily
unavailable".

## Check and test

```console
pnpm check           # svelte-check and TypeScript
pnpm lint            # prettier --check and eslint
pnpm format          # fix formatting with prettier
pnpm test:unit --run # vitest unit tests
pnpm test            # Playwright browser tests (needs `npx playwright install` once)
```

## Build

```console
pnpm build
```

This writes the static site to `build/`:

- `index.html`, `search.html`, `static/about.html`, `static/terms.html` and `static/privacy.html`,
  prerendered at build time. `search.html` is an empty shell: the search page calls
  `/api/search?q=…` from the browser and shows the answer and results.
- `404.html`, which CloudFront returns for unknown paths.
- `_app/immutable/`, the JS and CSS, with content hashes in their file names.

`pnpm preview` serves the build locally, also with the `/api` proxy.

In production, a CloudFront Function maps URLs to these files: `/` to `/index.html`, and a path
whose last segment has no `.` (such as `/static/about`) to the same path plus `.html`. A trailing
slash redirects to the path without it.

## Deploy

CI deploys every push to `main` (see below). To deploy by hand, with AWS credentials for the
account:

```console
./deploy.sh                # pnpm build, then upload
SKIP_BUILD=1 ./deploy.sh   # upload the existing build/
```

`deploy.sh` reads the bucket and the distribution ID from the outputs of the `ilc` CloudFormation
stack (us-west-2, defined in the `server` repo), then:

1. uploads `build/_app/immutable/` with `Cache-Control: public,max-age=31536000,immutable`, never
   deleting old files, since pages loaded before the deploy may still request them;
2. uploads everything else with `Cache-Control: no-cache`, copying every file rather than syncing,
   so even an older build (`SKIP_BUILD=1` for a rollback by hand) replaces the pages;
3. deletes files that are no longer in the build, outside `_app/immutable/`;
4. invalidates `/*` on CloudFront.

To roll back a deploy, revert the commit on `main` and push; CI redeploys the previous version.

## CI

`.github/workflows/ci.yml` runs on every push and pull request:

- **build**: `pnpm install --frozen-lockfile`, `pnpm check`, `pnpm lint`, the unit tests and
  `pnpm build`, on Node 22 with the pnpm version from `package.json`.
- **deploy**: only for pushes to `main`, after **build** passes. It builds again, assumes the
  `ilc-client-deploy` IAM role through GitHub's OIDC provider (no stored AWS keys), runs
  `SKIP_BUILD=1 ./deploy.sh`, then checks that `/` and `/static/about` load on the CloudFront
  domain.

The role ARN comes from the repository variable `AWS_CLIENT_DEPLOY_ROLE_ARN` (Settings → Secrets
and variables → Actions → Variables).
