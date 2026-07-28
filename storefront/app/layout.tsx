import type { ReactNode } from "react";
import { LocaleProvider } from "@/components/shop/locale-ui";
import { shopLocale } from "@/lib/locale";
import "@/styles/globals.css";

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const locale = await shopLocale();

  return (
    <html lang={locale.locale}>
      <body>
        <LocaleProvider value={locale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
