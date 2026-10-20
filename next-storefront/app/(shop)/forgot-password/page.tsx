import { ForgotPasswordForm } from "@/components/shop/password-recovery";
import { localePath, shopLocale } from "@/lib/locale";
import { copyFor } from "@/lib/shop-copy";

export async function generateMetadata() {
  const { locale } = await shopLocale();
  return {
    title: `${copyFor(locale).forgotPasswordTitle} - MACHTEC`,
    robots: { index: false },
  };
}

export default async function ForgotPasswordPage() {
  const { locale, defaultLocale } = await shopLocale();
  return (
    <ForgotPasswordForm
      accountHref={localePath("/account", locale, defaultLocale)}
    />
  );
}
