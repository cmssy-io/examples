# next-storefront

A full-featured [Next.js](https://nextjs.org) (App Router) showcase of the headless
[cmssy](https://www.cmssy.com) CMS: an editable, SEO-ready content site **plus a working
storefront** with member sign-in, products, cart and checkout.

> Looking for a blank slate to build on? Use
> **[simple-blog](../simple-blog)** - the minimal
> clone-and-grow template. This repo is the _demo_: it shows what the SDK can do.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fcmssy-io%2Fexamples%2Ftree%2Fmain%2Fnext-storefront&env=CMSSY_ORG_SLUG,CMSSY_WORKSPACE_SLUG,CMSSY_DRAFT_SECRET,CMSSY_SESSION_SECRET&envDescription=Your%20cmssy%20org%20slug,%20workspace%20slug%20and%20draft%20secret%20from%20Settings%20-%20Headless,%20plus%20a%20session%20secret%20for%20the%20shop&envLink=https://www.cmssy.com/docs/installation&project-name=cmssy-next-storefront&repository-name=cmssy-next-storefront)

> **Try it instantly.** `.env.example` already points at the public demo workspace, so
> `cp .env.example .env.local && pnpm dev` renders real content with no cmssy account.
> `CMSSY_DRAFT_SECRET` is required by the config but is only verified for _draft preview_
> (which needs your own workspace), so the placeholder it ships is enough - it is 16+
> characters, which `/api/draft` requires of any secret before it will run. For your own
> site, use the real secret generated under **Settings → Headless**.


> **Deploying?** `CMSSY_SESSION_SECRET` signs the cart and customer session cookies. The value in
> `.env.example` is a placeholder - generate your own before putting this anywhere real:
> `openssl rand -base64 32`.

## What's inside

### Content site

- **One catch-all route** renders every cmssy page - you only set the org, workspace slug
  and draft secret.
- **Live visual editing** - the cmssy editor frames your running site and edits in place,
  header and footer included (they are layout blocks).
- **Fourteen blocks** backing the [block recipes](https://www.cmssy.com/docs/blocks), each
  with its field schema next to the component and a co-located CSS Module:
  - `hero`, `prose` (sanitized server-side with `sanitize-html`), `faq`, `value-props`,
    `stats-band`, `feature-media`, `cta-banner`, `promo-strip`
  - `blog-index` - lists published child pages via the delivery API (`public.page.byType`)
  - `category-grid`, `product-grid`, `shop-hero` - catalogue blocks reading model records
  - `site-header`, `site-footer` - layout blocks, editable in place

### Storefront

A headless commerce flow written against the delivery API - the SDK stops at the gateway,
so every read and write here is this app's own typed GraphQL:

- **Typed queries** - `graphql/**/*.graphql` → `pnpm codegen` → `services/*.ts`. A field
  the API does not have is a build error, not a runtime `undefined`.
- **Member auth** - app-owned: `lib/cmssy/session-crypto.ts` seals a `jose`-signed session
  into an httpOnly cookie, `proxy.ts` refreshes it, and the access token never reaches
  client JS.
- **Products** - `lib/catalog.ts` reads the `product` and `category` models (server-rendered,
  filtered by category, brand and stock state).
- **Cart + checkout** - Server Actions in `lib/actions/`, optimistic UI with `useOptimistic`,
  cart bound to a signed cart cookie and merged into the member's cart on sign-in.
- **Order history** - `/account` and `/order/[id]`, read through `services/orders.ts`.

The storefront routes (`/c`, `/p`, `/cart`, `/account`, `/order`, `/quick-order`) are plain
app routes, not CMS pages, so they don't consume the workspace's page quota. The catalogue
lives in the `product` data model.

## Quickstart

```bash
git clone https://github.com/cmssy-io/examples
cd examples/next-storefront
pnpm install
cp .env.example .env        # then fill in the values below
pnpm dev                    # http://localhost:3000
```

Two generators, both committed so a fresh clone builds without running either:

| Command         | Reads                                   | Writes                    |
| --------------- | --------------------------------------- | ------------------------- |
| `pnpm codegen`  | the live delivery **schema**            | `graphql/generated/`      |
| `pnpm types`    | the workspace's **models**              | `graphql/models.ts`       |

Re-run `codegen` after editing a `.graphql` file, and `types` after changing a model in
the CMS - then `pnpm typecheck`. A field you removed in the CMS becomes a compile error
here, which is the point.

### Environment

Four values (cmssy cloud handles the rest):

| Variable               | Where to find it                                                                         |
| ---------------------- | ---------------------------------------------------------------------------------------- |
| `CMSSY_ORG_SLUG`       | cmssy dashboard -> Settings -> Headless                                                  |
| `CMSSY_WORKSPACE_SLUG` | cmssy dashboard -> Settings -> Headless                                                  |
| `CMSSY_DRAFT_SECRET`   | cmssy dashboard -> Settings -> Headless (generated per workspace - copy the exact value) |
| `CMSSY_SESSION_SECRET` | Generate one: `openssl rand -base64 32`. Seals the member session cookie.                |

## Project structure

```
app/(shop)/
  page.tsx               the home page (createCmssyPage pinned to "/")
  [...path]/page.tsx     catch-all: every other cmssy page
  cmssy-edit/            dedicated dynamic route for verified editor requests
  layout.tsx             header/footer layout blocks + cart/user providers
  c/[slug]/ p/[slug]/    category and product pages (model records, not CMS pages)
  cart/ account/ order/  cart, sign-in, order history and receipts
app/api/draft/route.ts   draft/preview mode entry (createDraftRoute)
app/sitemap.ts robots.ts SEO built from the workspace's pages plus the catalogue
blocks/                  14 blocks; each is block.ts + Component.tsx + CSS Module
cmssy/
  blocks.ts              the block registry (single source of truth)
  editor.tsx             lazy-loads blocks for the visual editor
  editable-layout.tsx    mounts header/footer through the edit bridge
graphql/                 one .graphql file per operation + codegen output (committed)
services/                pages, site, layout, seo, cart, auth, orders
lib/cmssy/               session sealing, cart + member tokens, request helpers
lib/actions/             Server Actions for cart and auth
cmssy.config.ts          org + workspaceSlug + draftSecret + resolveLocale
codegen.ts               types the .graphql files against the live delivery schema
proxy.ts                 locale header, session refresh, verified edit rewrite, CSP
styles/                  plain CSS - cmssy does not control styling (no Tailwind)
```

## How it works

- **Rendering** - `app/(shop)/[...path]/page.tsx` calls `createCmssyPage(cmssy, blocks, { editor })`.
  It fetches the published page for the current path and renders its blocks; `app/(shop)/page.tsx`
  does the same pinned to `/`. SEO is the app's own - `services/seo.ts` in `generateMetadata`.
- **Data** - the SDK stops at the gateway (`graphqlRequest`), so every read and write is this
  app's query: `graphql/**/*.graphql` → `pnpm codegen` → `services/*.ts`. Nothing outside
  `services/` and `lib/cmssy/` writes GraphQL.
- **Editing** - the cmssy editor opens your site in an iframe. `proxy.ts` verifies the edit
  request, rewrites it onto `/cmssy-edit` and applies the CSP `frame-ancestors` so only the
  cmssy admin can frame and live-patch blocks.
- **Drafts** - the editor hits `/api/draft?secret=<CMSSY_DRAFT_SECRET>` to enter preview mode
  and see unpublished content.
- **Server loaders** - a block's `loader` runs only on the server (never in the browser or the
  editor), so dependencies like `sanitize-html` and the delivery client stay out of the client
  bundle. See `blocks/prose` and `blocks/product-grid`.
- **Sessions** - the member session is sealed with `jose` into an httpOnly cookie and refreshed
  in `proxy.ts`; the cart rides a separate signed cookie and merges into the member cart on
  sign-in. All of it is app-owned - the SDK ships no auth or commerce helpers.

## Add your own block

1. Create `blocks/<name>/block.ts` with `defineBlock({ type, props, component, loader? })`.
2. Add the component next to it.
3. Register it in `cmssy/blocks.ts`.

It then appears in the editor's block picker automatically. Full guide:
[Building blocks](https://www.cmssy.com/docs/block-development).

## Deploy

Use the **Deploy with Vercel** button above, or push to any Node 22+ host. Set the
environment variables in your host's dashboard. After deploying, open the site in the cmssy
editor to start editing visually.

## Learn more

- [cmssy docs](https://www.cmssy.com/docs)
- [Installation](https://www.cmssy.com/docs/installation) · [Quickstart](https://www.cmssy.com/docs/quickstart)
- [Block recipes](https://www.cmssy.com/docs/blocks) · [Theming](https://www.cmssy.com/docs/theming)
