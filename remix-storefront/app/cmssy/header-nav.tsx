import { Link } from "react-router";
import {
  useLocalePath,
  useShopCopy,
  useShopPathname,
} from "../components/shop/locale-ui";
import { ChevronIcon, MenuIcon } from "./icons";
import type { MegaCategory } from "./load-mega";
import { MegaMenu } from "./mega-menu";
import styles from "./site-header.module.css";

export function HeaderNav({
  categories,
  megaOpen,
  activeIndex,
  onOpenChange,
  onActivate,
  onClose,
}: {
  categories: MegaCategory[];
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
              to={localePath(`/c/${category.slug}`)}
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
