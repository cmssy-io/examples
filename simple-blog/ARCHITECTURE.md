# Architecture

A complete, buildable Next.js (App Router) app wired to the headless cmssy CMS. Next is pinned in
`package.json`; the repo powers GitHub "Use this template" and the Vercel 1-click Deploy.

## The cmssy overlay

These cmssy-specific files are the canonical wiring "overlay" - what you add to a fresh
`create-next-app@latest` and then connect with `npx @cmssy/cli link` (everything else is stock
Next):

- `cmssy.config.ts` - `defineCmssyConfig` with the three required values (`org`, `workspaceSlug`,
  `draftSecret`); it validates at startup and throws naming any missing env var. Locales come from
  the workspace (Settings → Languages), never from this config.
- `proxy.ts` - `createCmssyProxy` from `@cmssy/next/middleware`. In order: resolves the locale,
  rewrites a **verified** editor request onto `/cmssy-edit`, applies the CSP `frame-ancestors` for
  the cmssy admin. The order matters, which is why it is a preset and not hand-rolled here.
- `app/[[...path]]/page.tsx` - public catch-all (`createCmssyPage`); `generateMetadata` calls the
  app's own `services/seo.ts`, because the SDK ships no SEO helper
- `app/cmssy-edit/[[...path]]/page.tsx` - the dynamic route verified editor traffic lands on
  (`createCmssyEditPage`, `force-dynamic`); a static public page never sees the query string, so
  the editor needs a route of its own. Delete it and the editor preview goes blank.
- `app/api/draft/route.ts` - draft preview (`createDraftRoute`); enter with
  `?secret=<CMSSY_DRAFT_SECRET>`, exit with `?disable=1`
- `app/[[...path]]/layout.tsx` + `app/cmssy-edit/[[...path]]/layout.tsx` - two root layouts, one
  per route tree. Both render header/footer through `CmssyLayoutSlot` and differ only in
  `editMode`: the public one passes `false`, the edit one passes `isCmssyEditMode()` and gets
  the blocks through `cmssy/editable-layout.tsx`. A server-rendered header cannot be edited,
  and a client-mounted one cannot be static
- `app/sitemap.ts` + `app/robots.ts` - written here, from `services/pages.ts`: a sitemap is a
  query plus a mapping, and the CMS has no business owning your route files
- `lib/locale-path.ts` + `services/` - the app's own locale helpers, delivery queries and
  metadata builder. Since the slim 10.x SDK these are yours, not imports
- `cmssy/blocks.ts` - block registry
- `cmssy/editor.tsx` - lazy editor (blocks load on the client, server-only loader code stays out
  of the browser bundle)
- `cmssy/editable-layout.tsx` - mounts header/footer layout blocks through the edit bridge; used
  by the edit route's layout
- `blocks/**` - example blocks (`hero`, `prose`, `blog-index`); each exports its field schema next
  to the component (`BlockProps<typeof props>`, `BlockProps<typeof props, Data>` for loader
  blocks) and is self-styled with a co-located CSS Module (no Tailwind - cmssy does not impose a
  styling system)
- deltas: `next.config.mjs` image `remotePatterns`; `styles/globals.css` plain base tokens;
  deps `@cmssy/next`, `@cmssy/react`, `sanitize-html`

Stock Next files (`package.json` base, `tsconfig.json`, `eslint.config.mjs`) come from
`create-next-app`; the catch-all owns `/`, so drop the default `app/page.tsx`.

## Edit-mode security model

`?cmssyEdit=1` alone does nothing. An editor request must also carry a `cmssySecret` that the
middleware verifies server-side against the workspace draft secret before rewriting it onto
`/cmssy-edit`; an unverified request renders published content like any other. The secret is
server-only (`CMSSY_DRAFT_SECRET`) and never reaches the browser - the editor proves itself per
request. `frame-ancestors` is restricted to the cmssy admin origin (`https://www.cmssy.io`), so no
other site can frame the app in edit mode.
