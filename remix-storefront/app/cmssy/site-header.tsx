import { fields, type BlockProps } from "@cmssy/react";
import type { Category } from "../services/catalog";
import { CATEGORY_MODEL } from "../services/catalog-models";
import styles from "./site-header.module.css";

// Field for field the same declaration as next-storefront's, and that is not a
// stylistic preference: the block manifest is per-workspace, all four examples
// point at cmssy/cmssy-demo, and whichever handshake ran last decides what the
// editor offers everyone. A narrower schema here would quietly take fields away
// from the Next example's editor.
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
  categories: Category[];
}

function SearchIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

export function SiteHeader({
  content,
  data,
}: BlockProps<typeof siteHeaderProps, SiteHeaderData>) {
  const all = data?.categories ?? [];
  const picked = (content.navCategories ?? [])
    .map((item) => item.category?.id)
    .filter((id): id is string => Boolean(id));
  // Empty means every category, which is what the field's own helper text
  // promises the editor.
  const categories = picked.length
    ? picked
        .map((id) => all.find((category) => category.id === id))
        .filter((category): category is Category => Boolean(category))
    : all;
  const brandName = content.brandName ?? "";

  return (
    <>
      <div className={styles.utility}>
        <div className={styles.utilityInner}>
          {content.utilityNote ? (
            <span className={styles.utilityNote}>{content.utilityNote}</span>
          ) : null}
          <div className={styles.utilityList}>
            {content.hoursNote ? (
              <span className={styles.hoursNote}>{content.hoursNote}</span>
            ) : null}
            {content.dispatchNote ? (
              <span className={styles.dispatchNote}>
                {content.dispatchNote}
              </span>
            ) : null}
            {content.signInLabel ? (
              <a href="/account">{content.signInLabel}</a>
            ) : null}
          </div>
        </div>
      </div>

      <header className={styles.header}>
        <div className={styles.headerInner}>
          <a href="/" className={styles.brand}>
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
          </a>

          {content.searchPlaceholder ? (
            <form action="/c/all" method="get" className={styles.search}>
              <input
                className={styles.searchInput}
                type="search"
                name="q"
                placeholder={content.searchPlaceholder}
                aria-label={content.searchPlaceholder}
              />
              <button
                type="submit"
                className={styles.searchButton}
                aria-label={content.searchPlaceholder}
              >
                <SearchIcon />
              </button>
            </form>
          ) : null}
        </div>

        {categories.length > 0 ? (
          <nav className={styles.nav}>
            <div className={styles.navInner}>
              {categories.map((category) => (
                <a
                  key={category.id}
                  href={`/c/${category.slug}`}
                  className={styles.navLink}
                >
                  {category.name}
                </a>
              ))}
            </div>
          </nav>
        ) : null}
      </header>
    </>
  );
}
