# simple-blog

A small, runnable [Next.js](https://nextjs.org) (App Router) site powered by the
headless [cmssy](https://www.cmssy.com) CMS: a blog listing block that loads published
pages on the server, plus a sanitized rich-text block.

Runs against the public cmssy demo workspace out of the box, so a fresh clone shows real
content with no cmssy account:

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open http://localhost:3000/blog - the blog section is what this example serves. The demo
workspace it points at is a commerce demo, so `/` is a storefront homepage built from
blocks this example does not register; it renders empty here.
[`next-storefront`](../next-storefront) is the example that serves it.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fcmssy-io%2Fexamples%2Ftree%2Fmain%2Fsimple-blog&env=CMSSY_ORG_SLUG,CMSSY_WORKSPACE_SLUG,CMSSY_DRAFT_SECRET,NEXT_PUBLIC_SITE_URL&envDescription=Your%20cmssy%20org%20slug%2C%20workspace%20slug%20and%20draft%20secret%20from%20Settings%20-%20Headless&envLink=https%3A%2F%2Fwww.cmssy.com%2Fdocs%2Fstart%2Finstallation&project-name=cmssy-simple-blog&repository-name=cmssy-simple-blog)

> To point this at **your own** workspace instead of the demo, run
> `npx @cmssy/cli link --token cs_...` - it rewrites the `CMSSY_*` values in `.env.local`.
> Draft preview and editing need your own workspace and its real secret.

## What's inside

- **Zero-config SDK wiring** - one catch-all route renders every cmssy page; the
  middleware preset (`createCmssyProxy`) handles locales, edit mode and CSP.
- **Live visual editing** - the cmssy editor frames your running site and edits in place.
  Only a request that proves itself with the workspace draft secret ever enters edit mode.
- **Schema-typed blocks** - each block exports its field schema and the component is typed
  `BlockProps<typeof props>`, so a renamed field is a compile error, not an empty block.
- **Two example blocks** that back the [block recipes](https://www.cmssy.com/docs/blocks):
  - `prose` - rich text, sanitized on the server with `sanitize-html` (XSS-safe).
  - `blog-index` - lists published child pages via the delivery API (`public.page.byType`).

  Two, not a gallery: this example registers exactly the blocks the pages it serves
  actually use, so every block here renders against real content. The wider set -
  media, relations to model records, layout header and footer - lives in
  [`next-storefront`](../next-storefront), which serves the pages that use them.

## Quickstart

```bash
git clone https://github.com/cmssy-io/examples
cd examples/simple-blog
pnpm install                        # npm install works too
cp .env.example .env.local          # renders the public demo workspace
pnpm dev                            # http://localhost:3000
```

To use your own workspace instead of the demo:

```bash
npx @cmssy/cli link --token cs_...  # rewrites .env.local, verifies the wiring
```

`cmssy link` connects the app to your workspace: it fetches the slugs and the draft
secret with a `cs_...` API token (dashboard → **API Tokens**), writes them to
`.env.local`, verifies the workspace is reachable and the secret is valid, and prints
the editor deep link. Prefer it to hand-copying values; if you do copy by hand, use
`.env.example` as the template.

### Wiring your own app instead

This example is a reference, not a required starting point. To add cmssy to an app you
already have (or a fresh `npx create-next-app`), generate exactly this wiring with:

```bash
npx @cmssy/cli init   # detects your framework, writes the cmssy wiring (idempotent)
npx @cmssy/cli link   # connects it to your workspace
```

### Environment

Three cmssy values plus your own origin (cmssy cloud handles the rest):

| Variable               | What it is                                                           |
| ---------------------- | -------------------------------------------------------------------- |
| `CMSSY_ORG_SLUG`       | Organization slug (Settings → Headless)                              |
| `CMSSY_WORKSPACE_SLUG` | Workspace slug (Settings → Headless)                                 |
| `CMSSY_DRAFT_SECRET`   | Server-only secret gating drafts and edit mode (Settings → Headless) |
| `NEXT_PUBLIC_SITE_URL` | Your own public origin, for canonical URLs, hreflang and the sitemap |

## Project structure

```
app/
  [[...path]]/page.tsx        catch-all: createCmssyPage + your generateMetadata
  [[...path]]/layout.tsx      public root layout: lang from the routed locale
  cmssy-edit/[[...path]]/     dedicated dynamic route for verified editor requests
  api/draft/route.ts          draft preview enter/exit (createDraftRoute)
  sitemap.ts, robots.ts       SEO from the workspace's published pages
  cmssy-edit/[[...path]]/layout.tsx  edit root layout: the same blocks, editable
lib/locale-path.ts            locale prefix helpers (yours, not the SDK's)
services/                     delivery queries, site config, sitemap data, SEO metadata
blocks/                       each block is self-styled with a co-located CSS Module
  prose/                      sanitize-html runs in the server loader
  blog-index/                 delivery-API query in a server-only loader helper
cmssy/
  blocks.ts                   the block registry (single source of truth)
  editor.tsx                  lazy-loads blocks for the visual editor
cmssy.config.ts               org + workspaceSlug + draftSecret
proxy.ts                      createCmssyProxy: locale, verified edit rewrite, CSP
styles/globals.css            plain base styles - cmssy does not control styling (no Tailwind)
```

## How it works

- **Rendering** - `app/[[...path]]/page.tsx` calls `createCmssyPage(cmssy, blocks)`. It fetches
  the page for the current path and renders its blocks. SEO is the app's own code:
  `services/seo.ts` builds the `Metadata` object, `app/sitemap.ts` and `app/robots.ts` build
  themselves from `services/pages.ts`. The SDK hands you data and stops there.
- **Editing (verified)** - the cmssy editor frames your site with `?cmssyEdit=1` **and** a
  `cmssySecret` that must match the workspace draft secret. `createCmssyProxy` in
  `proxy.ts` verifies that server-side and rewrites the request onto
  `/cmssy-edit/[[...path]]` - a route that is dynamic by design, because a static public
  page never sees the query string. An unverified `?cmssyEdit=1` renders published
  content like any other request. The proxy also applies the CSP `frame-ancestors` so
  only the cmssy admin (`https://www.cmssy.io`) can frame the site.
- **Drafts** - `/api/draft?secret=<CMSSY_DRAFT_SECRET>&redirect=/` enables Next draft
  mode for reviewing unpublished content on the public routes, without the editor.
  Exit with `/api/draft?disable=1`.
- **Layout blocks** - deliberately absent. A workspace's header and footer are ordinary
  cmssy blocks living in the `header` and `footer` regions, and rendering them takes one
  `CmssyLayoutSlot` per region in the root layout. This example does not, because the
  demo workspace's are the storefront's: a category mega-menu, a cart and a trade
  sign-in, none of which a blog has. See [`next-storefront`](../next-storefront) for the
  slot in use. Register a block for a region you do not render and the page ships it as
  `data-cmssy-unknown-block` - visible to no one, and caught by
  `scripts/assert-render.mjs`.
- **Server loaders** - a block's `loader` runs only on the server (never in the browser
  or the editor), so dependencies like `sanitize-html` and the GraphQL client stay out
  of the client bundle. See `blocks/prose` and `blocks/blog-index`.
- **Locales** - the workspace (Settings → Languages) is the only source of default and
  enabled languages; nothing is configured in `cmssy.config.ts`.

## Add your own block

1. Put the field schema and the component in `blocks/<name>/<Name>.tsx`:

   ```tsx
   import { fields, type BlockProps } from "@cmssy/react";

   export const calloutProps = {
     text: fields.text({ label: "Text", required: true }),
   };

   export default function Callout({
     content,
   }: BlockProps<typeof calloutProps>) {
     return <aside>{content.text}</aside>;
   }
   ```

2. Define the block in `blocks/<name>/block.ts`:

   ```ts
   import { defineBlock } from "@cmssy/react";
   import Callout, { calloutProps } from "./Callout";

   export const calloutBlock = defineBlock({
     type: "callout",
     label: "Callout",
     component: Callout,
     props: calloutProps,
   });
   ```

3. Register it in `cmssy/blocks.ts`.

It then appears in the editor's block picker automatically. Full guide:
[Building blocks](https://www.cmssy.com/docs/block-development).

## Deploy

Use the **Deploy with Vercel** button above, or push to any Node 22.13+ host. Set the three
environment variables in your host's dashboard, then point the workspace at the deployed
origin (`npx @cmssy/cli link --preview-url https://your-site.example`) and open the site
in the cmssy editor to start editing visually.

## Learn more

- Built on the cmssy SDK: [`@cmssy/next` + `@cmssy/react`](https://github.com/cmssy-io/cmssy-sdk)
- [cmssy docs](https://www.cmssy.com/docs)
- [Installation](https://www.cmssy.com/docs/installation) · [Quickstart](https://www.cmssy.com/docs/quickstart)
- [Block recipes](https://www.cmssy.com/docs/blocks) · [Theming](https://www.cmssy.com/docs/theming)
