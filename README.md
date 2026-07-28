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
| [storefront](./storefront) | Next.js | Commerce: products, categories, cart, checkout, member accounts and orders as Server Actions |
| [astro-site](./astro-site) | Astro | The catch-all route, block registry and verified edit mode on the Astro adapter |
| [remix-site](./remix-site) | React Router 7 | The same, on React Router (Remix) |

All four point at the same `cmssy-demo` workspace. That is the headless model applied to itself:
one set of content, four unrelated frontends, none of which the CMS knows about.

## Why this repo exists

Example code that nobody builds rots. Every example here is built in CI against the **packed
tarballs** of the SDK - the artifact you install, not a symlink into a monorepo - and the build
asserts that a page actually renders, not just that it compiles. An SDK change that breaks an
example turns its pull request red.

## Related

- `npx @cmssy/cli init` - generates this same wiring into an app you already have, if you
  want an empty starting point rather than a finished one.
- [Documentation](https://cmssy.com/docs)
