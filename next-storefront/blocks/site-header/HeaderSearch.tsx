"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useLocalePath, useShopCopy } from "@/components/shop/locale-ui";
import { SearchIcon } from "./icons";
import styles from "./SiteHeader.module.css";

const CATALOG_PATH = "/c/all";

export function HeaderSearch({ placeholder }: { placeholder?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const localePath = useLocalePath();
  const copy = useShopCopy();

  return (
    <form
      className={styles.search}
      action={localePath(CATALOG_PATH)}
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const search = String(form.get("q") ?? "").trim();
        router.push(
          localePath(
            search
              ? `${CATALOG_PATH}?q=${encodeURIComponent(search)}`
              : CATALOG_PATH,
          ),
        );
      }}
    >
      <input
        className={styles.searchInput}
        type="search"
        name="q"
        placeholder={placeholder ?? copy.searchPlaceholder}
        defaultValue={params.get("q") ?? ""}
        aria-label={copy.searchAria}
      />
      <button className={styles.searchButton} type="submit">
        <SearchIcon />
        {copy.search}
      </button>
    </form>
  );
}
