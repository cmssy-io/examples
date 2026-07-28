"use client";

import { localePath } from "@/lib/locale-path";
import { useShopLocale, useShopPathname } from "./locale-ui";
import styles from "./language-switcher.module.css";

const LABELS: Record<string, string> = {
  en: "EN",
  no: "NO",
};

export function LanguageSwitcher() {
  const { locale, defaultLocale, locales } = useShopLocale();
  const pathname = useShopPathname();

  if (locales.length < 2) return null;

  return (
    <div className={styles.switcher}>
      {locales.map((option) => (
        <a
          key={option}
          href={localePath(pathname, option, defaultLocale)}
          aria-current={option === locale ? "true" : undefined}
          className={option === locale ? styles.active : styles.option}
        >
          {LABELS[option] ?? option.toUpperCase()}
        </a>
      ))}
    </div>
  );
}
