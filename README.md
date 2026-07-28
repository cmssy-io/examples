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

| Example                      | What it shows                                                                                                 |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------- |
| [simple-blog](./simple-blog) | A whole small site: blog listing with a server `loader`, rich text, and model records bound via `fields.relation` |

## Why this repo exists

Example code that nobody builds rots. Every example here is built in CI against the **packed
tarballs** of the SDK - the artifact you install, not a symlink into a monorepo - and the build
asserts that a page actually renders, not just that it compiles. An SDK change that breaks an
example turns its pull request red.

## Related

- `npx @cmssy/cli init` - generates this same wiring into an app you already have, if you
  want an empty starting point rather than a finished one.
- [Documentation](https://cmssy.com/docs)
