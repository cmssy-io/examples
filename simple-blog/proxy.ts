import { createCmssyProxy, isCmssyEditRequest } from "@cmssy/next/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { cmssy } from "@/cmssy.config";
import { localizedPath, splitLocaleFromPath } from "@/lib/locale-path";
import { resolveSiteLocales } from "@/services/site";

const cmssyProxy = createCmssyProxy(cmssy);

/**
 * The site root goes to the blog.
 *
 * This example points at the shared commerce demo, where `/` is a storefront
 * homepage built from blocks a blog has no business registering - so the root
 * rendered empty and the first thing a reader saw was nothing. The blog section
 * is what this example serves, and that is where its root belongs.
 *
 * It has to happen here rather than in an `app/page.tsx`: everything routes
 * through `app/[[...path]]/page.tsx`, an optional catch-all matches `/` too,
 * and Next refuses two pages of the same specificity.
 *
 * 307 rather than 308: the root is empty because of the workspace this example
 * borrows, not because the example has decided its own shape forever, and a
 * permanent redirect is cached by browsers long after that stops being true.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const segments = pathname.split("/").filter(Boolean);

  // Only `/` and `/<locale>` can be the root, so nothing deeper pays for the
  // locale lookup, and the editor keeps framing the homepage it selected.
  if (segments.length < 2 && !(await isCmssyEditRequest(request, cmssy))) {
    const locales = await resolveSiteLocales();
    const { locale, path } = splitLocaleFromPath(segments, locales);
    if (path.length === 0) {
      const url = request.nextUrl.clone();
      url.pathname = localizedPath("/blog", locale, locales.defaultLocale);
      return NextResponse.redirect(url, 307);
    }
  }

  return cmssyProxy(request);
}

export const config = {
  matcher: ["/((?!_next/|api/|.*\\..*).*)"],
};
