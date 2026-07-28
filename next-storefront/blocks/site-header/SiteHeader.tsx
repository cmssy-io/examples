"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { fields, type BlockProps } from "@cmssy/react";
import { useCart } from "@/components/shop/cart-provider";
import { useCmssyUser } from "@/components/shop/user-provider";
import { useCartUi } from "@/components/shop/cart-ui";
import { LanguageSwitcher } from "@/components/shop/language-switcher";
import {
  useLocalePath,
  useShopCopy,
  useShopPathname,
} from "@/components/shop/locale-ui";
import { fill } from "@/lib/shop-copy";
import type { MegaCategory } from "./load-mega";
import styles from "./SiteHeader.module.css";

function Icon({ path }: { path: string }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      dangerouslySetInnerHTML={{ __html: path }}
    />
  );
}

const QUICK_ORDER_ICON =
  '<path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"/><path d="M9 13h6M9 17h3"/>';
const ACCOUNT_ICON =
  '<circle cx="12" cy="8" r="4"/><path d="M6 21v-1a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v1"/>';
const CART_ICON =
  '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>';
const TRUCK_ICON =
  '<path d="M5 18H3c-.6 0-1-.4-1-1V7c0-.6.4-1 1-1h10c.6 0 1 .4 1 1v11"/><path d="M14 9h4l4 4v4c0 .6-.4 1-1 1h-2"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>';
const MENU_ICON = '<path d="M3 6h18M3 12h18M3 18h18"/>';
const SEARCH_ICON = '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>';
const CHEVRON_ICON = '<path d="m6 9 6 6 6-6"/>';

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
    itemSchema: {
      slug: fields.text({ label: "Category slug", required: true }),
    },
  }),
};

export interface SiteHeaderData {
  categories: MegaCategory[];
}

export default function SiteHeader({
  content,
  data,
}: BlockProps<typeof siteHeaderProps, SiteHeaderData>) {
  const { cart } = useCart();
  const { openDrawer } = useCartUi();
  const { user } = useCmssyUser();
  const router = useRouter();
  const pathname = useShopPathname();
  const params = useSearchParams();
  const localePath = useLocalePath();
  const copy = useShopCopy();

  const allCategories = data?.categories ?? [];

  const navSlugs = (content.navCategories ?? [])
    .map((item) => item.slug?.trim())
    .filter((slug): slug is string => Boolean(slug));
  const categories = navSlugs.length
    ? navSlugs
        .map((slug) => allCategories.find((category) => category.slug === slug))
        .filter((category): category is (typeof allCategories)[number] =>
          Boolean(category),
        )
    : allCategories;
  const [megaOpen, setMegaOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const active = categories[activeIndex] ?? categories[0];

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

          <form
            className={styles.search}
            action={localePath("/c/all")}
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              const search = String(form.get("q") ?? "").trim();
              router.push(
                localePath(
                  search
                    ? `/c/all?q=${encodeURIComponent(search)}`
                    : "/c/all",
                ),
              );
            }}
          >
            <input
              className={styles.searchInput}
              type="search"
              name="q"
              placeholder={content.searchPlaceholder ?? copy.searchPlaceholder}
              defaultValue={params.get("q") ?? ""}
              aria-label={copy.searchAria}
            />
            <button className={styles.searchButton} type="submit">
              <Icon path={SEARCH_ICON} />
              {copy.search}
            </button>
          </form>

          <div className={styles.actions}>
            <Link
              href={localePath("/quick-order")}
              className={styles.action}
            >
              <Icon path={QUICK_ORDER_ICON} />
              <span>{copy.quickOrder}</span>
            </Link>
            <Link href={localePath("/account")} className={styles.action}>
              <Icon path={ACCOUNT_ICON} />
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
              <Icon path={CART_ICON} />
              <span>{copy.cart}</span>
              {itemCount > 0 ? (
                <span className={styles.badge}>{itemCount}</span>
              ) : null}
            </Link>
          </div>
        </div>

        <nav className={styles.nav} aria-label={copy.categoriesAria}>
          <div className={styles.navInner}>
            <button
              type="button"
              className={styles.navTrigger}
              aria-expanded={megaOpen}
              onMouseEnter={() => setMegaOpen(true)}
              onClick={() => setMegaOpen((open) => !open)}
            >
              <Icon path={MENU_ICON} />
              {copy.allCategories}
              <span
                className={`${styles.chevron} ${
                  megaOpen ? styles.chevronOpen : ""
                }`}
              >
                <Icon path={CHEVRON_ICON} />
              </span>
            </button>

            {categories.map((category, index) => (
              <Link
                key={category.id}
                href={localePath(`/c/${category.slug}`)}
                className={`${styles.navLink} ${
                  pathname === `/c/${category.slug}`
                    ? styles.navLinkActive
                    : ""
                }`}
                onMouseEnter={() => {
                  setActiveIndex(index);
                  setMegaOpen(true);
                }}
              >
                {category.name}
              </Link>
            ))}

            {content.dispatchNote ? (
              <span className={styles.dispatch}>
                <Icon path={TRUCK_ICON} />
                {content.dispatchNote}
              </span>
            ) : null}
          </div>
        </nav>

        {megaOpen && active ? (
          <div className={styles.mega}>
            <div className={styles.megaInner}>
              <div className={styles.megaRail}>
                {categories.map((category, index) => (
                  <Link
                    key={category.id}
                    href={localePath(`/c/${category.slug}`)}
                    className={`${styles.railItem} ${
                      index === activeIndex ? styles.railItemActive : ""
                    }`}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={closeMega}
                  >
                    <span className={styles.railName}>
                      <span className={styles.railCode}>{category.code}</span>
                      {category.name}
                    </span>
                    <span className={styles.railArrow} aria-hidden>
                      ›
                    </span>
                  </Link>
                ))}
              </div>

              <div className={styles.megaBody}>
                <div className={styles.megaHead}>
                  <span className={styles.megaTitle}>{active.name}</span>
                  <Link
                    href={localePath(`/c/${active.slug}`)}
                    className={styles.megaViewAll}
                    onClick={closeMega}
                  >
                    {fill(copy.viewAllSkus, { count: active.count })} →
                  </Link>
                </div>

                <div className={styles.megaLines}>
                  {active.lines.map((line) => (
                    <Link
                      key={line.slug}
                      href={localePath(`/p/${line.slug}`)}
                      className={styles.megaLine}
                      onClick={closeMega}
                    >
                      {line.title}
                    </Link>
                  ))}
                </div>

                {active.brands.length > 0 ? (
                  <>
                    <span className={styles.megaLabel}>{copy.topBrands}</span>
                    <div className={styles.megaBrands}>
                      {active.brands.map((brand) => (
                        <Link
                          key={brand}
                          href={localePath(
                            `/c/${active.slug}?brand=${encodeURIComponent(brand)}`,
                          )}
                          className={styles.megaBrand}
                          onClick={closeMega}
                        >
                          {brand}
                        </Link>
                      ))}
                    </div>
                  </>
                ) : null}
              </div>

              <div className={styles.megaFeatured}>
                <span className={styles.megaThumb} aria-hidden>
                  {active.code}
                </span>
                <span className={styles.megaLabel}>{copy.featured}</span>
                {active.featured ? (
                  <>
                    <span className={styles.megaFeaturedName}>
                      {active.featured.title}
                    </span>
                    <span className={styles.megaFeaturedText}>
                      {fill(copy.featuredBlurb, { name: active.name })}
                    </span>
                    <Link
                      href={localePath(`/p/${active.featured.slug}`)}
                      className={styles.megaFeaturedButton}
                      onClick={closeMega}
                    >
                      {fill(copy.browseCategory, { name: active.name })}
                    </Link>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </header>
    </>
  );
}
