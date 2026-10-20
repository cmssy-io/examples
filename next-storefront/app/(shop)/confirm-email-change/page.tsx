import { ConfirmEmailChange } from "@/components/shop/confirm-email-change";
import { localePath, shopLocale } from "@/lib/locale";
import { copyFor } from "@/lib/shop-copy";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const { locale } = await shopLocale();
  return {
    title: `${copyFor(locale).emailConfirmTitle} - MACHTEC`,
    robots: { index: false },
  };
}

export default async function ConfirmEmailChangePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const { locale, defaultLocale } = await shopLocale();
  return (
    <ConfirmEmailChange
      token={token ?? null}
      accountHref={localePath("/account", locale, defaultLocale)}
    />
  );
}
