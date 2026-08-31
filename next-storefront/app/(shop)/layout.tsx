import type { ReactNode } from "react";
import { Inter } from "next/font/google";

import { CmssyLayoutSlot, isCmssyEditMode } from "@cmssy/next/server";
import { cmssy } from "@/cmssy.config";
import { blocks } from "@/cmssy/blocks";
import { EditableLayout } from "@/cmssy/editable-layout";
import { getCart } from "@/services/cart";
import { currentUser } from "@/lib/cmssy/session";
import { shopLocale } from "@/lib/locale";
import { CartDrawer } from "@/components/shop/cart-drawer";
import { CartUiProvider } from "@/components/shop/cart-ui";
import { CartProvider } from "@/components/shop/cart-provider";
import { UserProvider } from "@/components/shop/user-provider";
import "@/styles/shop.css";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
  display: "swap",
});

const CHROME_PAGE = "/";

export default async function ShopLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [initialCart, initialUser, { locale }, editMode] = await Promise.all([
    getCart(),
    currentUser(),
    shopLocale(),
    isCmssyEditMode(),
  ]);

  // No `path` here - a route-group layout has no params - so the language is
  // resolved from the header the proxy set and passed in. That read, and the
  // edit-mode one, cost this layout nothing: it is dynamic regardless, because
  // it renders the signed-in member and their cart. On a cacheable route they
  // would not be free, which is why the slot no longer does either itself.
  const slot = (region: "header" | "footer") => (
    <CmssyLayoutSlot
      config={cmssy}
      blocks={blocks}
      region={region}
      page={CHROME_PAGE}
      locale={locale}
      editMode={editMode}
      editable={EditableLayout}
    />
  );

  return (
    <UserProvider initialUser={initialUser}>
      <CartProvider initialCart={initialCart}>
        <CartUiProvider>
          <div className={`shop-scope ${inter.variable}`}>
            {slot("header")}
            <main className="shop-main">{children}</main>
            {slot("footer")}
            <CartDrawer />
          </div>
        </CartUiProvider>
      </CartProvider>
    </UserProvider>
  );
}
