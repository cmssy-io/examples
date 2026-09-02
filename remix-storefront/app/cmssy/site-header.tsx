import { fields, type BlockProps } from "@cmssy/react";
import type { Category } from "../services/catalog";
import { CATEGORY_MODEL } from "../services/catalog-models";

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
      }),
    },
  }),
};

export interface SiteHeaderData {
  categories: Category[];
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

  return (
    <header>
      <div>
        {content.utilityNote ? <span>{content.utilityNote}</span> : null}
        {content.hoursNote ? <span>{content.hoursNote}</span> : null}
        {content.signInLabel ? (
          <a href="/account">{content.signInLabel}</a>
        ) : null}
      </div>

      <a href="/">
        <strong>{content.brandName}</strong>
        {content.brandKicker ? <span>{content.brandKicker}</span> : null}
      </a>

      {content.searchPlaceholder ? (
        <form action="/c/all" method="get">
          <input
            type="search"
            name="q"
            placeholder={content.searchPlaceholder}
          />
        </form>
      ) : null}

      {categories.length > 0 ? (
        <nav>
          <ul>
            {categories.map((category) => (
              <li key={category.id}>
                <a href={`/c/${category.slug}`}>{category.name}</a>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      {content.dispatchNote ? <span>{content.dispatchNote}</span> : null}
    </header>
  );
}
