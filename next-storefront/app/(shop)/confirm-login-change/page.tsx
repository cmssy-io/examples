import { TokenConfirmation } from "@/components/shop/token-confirmation";
import { localePath, shopLocale } from "@/lib/locale";
import { copyFor } from "@/lib/shop-copy";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const { locale } = await shopLocale();
  return {
    title: `${copyFor(locale).loginConfirmTitle} - MACHTEC`,
    robots: { index: false },
  };
}

export default async function ConfirmLoginChangePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const { locale, defaultLocale } = await shopLocale();
  return (
    <TokenConfirmation
      kind="login"
      token={token ?? null}
      accountHref={localePath("/account", locale, defaultLocale)}
    />
  );
}
