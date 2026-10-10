# cmssy examples

Runnable example projects built with the [cmssy](https://cmssy.com) headless SDK.

Each directory is a **standalone app**. There is no workspace and no root manifest, so a fork
inherits nothing:

```bash
git clone https://github.com/cmssy-io/examples
cd examples/simple-blog
pnpm install
cp .env.example .env.local
pnpm dev
```

Each of the five apps ships an `.env.example` pointing at the **public cmssy demo workspace**, so a
fresh clone renders real content without a cmssy account. Point one at your own workspace with
`npx @cmssy/cli link --token cs_...`. `catalog-import` is the exception: it writes, so it needs a
workspace id and a token of your own.

## Examples

| Example | Framework | What it shows |
| --- | --- | --- |
| [simple-blog](./simple-blog) | Next.js | Blog listing with a server `loader`, rich text, model records bound via `fields.relation` |
| [next-storefront](./next-storefront) | Next.js | Commerce: products, categories, cart, checkout, member accounts and orders as Server Actions |
| [astro-storefront](./astro-storefront) | Astro | The catch-all route, block registry and verified edit mode on the Astro adapter |
| [remix-storefront](./remix-storefront) | React Router 8 | The same storefront on React Router (Remix): resource routes, middleware-held session, locale prefix routing |
| [vite-spa](./vite-spa) | React + Vite | No adapter package, no server, no proxy: the browser talks to the delivery API directly, so the block registry and `fields` work without a framework adapter |
| [catalog-import](./catalog-import) | Node script | Writing: a wholesale catalog moved from SQL Server through the admin API, kept in step with patches |

All five apps point at the same `cmssy-demo` workspace - one set of content, five unrelated
frontends, none of which the CMS knows about.

The four server-rendered apps - `simple-blog`, `next-storefront`, `astro-storefront` and
`remix-storefront` - mount the block data route at `/api/cmssy/block-data`, one helper per adapter,
same path. `vite-spa` has no server to mount it on. Without it the editor
cannot run a block's `loader`, so a block that fetches - a product grid, a blog index - stays frozen
while you configure it: changing the category changes nothing until the page is saved and the frame
reloads, and a block you have just added has no data at all. The route answers only a request
carrying an edit token the page was rendered with, minted from `draftSecret` and bound to that exact
page; a forged `x-cmssy-edit` header gets a 403, which is what CI asserts (CMS-1804, CMS-1803).

All five also declare a field or two as `localized: false` - three each, one in `simple-blog`: a
footer link's target, the category a navigation entry points at, the page a blog index lists under. None of those carry language, so
cmssy stores them once instead of once per locale and folds them back in before delivery - the
components read them unchanged.

Measured 2026-10-10: four of the five examples register the whole block set -
`next-storefront`, `astro-storefront` and `remix-storefront` 14 `defineBlock` calls each, and
`vite-spa` 13. `simple-blog` registers 2, which is its entire surface: a `/blog` listing and
a post. Every example carries `assertRender` targets in `examples.json` and none is marked
`buildOnly`, so all five are asserted in CI - `next-storefront` 6, `astro-storefront` 7,
`remix-storefront` 19, `vite-spa` 1 and `simple-blog` 6 targets, with the Astro storefront also
asserting its sitemap.

## Why this repo exists

Example code that nobody builds rots. Tutorials on cmssy.com once taught SDK APIs that had never
existed, because prose has no compiler.

So every example here is built in CI and asserted to **render**, not merely to compile, and a
change that breaks one turns its pull request red. Each has its own workflow - `pnpm install
--frozen-lockfile`, `pnpm typecheck`, `pnpm build`, then `node scripts/serve-and-assert.mjs <dir>`,
which serves the build and asks `scripts/assert-render.mjs` whether the `assertRender` targets
actually render. They run on pull requests and on pushes to `main`, paths-filtered on the example
plus `examples.json` and `scripts/**`, across both ends of the Node range in `engines.node`.

Each app installs the SDK from the registry, so what CI exercises is the published artifact rather
than a symlink into a monorepo. It is not the **packed tarball** of an unreleased SDK, which is the
remaining gap: a breaking SDK change is caught here once it is published, not before.

## Related

- `npx @cmssy/cli init` - generates this same wiring into an app you already have, if you
  want an empty starting point rather than a finished one.
- [Documentation](https://cmssy.com/docs)
