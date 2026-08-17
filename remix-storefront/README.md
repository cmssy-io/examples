# remix-storefront

A cmssy site that works, is editable, and proves it stays that way.

```bash
cp .env.example .env.local
pnpm install && pnpm dev
```

Needs Node 22.22 or newer - react-router 8 says so itself.

## What is wired

- `app/routes/page.tsx` - the cmssy page. `createCmssyLoader` fetches it, and a
  **verified** editor request (`cmssyEdit=1` + a matching `cmssySecret`) renders
  the same page through the edit bridge.
- `headers` - the CSP that lets the admin frame your site. Drop it and the editor
  is an empty box with no error anywhere.
- `app/routes/sitemap.ts`, `app/routes/robots.ts`, `app/services/` - SEO is the
  app's own code since SDK v10. The sitemap lists one `<url>` per page and drops
  drafts and the workspace's 404 page; the queries behind it live in
  `app/services/`, which is where you add your own.
- `meta` on the page route - the title and description come from the same
  services layer, resolved for the locale the loader returns.

This example serves one locale. It has no locale prefix routing, so `/no/blog`
is not the Norwegian page - it is the same page the default locale gets, and the
sitemap says so by listing each page once. `astro-storefront` shows the prefix
version with a middleware; teaching this one the same is CMS-1088.

## Why there is no `/cmssy-edit` route here

The Next adapter needs one because a Next page can be **static**, and a static
page never sees the query string that would put it in edit mode. React Router
renders on every request, so the editor is served from the page itself - verified
the same way, on the same protocol, with less machinery.

## Prove the editor works

```bash
pnpm build:local && pnpm start &
pnpm smoke:edit
```

A build proves the site compiles. It says nothing about whether the site can be
**edited** - and that is the part that breaks silently.

`pnpm typecheck` runs `react-router typegen` and then `tsc`, which is what makes
a route's loader data and its `meta` agree.

## Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fcmssy-io%2Fexamples%2Ftree%2Fmain%2Fremix-storefront&env=CMSSY_ORG_SLUG,CMSSY_WORKSPACE_SLUG,CMSSY_DRAFT_SECRET,CMSSY_SITE_URL&envDescription=Your%20cmssy%20org%20slug%2C%20workspace%20slug%20and%20draft%20secret%20from%20Settings%20-%20Headless%2C%20plus%20the%20public%20origin%20this%20site%20will%20be%20served%20from.&envLink=https%3A%2F%2Fwww.cmssy.com%2Fdocs%2Fstart%2Finstallation&project-name=cmssy-remix-storefront&repository-name=cmssy-remix-storefront)

Set **Root Directory** to `remix-storefront` - each example in this repo is a standalone app.

`react-router.config.ts` applies the Vercel preset unless `LOCAL_SERVE` is set,
so `pnpm build` produces exactly what Vercel deploys. The preset splits the
server build into per-runtime bundles (`build/server/nodejs_<hash>/index.js`)
that Vercel's builder knows how to find and `react-router-serve` does not - which
is why serving it yourself is `pnpm build:local && pnpm start`, not
`pnpm build && pnpm start`.
