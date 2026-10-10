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

| Command        | Reads                        | Writes               |
| -------------- | ---------------------------- | -------------------- |
| `pnpm codegen` | the live delivery **schema** | `graphql/generated/` |
| `pnpm types`   | the workspace's **models**   | `graphql/models.ts`  |

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

Three more turn on card payment with Stripe Checkout; without them checkout places the order and
the confirmation page reads "awaiting payment", which is the net-30 flow:

| Variable                | Where to find it                                                                                   |
| ----------------------- | -------------------------------------------------------------------------------------------------- |
| `STRIPE_SECRET_KEY`     | `sk_test_...` from the Stripe dashboard, Developers -> API keys, test mode                         |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` of a webhook endpoint at `<origin>/api/stripe/webhook` for `checkout.session.completed` |
| `CMSSY_API_TOKEN`       | `cs_...` from cmssy dashboard -> Settings -> API tokens, created by a member whose role can manage orders; the token acts as that member. Server-only. |

### Paying an order with Stripe

cmssy is the order record and never holds a payment key. The storefront does the paying and
reports back:

1. `checkoutAction` places the order through `cart.checkout` - the order exists, unpaid, before any
   money moves. With `STRIPE_SECRET_KEY` set it then opens a Stripe Checkout Session for the order's
   total, with the cmssy order id in the session metadata, and the browser is sent to Stripe.
2. Stripe calls `POST /api/stripe/webhook`. The route verifies the signature with
   `STRIPE_WEBHOOK_SECRET`, reads the order id back out of the session, and records the payment on
   the order with the admin mutation `order.recordPayment`, authenticated with `CMSSY_API_TOKEN`.
   The mutation is idempotent on the payment reference, so a retried webhook records nothing twice.
3. The confirmation page the buyer returns to reads `paymentStatus` from cmssy, so it shows "Paid"
   once the webhook has landed, and a "Pay now" button while the balance is still due - on the
   guest confirmation page and on a signed-in member's order page alike. "Pay now" reuses the
   order's open Checkout Session when one exists, expires it when the balance changed, and creates
   the new one under an idempotency key for that order and amount, so a double click mints one
   session, not two. Before the browser leaves for Stripe, the confirmation URL is pushed onto the
   history, so Back from Stripe lands on the order, not on an empty cart.

What cmssy refuses, the webhook does not retry: a canceled order, an amount above the balance or an
unknown order come back from `recordPayment` as a GraphQL error with `BAD_USER_INPUT` or
`NOT_FOUND`, which the route answers with 200 and `handled: false`, logged. Anything else - a
revoked token, a role without `orders:manage`, a write conflict, a transport failure - is a 500,
which is what makes Stripe try again. The amount recorded is the one in the order's currency:
`currency_conversion.amount_total` when Stripe presented the buyer another currency, `amount_total`
otherwise. `recordPayment` lives in the admin schema, outside the delivery codegen this app types
its other operations against, so `services/payments.ts` carries that one mutation by hand.

Locally, `stripe listen --forward-to localhost:3000/api/stripe/webhook` prints the webhook secret to
use. Test cards: `4242 4242 4242 4242`, any future date, any CVC.

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
app/api/stripe/webhook/  verifies Stripe's signature, records the payment on the order
app/sitemap.ts robots.ts SEO built from the workspace's pages plus the catalogue
blocks/                  14 blocks; each is block.ts + Component.tsx + CSS Module
cmssy/
  blocks.ts              the block registry (single source of truth)
  editor.tsx             lazy-loads blocks for the visual editor
  editable-layout.tsx    mounts header/footer through the edit bridge
graphql/                 one .graphql file per operation + codegen output (committed)
services/                pages, site, layout, seo, cart, auth, orders, payments
lib/cmssy/               session sealing, cart + member tokens, request helpers
lib/actions/             Server Actions for cart, checkout + payment and auth
lib/stripe.ts            the Stripe client, present only when STRIPE_SECRET_KEY is set
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

Use the **Deploy with Vercel** button above, or push to any Node 22.13+ host. Set the
environment variables in your host's dashboard. After deploying, open the site in the cmssy
editor to start editing visually.

## Learn more

- [cmssy docs](https://www.cmssy.com/docs)
- [Installation](https://www.cmssy.com/docs/installation) · [Quickstart](https://www.cmssy.com/docs/quickstart)
- [Block recipes](https://www.cmssy.com/docs/blocks) · [Theming](https://www.cmssy.com/docs/theming)
