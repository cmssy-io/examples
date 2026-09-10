"use client";

import Link from "next/link";
import { useLocalePath, useShopCopy } from "@/components/shop/locale-ui";
import { fill } from "@/lib/shop-copy";
import type { MegaCategory } from "./load-mega";
import styles from "./SiteHeader.module.css";

export function MegaMenu({
  categories,
  activeIndex,
  onActivate,
  onClose,
}: {
  categories: MegaCategory[];
  activeIndex: number;
  onActivate: (index: number) => void;
  onClose: () => void;
}) {
  const localePath = useLocalePath();
  const copy = useShopCopy();
  const active = categories[activeIndex] ?? categories[0];
  if (!active) return null;

  return (
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
              onMouseEnter={() => onActivate(index)}
              onClick={onClose}
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
              onClick={onClose}
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
                onClick={onClose}
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
                    onClick={onClose}
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
                onClick={onClose}
              >
                {fill(copy.browseCategory, { name: active.name })}
              </Link>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
