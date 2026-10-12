# remix-storefront

A [React Router 8](https://reactrouter.com) (framework mode, the Remix lineage) showcase of
the headless [cmssy](https://www.cmssy.com) CMS: an editable, SEO-ready content site **plus
the storefront surface a headless shop needs from its framework** - catalogue, product pages,
a guest cart and checkout - on the same workspace as [next-storefront](../next-storefront)
and [astro-storefront](../astro-storefront), written the React Router way: resource routes,
middleware-held request context, locale prefix routing.

The full shop lives in [next-storefront](../next-storefront): member accounts and the sealed
session, order history, quick order, card payment. This example stops where the
framework-specific work stops, so what is left is what a React Router developer has to write
to put cmssy content and commerce on React Router - see
[What this example leaves out](#what-this-example-leaves-out).

```bash
cp .env.example .env.local
pnpm install && pnpm dev
```

Needs Node 22.22 or newer - react-router 8 says so itself.

> **Try it instantly.** `.env.example` already points at the public demo workspace, so
> `cp .env.example .env.local && pnpm dev` renders real content with no cmssy account.
> `CMSSY_DRAFT_SECRET` is only verified for _draft preview and editing_, which need your own
> workspace, so the placeholder it ships is enough.

## What's inside

### Content site

- `app/routes/page.tsx` - the cmssy page. `createCmssyLoader` fetches it, and a
  **verified** editor request (`cmssyEdit=1` + a matching `cmssySecret`) renders the same
  page through the edit bridge.
- `headers` - the CSP that lets the admin frame your site. Drop it and the editor is an
  empty box with no error anywhere.
- **Fourteen blocks** in `app/cmssy/`, each with its field schema next to the component and
  a co-located CSS Module: `hero`, `prose` (sanitized server-side), `faq`, `value-props`,
  `stats-band`, `feature-media`, `cta-banner`, `promo-strip`, `blog-index`,
  `category-grid`, `product-grid`, `shop-hero`, and the two layout blocks `site-header`
  and `site-footer`, editable in place.
- `app/routes/sitemap.ts`, `app/routes/robots.ts` - SEO is the app's own code. The sitemap
  lists every published page and the catalogue (`/c/*`, `/p/*`), once per enabled language
  with `hreflang` alternates, and drops drafts and the workspace's 404 page.
- **Locale prefix routing** - every shop route is mounted twice, at its own path and under
  `:locale/`. `/no/cart` is the Norwegian cart; `/xx/cart` is a 404 with the chrome still
  around it, because only a language the workspace enables (and is not the default) is a
  prefix. CI asserts exactly those two; `/no/c/all` works the same way but renders the
  catalogue, the most expensive page against the delivery rate limit.

### Storefront

A headless commerce flow written against the delivery API - the SDK stops at the gateway,
so every read and write here is this app's own typed GraphQL:

- **Typed queries** - `app/graphql/**/*.graphql` → `pnpm codegen` → `app/services/*.ts`.
  A field the API does not have is a build error, not a runtime `undefined`.
- **Products** - `app/services/catalog.ts` reads the `product` and `category` models
  (server-rendered, filtered by category, brand and stock state).
- **Cart + checkout** - one resource route, `app/routes/api-cart.ts`, whose actions are
  told apart by `intent`; the browser calls it from `app/lib/actions/cart.ts`. Optimistic
  UI with `useOptimistic`; the cart is bound to an httpOnly cart cookie that
  `app/shop/middleware.ts` (React Router middleware) reads into the request context and
  `app/shop/context.ts` mints on the first write. The middleware appends the `Set-Cookie`
  on the way out, `Secure` when the request came in over https - by the URL, or by
  `x-forwarded-proto` behind a TLS-terminating proxy.
- **Order receipt** - checkout answers with the order and its one-time access token, and
  `/order/:id?token=…` renders the receipt from `public.order.byToken`. That link is the
  guest's only way back to the order, and the page says so.

The storefront routes (`/c`, `/p`, `/cart`, `/order`) are plain app routes, not CMS pages,
so they don't consume the workspace's page quota. The catalogue lives in the `product` data
model.

### What this example leaves out

Everything beyond the guest cart and checkout - the screens [next-storefront](../next-storefront)
shows once - is deliberately not here:

- **Member sign-in and registration** - the sealed `jose` session cookie, its refresh in
  middleware, and the `siteMember.*` mutations behind it.
- **Order history** - `/account`, and `account.orders` / `account.order` read with the
  member's token. Here `/order/:id` is reachable by access token only.
- **Quick order** by SKU.
- **Card payment** - Stripe Checkout and the webhook that records the payment on the order.
  Checkout here places the order on the invoice (net-30) flow. Deploying this over a version
  that had Stripe configured? Delete that deployment's Stripe webhook endpoint and drop
  `STRIPE_*` and `CMSSY_SESSION_SECRET` from the project: a Checkout session opened before the
  switch has nowhere left to report its payment. `CMSSY_API_TOKEN` can stay - the cart uses it
  now (see Environment).

`/account` and `/quick-order` answer a 404 card that says where those screens live - the
demo content still links to them - and CI asserts the 404, as it does for the deleted API
routes and actions: a 200 there would mean the cut grew back. None of it needs anything from React Router that the
cart does not already show - middleware, a resource route, a cookie - which is why one copy
of it, in Next, is enough.

## Why there is no `/cmssy-edit` route here

The Next adapter needs one because a Next page can be **static**, and a static page never
sees the query string that would put it in edit mode. React Router renders on every
request, so the editor is served from the page itself - verified the same way, on the same
protocol, with less machinery.

## Generators

Two generators, both committed so a fresh clone builds without running either:

| Command        | Reads                        | Writes                   |
| -------------- | ---------------------------- | ------------------------ |
| `pnpm codegen` | the live delivery **schema** | `app/graphql/generated/` |
| `pnpm types`   | the workspace's **models**   | `app/graphql/models.ts`  |

Re-run `codegen` after editing a `.graphql` file, and `types` after changing a model in the
CMS - then `pnpm typecheck`, which runs `react-router typegen` and then `tsc`, so a route's
loader data and its `meta` agree.

### Environment

| Variable               | Where to find it                                                                                                              |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `CMSSY_ORG_SLUG`       | cmssy dashboard -> Settings -> Headless                                                                                       |
| `CMSSY_WORKSPACE_SLUG` | cmssy dashboard -> Settings -> Headless                                                                                       |
| `CMSSY_DRAFT_SECRET`   | cmssy dashboard -> Settings -> Headless (generated per workspace)                                                             |
| `CMSSY_SITE_URL`       | The public origin, published in `sitemap.xml` and `robots.txt`. On Vercel, `VERCEL_PROJECT_PRODUCTION_URL` stands in for it. |
| `CMSSY_RETRY_MODE`     | Optional: `build` or `interactive`, applied to every delivery request. CI sets `build` (see the root README); unset, the framework default applies. |
| `CMSSY_API_TOKEN`      | Optional, server-only: a `cs_...` API token of this workspace (cmssy dashboard -> Settings -> API tokens). Set, the cart calls forward each shopper's address with it, so cmssy's per-address cart limits count shoppers rather than this server; unset, every shopper shares this server's budget. The address is the first `x-forwarded-for` hop, so the host must set that header itself (Vercel does). |

## Project structure

```
app/routes.ts            the route config: SEO, API, shop layout, cmssy catch-all
app/root.tsx             middleware, the cart provider, locale
app/routes/
  page.tsx               every cmssy page (index + catch-all), plus the shop 404
  shop-layout.tsx        header/footer layout blocks around the storefront routes
  catalog.tsx product.tsx cart.tsx order.tsx
  api-cart.ts            the resource route behind the cart actions
  block-data.ts          server loaders for the visual editor
  sitemap.ts robots.ts   SEO built from the workspace's pages plus the catalogue
app/shop/                the cart cookie, the per-request context, the shop middleware
app/cmssy/               14 blocks (component + schema + CSS Module), the registry, the editor
app/components/shop/     cart, buy box, catalogue and order receipt UI
app/graphql/             one .graphql file per operation + codegen output (committed)
app/services/            pages, site, seo, posts, catalog, cart, orders
app/lib/cmssy/           the cart token, the cart request helper, the retry mode, the shipping address parser
app/lib/actions/         the browser side of the cart resource route
cmssy.config.ts          org + workspaceSlug + draftSecret + siteUrl
codegen.ts               types the .graphql files against the live delivery schema
app/styles/              plain CSS - cmssy does not control styling (no Tailwind)
```

## Prove the editor works

```bash
pnpm build:local && pnpm start &
pnpm smoke:edit
```

A build proves the site compiles. It says nothing about whether the site can be
**edited** - and that is the part that breaks silently.

## Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fcmssy-io%2Fexamples%2Ftree%2Fmain%2Fremix-storefront&env=CMSSY_ORG_SLUG,CMSSY_WORKSPACE_SLUG,CMSSY_DRAFT_SECRET,CMSSY_SITE_URL&envDescription=Your%20cmssy%20org%20slug%2C%20workspace%20slug%20and%20draft%20secret%20from%20Settings%20-%20Headless%2C%20plus%20the%20public%20origin%20this%20site%20will%20be%20served%20from.&envLink=https%3A%2F%2Fwww.cmssy.com%2Fdocs%2Fstart%2Finstallation&project-name=cmssy-remix-storefront&repository-name=cmssy-remix-storefront)

Set **Root Directory** to `remix-storefront` - each example in this repo is a standalone app.

`react-router.config.ts` applies the Vercel preset unless `LOCAL_SERVE` is set,
so `pnpm build` produces exactly what Vercel deploys. The preset splits the
server build into per-runtime bundles (`build/server/nodejs_<hash>/index.js`)
that Vercel's builder knows how to find and `react-router-serve` does not - which
is why serving it yourself is `pnpm build:local && pnpm start`, not
`pnpm build && pnpm start`. The cart cookie is `Secure` when the request arrived over https -
read from the URL, or from `x-forwarded-proto` behind a TLS-terminating proxy - so the cart
works on `pnpm start` over plain http as it does behind Vercel's TLS.
