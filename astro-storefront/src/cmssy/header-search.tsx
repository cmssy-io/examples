import {
  useLocalePath,
  useShopCopy,
  useShopSearch,
} from "../components/shop/locale-ui";
import { SearchIcon } from "./icons";
import styles from "./site-header.module.css";

const CATALOG_PATH = "/c/all";

export function HeaderSearch({ placeholder }: { placeholder?: string }) {
  const localePath = useLocalePath();
  const copy = useShopCopy();
  const params = useShopSearch();

  return (
    <form className={styles.search} action={localePath(CATALOG_PATH)} method="get">
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
