# remix-storefront

A full-featured [React Router 8](https://reactrouter.com) (framework mode, the Remix
lineage) showcase of the headless [cmssy](https://www.cmssy.com) CMS: an editable,
SEO-ready content site **plus a working storefront** with member sign-in, products, cart
and checkout. The same shop as [next-storefront](../next-storefront), on the same
workspace, written the React Router way.

```bash
cp .env.example .env.local
pnpm install && pnpm dev
```

Needs Node 22.22 or newer - react-router 8 says so itself.

> **Try it instantly.** `.env.example` already points at the public demo workspace, so
> `cp .env.example .env.local && pnpm dev` renders real content with no cmssy account.
> `CMSSY_DRAFT_SECRET` is only verified for _draft preview and editing_, which need your own
> workspace, so the placeholder it ships is enough.

> **Deploying?** `CMSSY_SESSION_SECRET` seals the cart and customer session cookies. The
> value in `.env.example` is a placeholder - generate your own before putting this anywhere
> real: `openssl rand -base64 32`.

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
- **Member auth** - app-owned: `app/lib/cmssy/session-crypto.ts` seals a `jose`-signed
  session into an httpOnly cookie, `app/shop/middleware.ts` (React Router middleware)
  refreshes it on every request, and the access token never reaches client JS.
- **Products** - `app/services/catalog.ts` reads the `product` and `category` models
  (server-rendered, filtered by category, brand and stock state).
- **Cart + checkout** - two resource routes, `app/routes/api-cart.ts` and
  `app/routes/api-auth.ts`, told apart by `intent`; the browser calls them from
  `app/lib/actions/`. Optimistic UI with `useOptimistic`, cart bound to a cart cookie and
  merged into the member's cart on sign-in.
- **Order history** - `/account` and `/order/:id`, read through `app/services/orders.ts`.
- **Card payment** - Stripe Checkout in test mode when the three Stripe variables are set;
  `app/routes/stripe-webhook.ts` verifies the signature and records the payment on the
  order. Without them checkout places the order on the invoice (net-30) flow.

The storefront routes (`/c`, `/p`, `/cart`, `/account`, `/order`, `/quick-order`) are plain
app routes, not CMS pages, so they don't consume the workspace's page quota. The catalogue
lives in the `product` data model.

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

| Variable               | Where to find it                                                          |
| ---------------------- | ------------------------------------------------------------------------- |
| `CMSSY_ORG_SLUG`       | cmssy dashboard -> Settings -> Headless                                   |
| `CMSSY_WORKSPACE_SLUG` | cmssy dashboard -> Settings -> Headless                                   |
| `CMSSY_DRAFT_SECRET`   | cmssy dashboard -> Settings -> Headless (generated per workspace)         |
| `CMSSY_SESSION_SECRET` | Generate one: `openssl rand -base64 32`. Seals the member session cookie. |
| `CMSSY_SITE_URL`       | The public origin, used in `sitemap.xml`, `robots.txt` and the payment return link. On Vercel, `VERCEL_PROJECT_PRODUCTION_URL` stands in for it. |

Three more turn on card payment with Stripe Checkout, and only all three together do:

| Variable                | Where to find it                                                                                   |
| ----------------------- | -------------------------------------------------------------------------------------------------- |
| `STRIPE_SECRET_KEY`     | `sk_test_...` from the Stripe dashboard, Developers -> API keys, test mode                         |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` of a webhook endpoint at `<origin>/api/stripe/webhook` subscribed to `checkout.session.completed` and `checkout.session.async_payment_succeeded` |
| `CMSSY_API_TOKEN`       | `cs_...` from cmssy dashboard -> Settings -> API tokens, created by a member whose role can manage orders. Server-only. |

Locally, `stripe listen --forward-to localhost:3000/api/stripe/webhook` prints the webhook
secret to use. Test cards: `4242 4242 4242 4242`, any future date, any CVC. The payment
flow itself is the one [next-storefront](../next-storefront#paying-an-order-with-stripe)
documents - the same `services/payments.ts`, behind a React Router resource route.

## Project structure

```
app/routes.ts            the route config: SEO, API, shop layout, cmssy catch-all
app/root.tsx             middleware, cart + user providers, locale
app/routes/
  page.tsx               every cmssy page (index + catch-all), plus the shop 404
  shop-layout.tsx        header/footer layout blocks around the storefront routes
  catalog.tsx product.tsx cart.tsx account.tsx order.tsx quick-order.tsx
  api-cart.ts api-auth.ts   resource routes behind the cart and auth actions
  stripe-webhook.ts      verifies Stripe's signature, records the payment on the order
  block-data.ts          server loaders for the visual editor
  sitemap.ts robots.ts   SEO built from the workspace's pages plus the catalogue
app/shop/                cookies, the per-request context, the session middleware
app/cmssy/               14 blocks (component + schema + CSS Module), the registry, the editor
app/components/shop/     cart, buy box, account, order and quick-order UI
app/graphql/             one .graphql file per operation + codegen output (committed)
app/services/            pages, site, seo, posts, catalog, cart, auth, orders, payments
app/lib/cmssy/           session sealing, cart + member tokens, request helpers
app/lib/actions/         the browser side of the cart and auth resource routes
app/lib/stripe.ts        the Stripe client, present only when STRIPE_SECRET_KEY is set
cmssy.config.ts          org + workspaceSlug + draftSecret + siteUrl + MEMBER_MODEL_SLUG (the accounts model)
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

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fcmssy-io%2Fexamples%2Ftree%2Fmain%2Fremix-storefront&env=CMSSY_ORG_SLUG,CMSSY_WORKSPACE_SLUG,CMSSY_DRAFT_SECRET,CMSSY_SESSION_SECRET,CMSSY_SITE_URL&envDescription=Your%20cmssy%20org%20slug%2C%20workspace%20slug%20and%20draft%20secret%20from%20Settings%20-%20Headless%2C%20a%20session%20secret%20for%20the%20shop%2C%20plus%20the%20public%20origin%20this%20site%20will%20be%20served%20from.&envLink=https%3A%2F%2Fwww.cmssy.com%2Fdocs%2Fstart%2Finstallation&project-name=cmssy-remix-storefront&repository-name=cmssy-remix-storefront)

Set **Root Directory** to `remix-storefront` - each example in this repo is a standalone app.

`react-router.config.ts` applies the Vercel preset unless `LOCAL_SERVE` is set,
so `pnpm build` produces exactly what Vercel deploys. The preset splits the
server build into per-runtime bundles (`build/server/nodejs_<hash>/index.js`)
that Vercel's builder knows how to find and `react-router-serve` does not - which
is why serving it yourself is `pnpm build:local && pnpm start`, not
`pnpm build && pnpm start`.
