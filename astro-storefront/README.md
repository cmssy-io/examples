# astro-storefront

A full-featured [Astro 7](https://astro.build) showcase of the headless
[cmssy](https://www.cmssy.com) CMS: an editable, SEO-ready content site **plus a working
storefront** with member sign-in, products, cart and checkout. The same shop as
[next-storefront](../next-storefront) and [remix-storefront](../remix-storefront), on the
same workspace, written the Astro way: every page is server HTML, and only the parts that
need a browser - the header's cart button, the buy box, the cart drawer - hydrate as islands.

```bash
cp .env.example .env.local
pnpm install && pnpm dev
```

Needs Node 22.13 or newer - the astro 7 compiler asks for 22.12, and the pinned pnpm refuses to run below 22.13.

> **Try it instantly.** `.env.example` already points at the public demo workspace, so
> `cp .env.example .env.local && pnpm dev` renders real content with no cmssy account.
> `CMSSY_DRAFT_SECRET` is only verified for _draft preview and editing_, which need your own
> workspace, so the placeholder it ships is enough.

> **Deploying?** `CMSSY_SESSION_SECRET` seals the cart and customer session cookies. The
> value in `.env.example` is a placeholder - generate your own before putting this anywhere
> real: `openssl rand -base64 32`.

This app talks to cmssy through `@cmssy/astro`, which depends on `@cmssy/core` and nothing
else - no React in the data path, no Next anywhere. A test in the SDK fails the build if that
ever stops being true.

## What's inside

### Content site

- `src/middleware.ts` - two middlewares in sequence. The shop's (`src/shop/middleware.ts`)
  reads the cart cookie and restores the member session into `Astro.locals.shop`, refreshing
  it when the access token has expired. Then `cmssyMiddleware` from `@cmssy/astro` resolves
  the language and strips its prefix (`/no/c/bearings` renders `src/pages/c/[slug].astro`
  with the locale set), routes a verified editor request to `/cmssy-edit`, and applies the
  CSP that lets the admin frame the site.
- `src/pages/[...path].astro` - the public cmssy page. React blocks rendered on the server,
  **zero client JS** beyond the header and cart-drawer islands.
- `src/pages/cmssy-edit/[...path].astro` - the editor route. The edit bridge is a React
  island, because the editor talks over `postMessage` - and that protocol lives in
  `@cmssy/core`, not in React.
- **Fourteen blocks** in `src/cmssy/`, each with its field schema next to the component and
  a co-located CSS Module: `hero`, `prose` (sanitized server-side), `faq`, `value-props`,
  `stats-band`, `feature-media`, `cta-banner`, `promo-strip`, `blog-index`,
  `category-grid`, `product-grid`, `shop-hero`, and the two layout blocks `site-header`
  and `site-footer`, editable in place.
- `src/pages/sitemap.xml.ts`, `src/pages/robots.txt.ts` - SEO is the app's own code. The
  sitemap lists every published page and the catalogue (`/c/*`, `/p/*`), once per enabled
  language with `hreflang` alternates, and drops drafts and the workspace's 404 page.

### Storefront

A headless commerce flow written against the delivery API - the SDK stops at the gateway,
so every read and write here is this app's own typed GraphQL:

- **Typed queries** - `src/graphql/**/*.graphql` → `pnpm codegen` → `src/services/*.ts`.
  A field the API does not have is a build error, not a runtime `undefined`.
- **Member auth** - app-owned: `src/lib/cmssy/session-crypto.ts` seals a `jose`-signed
  session into an httpOnly cookie, the shop middleware refreshes it on every request, and
  the access token never reaches client JS.
- **Products** - `src/services/catalog.ts` reads the `product` and `category` models.
  `/c/[slug]` renders facets, sort and pager as plain server markup; only the grid is an
  island, for quick-add.
- **Cart + checkout** - [Astro Actions](https://docs.astro.build/en/guides/actions/) in
  `src/actions/index.ts`: `actions.cart.*` and `actions.auth.*`, inputs typed with
  `astro/zod`, failures thrown as `ActionError`. The islands call them through
  `src/lib/actions/`, which turns the `{ data, error }` result back into a thrown error so
  the UI code reads the same as in the Next and Remix shops. Optimistic UI with
  `useOptimistic`, cart bound to a cart cookie and merged into the member's cart on sign-in.
- **Order history** - `/account` and `/order/[id]`, read through `src/services/orders.ts`.
- **Card payment** - Stripe Checkout in test mode when the three Stripe variables are set;
  `src/pages/api/stripe/webhook.ts` verifies the signature and records the payment on the
  order. Without them checkout places the order on the invoice (net-30) flow.

The storefront routes (`/c`, `/p`, `/cart`, `/account`, `/order`, `/quick-order`) are plain
Astro pages, not CMS pages, so they don't consume the workspace's page quota. The catalogue
lives in the `product` data model.

### Islands, and what stays on the server

React context does not cross an island boundary - each `client:load` component is its own
React root. So the state that several islands share lives in two
[nanostores](https://github.com/nanostores/nanostores) atoms instead of a provider:
`src/components/shop/cart-store.ts` (the cart, plus `useCart()` with its optimistic
updates) and `cart-ui.ts` (drawer open, "added" toast). The header's cart count, the buy
box and the drawer read the same atom.

What each island needs from the request - locale, signed-in user, the cart the server
already fetched - is computed once in `src/shop/page-state.ts` and passed as a `shop` prop.
`src/components/shop/island.tsx` wraps it in the locale and user providers, and
`shopIsland(Component)` is how every entry in `src/islands/` gets that wrapper. A component
that calls a shop hook only ever renders under one of those roots; the server-rendered
parts (`Blocks.tsx`, the footer `Region`) get a `LocaleProvider` and nothing more.

| Hydrates (`src/islands/`)                                          | Server HTML                         |
| ------------------------------------------------------------------ | ----------------------------------- |
| header region - the two layout blocks, for cart button + mega menu | every page block, the footer region |
| cart drawer, cart view, buy box, catalog grid, quick order         | catalogue facets, sort, pager       |
| account panel, order history, pay button                           | product gallery, specs, prose       |

One deliberate difference from the Next and Remix shops: the homepage product grid links
through to the product page instead of quick-adding. Quick add is a hook-using button, and
hydrating a page block to get it would make every page that uses the grid ship React. It
lives on the catalogue and product pages, where the grid is already an island.

## Generators

Two generators, both committed so a fresh clone builds without running either:

| Command        | Reads                        | Writes                   |
| -------------- | ---------------------------- | ------------------------ |
| `pnpm codegen` | the live delivery **schema** | `src/graphql/generated/` |
| `pnpm types`   | the workspace's **models**   | `src/graphql/models.ts`  |

Re-run `codegen` after editing a `.graphql` file, and `types` after changing a model in the
CMS - then `pnpm typecheck`, which runs `astro check` and covers the `.astro` files too
(`astro build` does not typecheck them). CI fails if either output is stale, and if
`@cmssy/cli` drifts from the `@cmssy/core` version the app runs.

### Environment

| Variable               | Where to find it                                                                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `CMSSY_ORG_SLUG`       | cmssy dashboard -> Settings -> Headless                                                                                                          |
| `CMSSY_WORKSPACE_SLUG` | cmssy dashboard -> Settings -> Headless                                                                                                          |
| `CMSSY_DRAFT_SECRET`   | cmssy dashboard -> Settings -> Headless (generated per workspace)                                                                                |
| `CMSSY_SESSION_SECRET` | Generate one: `openssl rand -base64 32`. Seals the member session cookie.                                                                        |
| `CMSSY_SITE_URL`       | The public origin, used in `sitemap.xml`, `robots.txt` and the payment return link. On Vercel, `VERCEL_PROJECT_PRODUCTION_URL` stands in for it. |

Three more turn on card payment with Stripe Checkout, and only all three together do:

| Variable                | Where to find it                                                                                                                                             |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `STRIPE_SECRET_KEY`     | `sk_test_...` from the Stripe dashboard, Developers -> API keys, test mode                                                                                   |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` of a webhook endpoint at `<origin>/api/stripe/webhook` subscribed to `checkout.session.completed` and `checkout.session.async_payment_succeeded` |
| `CMSSY_API_TOKEN`       | `cs_...` from cmssy dashboard -> Settings -> API tokens, created by a member whose role can manage orders. Server-only.                                      |

Locally, `stripe listen --forward-to localhost:4321/api/stripe/webhook` prints the webhook
secret to use. Test cards: `4242 4242 4242 4242`, any future date, any CVC. The payment
flow itself is the one [next-storefront](../next-storefront#paying-an-order-with-stripe)
documents - the same `services/payments.ts`, behind an Astro endpoint.

## Project structure

```
src/middleware.ts        shop session middleware, then the cmssy adapter middleware
src/actions/index.ts     Astro Actions: cart.* and auth.*, the only writes the browser can make
src/pages/
  [...path].astro        every cmssy page (index + catch-all), plus the shop 404
  cmssy-edit/            the editor route, bridge as a React island
  c/[slug].astro p/[slug].astro cart.astro account.astro order/[id].astro quick-order.astro
  api/cmssy/block-data.ts   server loaders for the visual editor
  api/stripe/webhook.ts  verifies Stripe's signature, records the payment on the order
  sitemap.xml.ts robots.txt.ts   SEO built from the workspace's pages plus the catalogue
src/layouts/shop-layout.astro   header island + footer region around the storefront pages
src/islands/             the client:load entry points, one per interactive surface
src/shop/                cookies, the per-request context, the session middleware, page state
src/cmssy/               14 blocks (component + schema + CSS Module), the registry, the editor
src/components/shop/     cart, buy box, account, order and quick-order UI; the nanostores
src/graphql/             one .graphql file per operation + codegen output (committed)
src/services/            pages, site, seo, posts, catalog, cart, auth, orders, payments
src/lib/cmssy/           session sealing, cart + member tokens, request helpers
src/lib/actions/         the browser side of the cart and auth actions
src/lib/stripe.ts        the Stripe client, present only when STRIPE_SECRET_KEY is set
src/cmssy.config.ts      org + workspaceSlug + draftSecret + siteUrl + MEMBER_MODEL_SLUG (the accounts model)
codegen.ts               types the .graphql files against the live delivery schema
src/styles/              plain CSS - cmssy does not control styling (no Tailwind)
```

## Prove the editor works

```bash
pnpm dev &
SMOKE_BASE_URL=http://localhost:4321 pnpm smoke:edit
```

A build cannot tell you whether the editor lives. This can. It needs a server
already running and the base URL to point at - as an argument or in
`SMOKE_BASE_URL`. `CMSSY_DRAFT_SECRET` comes from `.env.local`, which the script
loads itself.

## Deploy

[![Deploy with Vercel](https://vercel.com/button)](<https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fcmssy-io%2Fexamples%2Ftree%2Fmain%2Fastro-storefront&env=CMSSY_ORG_SLUG,CMSSY_WORKSPACE_SLUG,CMSSY_DRAFT_SECRET,CMSSY_SESSION_SECRET,CMSSY_SITE_URL&envDescription=Your%20cmssy%20org%20slug%2C%20workspace%20slug%20and%20draft%20secret%20from%20Settings%20-%20Headless%2C%20a%20session%20secret%20of%20your%20own%20(openssl%20rand%20-base64%2032)%20and%20the%20public%20origin%20this%20site%20will%20be%20served%20from.&envLink=https%3A%2F%2Fwww.cmssy.com%2Fdocs%2Fstart%2Finstallation&project-name=cmssy-astro-storefront&repository-name=cmssy-astro-storefront>)

Set **Root Directory** to `astro-storefront` - each example in this repo is a standalone app.

`astro.config.mjs` uses the Vercel adapter unless `LOCAL_SERVE` is set, so `pnpm build`
produces exactly what Vercel deploys. That adapter has no `preview` command, which is
why serving the build yourself is `pnpm build:local && pnpm start` - it swaps in the
Node adapter for that one build.

`sanitize-html` is bundled into the server function (`vite.ssr.noExternal`) rather than
loaded from `node_modules`: it is CommonJS and `require()`s `htmlparser2`, which is ESM-only,
and Vercel's Node 22 function runtime refuses that where a plain `node` does not.
