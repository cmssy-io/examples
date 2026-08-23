# astro-storefront

The proof that cmssy is headless for **any** frontend, not for Next.

```bash
cp .env.example .env.local
pnpm install && pnpm dev
```

Needs Node 22.13 or newer - the astro 7 compiler asks for 22.12, and the pinned pnpm refuses to run below 22.13.

This app talks to cmssy through `@cmssy/astro`, which depends on `@cmssy/core`
and nothing else - no React in the data path, no Next anywhere. A test in the SDK
fails the build if that ever stops being true.

- `src/middleware.ts` - the whole adapter: resolves the language, routes a
  verified editor request to `/cmssy-edit`, applies the CSP that lets the admin
  frame the site.
- `src/pages/[...path].astro` - the public page. React blocks rendered on the
  server by Astro, **zero client JS**.
- `src/pages/cmssy-edit/[...path].astro` - the editor route. The edit bridge is a
  React island, because the editor talks over `postMessage` - and that protocol
  lives in `@cmssy/core`, not in React.
- `src/pages/sitemap.xml.ts`, `src/pages/robots.txt.ts`, `src/services/` - SEO is
  the app's own code since SDK v10. The sitemap lists one `<url>` per language
  and drops drafts and the workspace's 404 page; the queries behind it live in
  `src/services/`, which is where you add your own.

## Prove the editor works

```bash
pnpm dev &
SMOKE_BASE_URL=http://localhost:4321 pnpm smoke:edit
```

A build cannot tell you whether the editor lives. This can. It needs a server
already running and the base URL to point at - as an argument or in
`SMOKE_BASE_URL`. `CMSSY_DRAFT_SECRET` comes from `.env.local`, which the script
loads itself.

`pnpm typecheck` runs `astro check`, which covers the `.astro` files too -
`astro build` does not typecheck them.

## Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fcmssy-io%2Fexamples%2Ftree%2Fmain%2Fastro-storefront&env=CMSSY_ORG_SLUG,CMSSY_WORKSPACE_SLUG,CMSSY_DRAFT_SECRET,CMSSY_SITE_URL&envDescription=Your%20cmssy%20org%20slug%2C%20workspace%20slug%20and%20draft%20secret%20from%20Settings%20-%20Headless%2C%20plus%20the%20public%20origin%20this%20site%20will%20be%20served%20from.&envLink=https%3A%2F%2Fwww.cmssy.com%2Fdocs%2Fstart%2Finstallation&project-name=cmssy-astro-storefront&repository-name=cmssy-astro-storefront)

Set **Root Directory** to `astro-storefront` - each example in this repo is a standalone app.

`astro.config.mjs` uses the Vercel adapter unless `LOCAL_SERVE` is set, so `pnpm build`
produces exactly what Vercel deploys. That adapter has no `preview` command, which is
why serving the build yourself is `pnpm build:local && pnpm start` - it swaps in the
Node adapter for that one build.
