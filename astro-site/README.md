# astro-site

The proof that cmssy is headless for **any** frontend, not for Next.

This app talks to cmssy through `@cmssy/astro`, which depends on `@cmssy/core`
and nothing else - no React in the data path, no Next anywhere. A test in the SDK
fails the build if that ever stops being true.

- `src/middleware.ts` - the whole adapter: resolves the language, routes a
  verified editor request to `/cmssy-edit`, applies the CSP that lets the admin
  frame the site.
- `src/pages/[...path].astro` - the public page. React blocks rendered on the
  server by Astro, **zero client JS**.
- `src/pages/cmssy-edit/[...path].astro` - the editor route. The edit bridge is a
  React island, because the editor talks over `postMessage` - and that protocol
  lives in `@cmssy/core`, not in React.

## Prove the editor works

```bash
pnpm smoke:edit
```

A build cannot tell you whether the editor lives. This can.

## Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fcmssy-io%2Fexamples%2Ftree%2Fmain%2Fastro-site&env=CMSSY_ORG_SLUG,CMSSY_WORKSPACE_SLUG,CMSSY_DRAFT_SECRET&envDescription=Your%20cmssy%20org%20slug%2C%20workspace%20slug%20and%20draft%20secret%20from%20Settings%20-%20Headless&envLink=https%3A%2F%2Fwww.cmssy.com%2Fdocs%2Fstart%2Finstallation&project-name=cmssy-astro-site&repository-name=cmssy-astro-site)

Set **Root Directory** to `astro-site` - each example in this repo is a standalone app.
