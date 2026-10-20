import { ResetPasswordForm } from "@/components/shop/password-recovery";
import { localePath, shopLocale } from "@/lib/locale";
import { copyFor } from "@/lib/shop-copy";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const { locale } = await shopLocale();
  return {
    title: `${copyFor(locale).resetPasswordTitle} - MACHTEC`,
    robots: { index: false },
  };
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const { locale, defaultLocale } = await shopLocale();
  return (
    <ResetPasswordForm
      token={token ?? null}
      accountHref={localePath("/account", locale, defaultLocale)}
    />
  );
}
