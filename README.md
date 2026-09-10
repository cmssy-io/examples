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

Every example ships an `.env.example` pointing at the **public cmssy demo workspace**, so a fresh
clone renders real content without a cmssy account. Point one at your own workspace with
`npx @cmssy/cli link --token cs_...`.

## Examples

| Example | Framework | What it shows |
| --- | --- | --- |
| [simple-blog](./simple-blog) | Next.js | Blog listing with a server `loader`, rich text, model records bound via `fields.relation` |
| [next-storefront](./next-storefront) | Next.js | Commerce: products, categories, cart, checkout, member accounts and orders as Server Actions |
| [astro-storefront](./astro-storefront) | Astro | The catch-all route, block registry and verified edit mode on the Astro adapter |
| [remix-storefront](./remix-storefront) | React Router 7 | The same, on React Router (Remix) |

All four point at the same `cmssy-demo` workspace - one set of content, four unrelated frontends,
none of which the CMS knows about.

All four mount the block data route - one helper per adapter, same path. Without it the editor
cannot run a block's `loader`, so a block that fetches - a product grid, a blog index - stays frozen
while you configure it: changing the category changes nothing until the page is saved and the frame
reloads, and a block you have just added has no data at all. The route answers only a request
carrying an edit token the page was rendered with, minted from `draftSecret` and bound to that exact
page; a forged `x-cmssy-edit` header gets a 403, which is what CI asserts (CMS-1804, CMS-1803).

All four also declare a field or two as `localized: false`: a footer link's target, the category a
navigation entry points at, the page a blog index lists under. None of those carry language, so
cmssy stores them once instead of once per locale and folds them back in before delivery - the
components read them unchanged.

That is the goal, not yet the state. **Today only `next-storefront` implements the blocks that
workspace uses.** `simple-blog` renders its `/blog` listing but a blank home page; the Astro and
React Router examples register a single `hero` block that no page uses, so they render nothing at
all. `examples.json` records which examples are asserted in CI and why the others are not.
Bringing them to the same block set is in progress.

## Why this repo exists

Example code that nobody builds rots. Tutorials on cmssy.com once taught SDK APIs that had never
existed, because prose has no compiler.

The plan is that every example here is built in CI against the **packed tarballs** of the SDK -
the artifact you install, not a symlink into a monorepo - with the build asserting that a page
actually renders, not just that it compiles, so an SDK change that breaks an example turns its
pull request red. **That CI does not exist yet**; until it does, these examples are verified by
hand.

## Related

- `npx @cmssy/cli init` - generates this same wiring into an app you already have, if you
  want an empty starting point rather than a finished one.
- [Documentation](https://cmssy.com/docs)
