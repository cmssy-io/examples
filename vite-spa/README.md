# cmssy on React + Vite (SPA)

A plain `npm create vite` React app that renders a cmssy workspace in the
browser. No adapter package, no server, no proxy.

```bash
cp .env.example .env.local
pnpm install
pnpm dev
```

## How it works

`src/app.tsx` is the whole integration:

```tsx
<CmssyRoute config={cmssy} blocks={blocks} path={path}>
  {({ Region, Blocks }) => (
    <>
      <Region id="header" />
      <main>
        <Blocks />
      </main>
      <Region id="footer" />
    </>
  )}
</CmssyRoute>
```

`CmssyRoute` (from `@cmssy/react/spa`) fetches the page, the layout and every
block's content and loader data, then renders it with the synchronous
`CmssyBlocks` / `CmssyLayoutRegion`. The delivery API answers the browser
directly: `Access-Control-Allow-Origin: *`, no cookies, no proxy.

The blocks in `src/cmssy` are the same components the Remix and Astro examples
use - block code is framework-free.

## What this app does not have

- **No SEO.** The served HTML is an empty shell; the content arrives after the
  JavaScript does. Use Vite SSR (see [the docs](https://github.com/cmssy-io/cmssy-sdk/blob/main/docs/vite.md))
  when the pages have to be indexed.
- **No sitemap or robots.** Both need a server.
- **No draft preview and no live editor.** Edit mode needs the workspace draft
  secret, and a client-only bundle cannot hold one. Preview from an SSR build.
- **No server-side loaders.** A block loader here runs in the browser: never put
  a secret in one, and treat anything it sanitizes as cosmetic rather than a
  security boundary.

## Config

`src/cmssy.config.ts` reads `VITE_CMSSY_ORG_SLUG` and
`VITE_CMSSY_WORKSPACE_SLUG` - both public, both baked into the bundle at build
time, which is exactly why there is no secret here.
