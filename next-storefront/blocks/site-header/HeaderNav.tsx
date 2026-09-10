"use client";

import Link from "next/link";
import {
  useLocalePath,
  useShopCopy,
  useShopPathname,
} from "@/components/shop/locale-ui";
import { MegaMenu } from "./MegaMenu";
import { ChevronIcon, MenuIcon, TruckIcon } from "./icons";
import type { MegaCategory } from "./load-mega";
import styles from "./SiteHeader.module.css";

export function HeaderNav({
  categories,
  dispatchNote,
  megaOpen,
  activeIndex,
  onOpenChange,
  onActivate,
  onClose,
}: {
  categories: MegaCategory[];
  dispatchNote?: string;
  megaOpen: boolean;
  activeIndex: number;
  onOpenChange: (open: boolean) => void;
  onActivate: (index: number) => void;
  onClose: () => void;
}) {
  const localePath = useLocalePath();
  const pathname = useShopPathname();
  const copy = useShopCopy();

  return (
    <>
      <nav className={styles.nav} aria-label={copy.categoriesAria}>
        <div className={styles.navInner}>
          <button
            type="button"
            className={styles.navTrigger}
            aria-expanded={megaOpen}
            onMouseEnter={() => onOpenChange(true)}
            onClick={() => onOpenChange(!megaOpen)}
          >
            <MenuIcon />
            {copy.allCategories}
            <span
              className={`${styles.chevron} ${
                megaOpen ? styles.chevronOpen : ""
              }`}
            >
              <ChevronIcon />
            </span>
          </button>

          {categories.map((category, index) => (
            <Link
              key={category.id}
              href={localePath(`/c/${category.slug}`)}
              className={`${styles.navLink} ${
                pathname === `/c/${category.slug}` ? styles.navLinkActive : ""
              }`}
              onMouseEnter={() => {
                onActivate(index);
                onOpenChange(true);
              }}
            >
              {category.name}
            </Link>
          ))}

          {dispatchNote ? (
            <span className={styles.dispatch}>
              <TruckIcon />
              {dispatchNote}
            </span>
          ) : null}
        </div>
      </nav>

      {megaOpen ? (
        <MegaMenu
          categories={categories}
          activeIndex={activeIndex}
          onActivate={onActivate}
          onClose={onClose}
        />
      ) : null}
    </>
  );
}
