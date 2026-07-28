# simple-blog

A blog on cmssy: a listing block that loads published pages **on the server**, and article pages
rendered from blocks. Next.js App Router.

Runs against the public cmssy demo workspace out of the box, so a fresh clone shows real posts
with no cmssy account.

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open http://localhost:3000/blog.

## What it demonstrates

- **A block with a server loader.** `blocks/blog-index/block.ts` declares a `loader`, which runs
  during SSR and hands its result to the component as `data`. The first page of posts is in the
  HTML rather than fetched after hydration.
- **Your own GraphQL query.** `blocks/blog-index/posts-query.ts` is a plain query against the
  delivery API. The SDK client is a gateway, not a set of wrappers - `queryScoped` injects the
  workspace id and gets out of the way.
- **Posts as pages.** Each post is a child page of `/blog`. Publishing a page publishes a post;
  there is no separate "posts" concept to keep in sync.
- **Typed content.** Components are typed `BlockProps<typeof props>`, so the schema is the only
  place a field is named. Rename a field and the component stops compiling.
- **Nothing defaulted.** A block renders what the CMS gives it. A missing value means the element
  does not render - never a hardcoded English string on a page in another language.

## Layout

```
blocks/
  blog-index/   listing: block.ts (+ loader), posts-query.ts, load-posts.ts, component
  hero/         page heading
  prose/        article body
cmssy/
  blocks.ts     the array you hand to createCmssyPage
app/[[...path]] the catch-all that renders any cmssy page
```

## Point it at your own workspace

```bash
npx @cmssy/cli link --token cs_...
```

That rewrites the `CMSSY_*` values in `.env.local`. Your workspace needs a `/blog` page with child
pages under it - the listing block asks the delivery API for the children of whatever `parentSlug`
it is configured with.

## Docs

- [Installation](https://cmssy.com/docs/start/installation)
- [Building blocks](https://cmssy.com/docs/blocks)
- [Field types](https://cmssy.com/docs/blocks/fields)
