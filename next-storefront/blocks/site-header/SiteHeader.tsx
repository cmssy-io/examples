"use client";

import Link from "next/link";
import { useState } from "react";
import { fields, type BlockProps } from "@cmssy/react";
import { CATEGORY_MODEL } from "@/lib/catalog-models";
import { useCart } from "@/components/shop/cart-provider";
import { useCmssyUser } from "@/components/shop/user-provider";
import { useCartUi } from "@/components/shop/cart-ui";
import { LanguageSwitcher } from "@/components/shop/language-switcher";
import { useLocalePath, useShopCopy } from "@/components/shop/locale-ui";
import { HeaderSearch } from "./HeaderSearch";
import { HeaderNav } from "./HeaderNav";
import type { MegaCategory } from "./load-mega";
import { AccountIcon, CartIcon, QuickOrderIcon } from "./icons";
import styles from "./SiteHeader.module.css";

export const siteHeaderProps = {
  utilityNote: fields.text({ label: "Utility bar note" }),
  hoursNote: fields.text({ label: "Opening hours" }),
  signInLabel: fields.text({
    label: "Sign-in label",
    defaultValue: "Trade sign in",
  }),
  brandName: fields.text({ label: "Brand name", required: true }),
  brandKicker: fields.text({ label: "Brand kicker" }),
  searchPlaceholder: fields.text({ label: "Search placeholder" }),
  dispatchNote: fields.text({ label: "Dispatch note" }),
  navCategories: fields.repeater({
    label: "Navigation categories",
    itemLabel: "Category",
    addButtonLabel: "Add category",
    helperText: "Leave empty to show every category.",
    itemSchema: {
      category: fields.relation({
        label: "Category",
        model: CATEGORY_MODEL,
        required: true,
        localized: false,
      }),
    },
  }),
};

export interface SiteHeaderData {
  categories: MegaCategory[];
}

type NavSelection = NonNullable<
  BlockProps<typeof siteHeaderProps>["content"]["navCategories"]
>;

function selectCategories(
  all: MegaCategory[],
  selection: NavSelection,
): MegaCategory[] {
  const ids = selection
    .map((item) => item.category?.id)
    .filter((id): id is string => Boolean(id));
  if (ids.length === 0) return all;
  return ids.flatMap((id) => {
    const category = all.find((candidate) => candidate.id === id);
    return category ? [category] : [];
  });
}

export default function SiteHeader({
  content,
  data,
}: BlockProps<typeof siteHeaderProps, SiteHeaderData>) {
  const { cart } = useCart();
  const { openDrawer } = useCartUi();
  const { user } = useCmssyUser();
  const localePath = useLocalePath();
  const copy = useShopCopy();

  const [megaOpen, setMegaOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const categories = selectCategories(
    data?.categories ?? [],
    content.navCategories ?? [],
  );
  const itemCount = cart?.itemCount ?? 0;
  const brandName = content.brandName ?? "";
  const signInLabel = content.signInLabel ?? copy.tradeSignIn;
  const closeMega = () => setMegaOpen(false);

  return (
    <>
      <div className={styles.utility}>
        <div className={styles.utilityInner}>
          <span className={styles.utilityNote}>{content.utilityNote}</span>
          <div className={styles.utilityList}>
            {content.hoursNote ? (
              <span className={styles.hoursNote}>{content.hoursNote}</span>
            ) : null}
            <Link href={localePath("/account")}>
              {user ? user.email : signInLabel}
            </Link>
            <LanguageSwitcher />
          </div>
        </div>
      </div>

      <header className={styles.header} onMouseLeave={closeMega}>
        <div className={styles.headerInner}>
          <Link href={localePath("/")} className={styles.brand}>
            <span className={styles.brandMark} aria-hidden>
              {brandName.slice(0, 1)}
            </span>
            <span className={styles.brandText}>
              <span className={styles.brandName}>{brandName}</span>
              {content.brandKicker ? (
                <span className={styles.brandKicker}>
                  {content.brandKicker}
                </span>
              ) : null}
            </span>
          </Link>

          <HeaderSearch placeholder={content.searchPlaceholder} />

          <div className={styles.actions}>
            <Link href={localePath("/quick-order")} className={styles.action}>
              <QuickOrderIcon />
              <span>{copy.quickOrder}</span>
            </Link>
            <Link href={localePath("/account")} className={styles.action}>
              <AccountIcon />
              <span>{copy.account}</span>
            </Link>
            <Link
              href={localePath("/cart")}
              className={`${styles.action} ${styles.actionStrong}`}
              onClick={(event) => {
                if (
                  event.metaKey ||
                  event.ctrlKey ||
                  event.shiftKey ||
                  event.altKey
                ) {
                  return;
                }
                event.preventDefault();
                openDrawer();
              }}
            >
              <CartIcon />
              <span>{copy.cart}</span>
              {itemCount > 0 ? (
                <span className={styles.badge}>{itemCount}</span>
              ) : null}
            </Link>
          </div>
        </div>

        <HeaderNav
          categories={categories}
          dispatchNote={content.dispatchNote}
          megaOpen={megaOpen}
          activeIndex={activeIndex}
          onOpenChange={setMegaOpen}
          onActivate={setActiveIndex}
          onClose={closeMega}
        />
      </header>
    </>
  );
}
