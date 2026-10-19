# next-storefront

A full-featured [Next.js](https://nextjs.org) (App Router) showcase of the headless
[cmssy](https://www.cmssy.com) CMS: an editable, SEO-ready content site **plus a working
storefront** with member sign-in, products, cart and checkout.

> Looking for a blank slate to build on? Use
> **[simple-blog](../simple-blog)** - the minimal
> clone-and-grow template. This repo is the _demo_: it shows what the SDK can do.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fcmssy-io%2Fexamples%2Ftree%2Fmain%2Fnext-storefront&env=CMSSY_ORG_SLUG,CMSSY_WORKSPACE_SLUG,CMSSY_DRAFT_SECRET,CMSSY_SESSION_SECRET&envDescription=Your%20cmssy%20org%20slug,%20workspace%20slug%20and%20draft%20secret%20from%20Settings%20-%20Headless,%20plus%20a%20session%20secret%20for%20the%20shop&envLink=https%3A%2F%2Fwww.cmssy.com%2Fdocs%2Fstart%2Finstallation&project-name=cmssy-next-storefront&repository-name=cmssy-next-storefront)

> **Try it instantly.** `.env.example` already points at the public demo workspace, so
> `cp .env.example .env.local && pnpm dev` renders real content with no cmssy account.
> `CMSSY_DRAFT_SECRET` is required by the config but is only verified for _draft preview_
> (which needs your own workspace), so the placeholder it ships is enough - it is 16+
> characters, which `/api/draft` requires of any secret before it will run. For your own
> site, use the real secret generated under **Settings → Headless**.

> **Deploying?** `CMSSY_SESSION_SECRET` seals the customer session cookie; the cart cookie is a random token minted on the first cart write. The value in
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
  cart bound to a random cart token, minted on the first write and merged into the member's cart on sign-in.
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

Three more turn on card payment with Stripe Checkout, and only all three together do: with one or
two of them set the shop stays on the invoice flow, so a buyer can never pay on Stripe while the
webhook has no secret or no token to record the payment with. Without them checkout places the
order and the confirmation page reads "awaiting payment", which is the net-30 flow:

| Variable                | Where to find it                                                                                   |
| ----------------------- | -------------------------------------------------------------------------------------------------- |
| `STRIPE_SECRET_KEY`     | `sk_test_...` from the Stripe dashboard, Developers -> API keys, test mode                         |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` of a webhook endpoint at `<origin>/api/stripe/webhook` subscribed to `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `refund.created` and `refund.updated` |
| `CMSSY_API_TOKEN`       | `cs_...` from cmssy dashboard -> Settings -> API tokens, created by a member whose role can manage orders; the token acts as that member. Server-only. Cart, checkout, order and member-auth calls also send it with the shopper's address, so cmssy's per-address limits count each shopper rather than this server; without it every shopper shares the server's budget. The address is the first `x-forwarded-for` hop, else `x-real-ip`, so deploy behind a proxy that overwrites both with the connecting address (Vercel does); behind one that passes a client's value through, a shopper can pick the address cmssy counts them under. |

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
   order's open Checkout Session when one exists (looked up among the buyer's open sessions, by
   `customer_details.email`), expires it when the balance changed, and creates the new one under an
   idempotency key for that order, amount and the session it supersedes, so a double click mints
   one session, not two; a concurrent create in another locale trips Stripe's idempotency check and
   falls back to the session the first request made. Before the browser leaves for Stripe, the
   confirmation URL is pushed onto the history, so Back from Stripe lands on the order, not on an
   empty cart.

What cmssy refuses, the webhook does not retry: a canceled order, an amount above the balance or an
unknown order come back from `recordPayment` as a GraphQL error with `BAD_USER_INPUT` or
`NOT_FOUND`, which the route answers with 200 and `handled: false`, logged. Anything else - a
revoked token, a role without `orders:manage`, a write conflict, a transport failure - is a 500,
which is what makes Stripe try again. The amount recorded is the one in the order's currency:
`currency_conversion.amount_total` when Stripe presented the buyer another currency, `amount_total`
otherwise. `recordPayment` lives in the admin schema, outside the delivery codegen this app types
its other operations against, so `services/payments.ts` carries that one mutation by hand.

#### Refunds, either way

A refund can start on either side, and each side learns of the other's:

- **Refunded in the Stripe Dashboard.** `refund.created` and `refund.updated` reach the same Stripe
  webhook. Once the refund has `succeeded`, the route reads the order id from its PaymentIntent and
  records it with `order.refund`, the Stripe refund id as the reference - cmssy ignores a reference
  it already holds, so both events and every retry record it once. The route then tags the Stripe
  refund `recordedIn: cmssy`: that is how a refund that fails after it settled stays counted, and
  the update event the tag itself fires is skipped.
- **Refunded in cmssy** (the order's Refund button, or `refund_order` over MCP). cmssy sends
  `order.refunded` or `order.partially_refunded`; `services/refunds.ts` reads the order's payments
  and refunds on Stripe what cmssy has refunded beyond the Stripe refunds already pending,
  settled or known to cmssy, reading every page of the list. The refund carries `origin: cmssy` in its metadata, so the Stripe webhook that follows
  does not record it a second time. The idempotency key names the PaymentIntent and the amount
  Stripe already held, so two refund events racing each other cannot both refund the same money:
  the second trips Stripe's idempotency check, answers 500, and on cmssy's retry finds the first
  refund and refunds only what is still owed.

An order paid any other way than Stripe - a wire recorded by hand, say - is left alone: cmssy
records the refund, and the money goes back however it came. So is an order the buyer paid in
another currency than the order's (Stripe Adaptive Pricing): Stripe refunds in the currency charged,
cmssy counts in the order's, and turning one into the other is a decision, not arithmetic - the
route logs it for a person to settle. A refund Stripe refuses (more than the charge holds) is
logged and not retried. A refund cmssy started that then fails on Stripe stays counted as sent, so
the next refund event does not quietly send that money again; the failure is logged for a person.
The same goes for a Dashboard refund that fails after it settled: cmssy keeps counting it, and the
warning says so.

Locally, `stripe listen --forward-to localhost:3000/api/stripe/webhook` prints the webhook secret to
use. Test cards: `4242 4242 4242 4242`, any future date, any CVC.

### Shipping a paid order with Shippo

cmssy holds no carrier account either. It sends `order.paid` to a workspace webhook; this app books
the parcel with the carrier and writes the tracking number back as a shipment on the order, so the
buyer's order page shows it.

| Variable | What it is |
| --- | --- |
| `CMSSY_WEBHOOK_SECRET` | signing secret of a cmssy webhook at `<origin>/api/cmssy/webhook` subscribed to `order.paid`, `shipment.label_requested`, `order.refunded` and `order.partially_refunded` (Settings -> Webhooks) |
| `SHIPPO_API_TOKEN` | Shippo API token (Settings -> API). A `shippo_test_` token buys free test labels on Shippo's own carrier accounts; DHL Express needs "Activate Account" under Settings -> Carriers first |
| `SHIPPO_ADDRESS_FROM_US`, `SHIPPO_ADDRESS_FROM_DE` | `object_id` of a Shippo address for each warehouse, created once with `POST /addresses`. A warehouse without one is off |
| `SHIPPO_CUSTOMS_SIGNER` | the name that certifies the customs declaration on parcels leaving the EU or the US; without it those parcels are refused |
| `SHIPPO_WEBHOOK_TOKEN` | a random string. In Shippo (Settings -> Webhooks) point `track_updated` and `transaction_created` at `<origin>/api/shippo/webhook?token=<it>`; without it the route answers 503 |

`CMSSY_API_TOKEN` from the Stripe section is needed too: it reads the order and records the parcel.
Without them shipping is simply off, and orders are left for a person to ship.

Which carrier ships an order is decided by the shipping method the buyer chose and the destination
country, in `SHIPPING_ROUTES` in `lib/shipping.ts`:

| Shipping method id | Destination | Carrier |
| --- | --- | --- |
| `us-ground`, `us-priority` | US | USPS Ground Advantage, Priority Mail, from the US warehouse |
| `dhl-express` | Nordics, UK, much of the EU | DHL Express Worldwide, from the US warehouse |
| `nordic-letter` | NO, SE, DK, FI | Deutsche Post Maxibrief Plus, from the German warehouse |

Anything else - pickup, pallets, a courier to another country - is left alone. A parcel is booked as
one box of the route's size: `DEFAULT_PARCEL` (5 kg, 40 x 30 x 20 cm), or `SMALL_PARCEL` (1.5 kg,
30 x 20 x 10 cm) for the letter service. The webhook carries no weights, and a real shop would size
it from its own product data.

Shippo picks no carrier on its own here: the route names the service level, the app asks Shippo for
rates and buys exactly that one, and an order the service cannot take (no rate offered) is refused.
A parcel leaving the EU or the US carries a customs declaration built from the order lines, with
the parcel weight spread over the units. The shipment is recorded under the real carrier - USPS,
DHL Express, Deutsche Post - with the Shippo transaction id in its note.

No label is bought before the parcel is claimed. The route reads the order back from the admin API
and calls `createShipment` with an `idempotencyKey` (`<provider>:<order id>:<carrier>`) and a note
carrying a random claim token. cmssy keeps at most one shipment per key, so of two deliveries of the
same webhook only one finds its own token on the parcel and books; the other answers 503 with
`Retry-After: 60`. A redelivery then finds the claimed parcel and acts on it:

| The claimed parcel | What the route does |
| --- | --- |
| has a tracking number | nothing - already shipped |
| notes a Shippo transaction id | asks Shippo for the tracking number and fills it in (a label Shippo queued gets it a few seconds later) |
| notes that the carrier did not make the booking (it answered 5xx or 429) | books again on the same parcel |
| is still a bare claim younger than two minutes | 503 - another delivery is booking it |
| is a bare claim older than that | marks it `exception` for a person: the booking may or may not exist at the carrier, and buying again could pay for two labels |
| is `exception` | nothing - it waits for a person (see below) |

A carrier refusing the booking (a bad postcode, a street without a building number, no rate for the
service) marks the parcel `exception` with the reason and is answered 200 with `handled: false` - a
retry would be refused the same way. A carrier outage is noted on the parcel and answered 500, and
cmssy tries again. A parcel of that carrier recorded by hand, without the key, is left alone.

When the carrier refuses a booking, a person fixes the order (the address, usually) and presses **Retry label purchase** on the parcel in the admin. cmssy sends `shipment.label_requested`; the app claims the next attempt under the key with `:2`, `:3`... appended and books it - only when the event names the latest attempt and that attempt is `canceled`, so a redelivered request never starts a second one, and never when a parcel of that carrier was recorded by hand. cmssy marks the refused parcel `canceled`; it stays on the order as its record. Only one delivery wins each attempt's key, so a double press or a redelivery buys one label.

Each bought label's PDF is recorded on the parcel as `labelUrl`; the admin shows **Print label** for it.

### Following the parcel

Once a label has a tracking number the app registers it with Shippo (`POST /tracks`) under the
attempt's key, and stamps the same key on the label itself. Shippo then calls
`/api/shippo/webhook`, authenticated by the `token` in its URL, and the app writes what it says on
the parcel the key names:

| Shippo sends | The parcel |
| --- | --- |
| `track_updated` `PRE_TRANSIT` | `pending` |
| `track_updated` `TRANSIT` | `in_transit`; `out_for_delivery` for that substatus; `exception` when the carrier needs action (a bad address) |
| `track_updated` `DELIVERED` / `RETURNED` / `FAILURE` | `delivered` / `returned` / `exception` |
| `track_updated` `UNKNOWN` | unchanged |
| `transaction_created` for a parcel with no tracking number | gets the label, tracking number and `pending` - the label whose booking answer was lost, so a parcel flagged *outcome unknown* recovers by itself |
| `transaction_created` for a `canceled` attempt | a note to refund that label in Shippo - two labels were bought |

The carrier's own wording lands in the parcel's history. A parcel never moves back (a late
`TRANSIT` after `DELIVERED` is ignored), and a canceled one is left alone. Each write carries the
parcel's `updatedAt` as the app read it (`expectedUpdatedAt`): when two deliveries race, cmssy
refuses the later one with `VERSION_CONFLICT`, the route answers 500, and Shippo's retry reads the
parcel again.

With a `shippo_test_` token the app registers no tracking: Shippo's test mode tracks only its own
`shippo` test numbers and replaces their metadata, so no update could find a parcel. cmssy sends
`shipment.updated` for each change, so a mail to the buyer can hang off it.

The claim leaves the order unfulfilled; it becomes fulfilled when the parcel gets its tracking number, so a refused label leaves it in the admin's Shipping problem queue still to pack.

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
app/api/cmssy/webhook/   verifies cmssy's signature, books a paid order's parcel with the carrier
app/api/shippo/webhook/  checks the URL token, writes carrier tracking and recovered labels on the parcel
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
  in `proxy.ts`; the cart rides a separate random token, minted on the first cart write, and merges into the member cart on
  sign-in. All of it is app-owned - the SDK ships no auth or commerce helpers.

## Add your own block

1. Create `blocks/<name>/block.ts` with `defineBlock({ type, props, component, loader? })`.
2. Add the component next to it.
3. Register it in `cmssy/blocks.ts`.

It then appears in the editor's block picker automatically. Full guide:
[Building blocks](https://www.cmssy.com/docs/blocks/define).

## Deploy

Use the **Deploy with Vercel** button above, or push to any Node 22.13+ host. Set the
environment variables in your host's dashboard. After deploying, open the site in the cmssy
editor to start editing visually.

## Learn more

- [cmssy docs](https://www.cmssy.com/docs)
- [Installation](https://www.cmssy.com/docs/start/installation) · [Quickstart](https://www.cmssy.com/docs/start/quickstart)
- [Block recipes](https://www.cmssy.com/docs/blocks) · [Branding](https://www.cmssy.com/docs/editor/branding)
