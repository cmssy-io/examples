import Link from "next/link";
import type { ComponentProps } from "react";
import { localizeHref } from "@cmssy/next";
import type { CmssyBlockContext } from "@cmssy/react";

// `locale` is ours, not next/link's own (that one is a string or false).
type LocaleLinkProps = Omit<ComponentProps<typeof Link>, "href" | "locale"> & {
  href: string;
  locale?: CmssyBlockContext["locale"];
};

/**
 * A link that keeps the reader in their language. The default locale has no
 * prefix, so `localizeHref` leaves /about alone and turns it into /pl/about
 * for Polish; external hrefs and fragments pass through untouched.
 *
 * Blocks get the locale from their `context`. Prefixing links is the app's
 * job - the SDK stores canonical slugs, never localized URLs.
 */
export function LocaleLink({ href, locale, ...rest }: LocaleLinkProps) {
  return <Link href={locale ? localizeHref(href, locale) : href} {...rest} />;
}
