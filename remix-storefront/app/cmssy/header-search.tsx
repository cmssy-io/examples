import { useNavigate, useSearchParams } from "react-router";
import { useLocalePath, useShopCopy } from "../components/shop/locale-ui";
import { SearchIcon } from "./icons";
import styles from "./site-header.module.css";

const CATALOG_PATH = "/c/all";

export function HeaderSearch({ placeholder }: { placeholder?: string }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
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
        void navigate(
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
