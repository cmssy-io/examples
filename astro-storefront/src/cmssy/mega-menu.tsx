import { useLocalePath, useShopCopy } from "../components/shop/locale-ui";
import { fill } from "../lib/shop-copy";
import type { MegaCategory } from "./load-mega";
import styles from "./site-header.module.css";

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
            <a
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
            </a>
          ))}
        </div>

        <div className={styles.megaBody}>
          <div className={styles.megaHead}>
            <span className={styles.megaTitle}>{active.name}</span>
            <a
              href={localePath(`/c/${active.slug}`)}
              className={styles.megaViewAll}
              onClick={onClose}
            >
              {fill(copy.viewAllSkus, { count: active.count })} →
            </a>
          </div>

          <div className={styles.megaLines}>
            {active.lines.map((line) => (
              <a
                key={line.slug}
                href={localePath(`/p/${line.slug}`)}
                className={styles.megaLine}
                onClick={onClose}
              >
                {line.title}
              </a>
            ))}
          </div>

          {active.brands.length > 0 ? (
            <>
              <span className={styles.megaLabel}>{copy.topBrands}</span>
              <div className={styles.megaBrands}>
                {active.brands.map((brand) => (
                  <a
                    key={brand}
                    href={localePath(
                      `/c/${active.slug}?brand=${encodeURIComponent(brand)}`,
                    )}
                    className={styles.megaBrand}
                    onClick={onClose}
                  >
                    {brand}
                  </a>
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
              <a
                href={localePath(`/p/${active.featured.slug}`)}
                className={styles.megaFeaturedButton}
                onClick={onClose}
              >
                {fill(copy.browseCategory, { name: active.name })}
              </a>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
