import { ForgotPasswordForm } from "@/components/shop/password-recovery";
import { localePath, shopLocale } from "@/lib/locale";
import { copyFor } from "@/lib/shop-copy";
import { pageTitle } from "@/services/site";

export async function generateMetadata() {
  const { locale } = await shopLocale();
  return {
    title: await pageTitle(copyFor(locale).forgotPasswordTitle),
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
