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
