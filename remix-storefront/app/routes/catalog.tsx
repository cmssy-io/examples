import { data, Link } from "react-router";
import styles from "../components/shop/catalog.module.css";
import { ProductCard } from "../components/shop/product-card";
import { ShopErrorBoundary } from "../components/shop/shop-error";
import { localePath } from "../lib/locale-path";
import { shopRouteLocale } from "../lib/locale";
import { copyFor, fill } from "../lib/shop-copy";
import {
  PAGE_SIZE,
  loadBrandFacets,
  loadCategories,
  loadProducts,
  loadStockFacets,
  type StockState,
} from "../services/catalog";
import type { Route } from "./+types/catalog";

const SORT_VALUES = ["title", "price", "-price"] as const;

function toStockState(value: string | undefined): StockState | undefined {
  return value === "in" || value === "low" || value === "out"
    ? value
    : undefined;
}

function buildHref(
  base: string,
  current: Record<string, string | undefined>,
  patch: Record<string, string | undefined>,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...current, ...patch })) {
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { locale, defaultLocale } = await shopRouteLocale(request, params);
  const search = new URL(request.url).searchParams;
  const query = {
    brand: search.get("brand") ?? undefined,
    sort: search.get("sort") ?? undefined,
    page: search.get("page") ?? undefined,
    q: search.get("q") ?? undefined,
    stock: search.get("stock") ?? undefined,
  };
  const slug = params.slug;
  const categories = await loadCategories(locale);
  const category =
    slug === "all" ? null : categories.find((item) => item.slug === slug);
  if (slug !== "all" && !category) throw data(null, { status: 404 });

  const page = Math.max(1, Number(query.page ?? "1") || 1);
  const stockState = toStockState(query.stock);
  const term = query.q?.trim() || undefined;
  const [result, brands, stockFacets] = await Promise.all([
    loadProducts({
      categoryId: category?.id,
      brand: query.brand,
      search: term,
      sort: query.sort,
      stockState,
      page,
      locale,
    }),
    loadBrandFacets(category?.id, locale),
    loadStockFacets(category?.id, query.brand, locale),
  ]);

  return {
    locale,
    defaultLocale,
    slug,
    category: category ?? null,
    categories,
    query: { brand: query.brand, sort: query.sort, q: term, stock: stockState },
    page,
    total: result.total,
    lastPage: Math.max(1, Math.ceil(result.total / PAGE_SIZE)),
    hasMore: result.hasMore,
    items: result.items,
    brands,
    stockFacets,
  };
}

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData) return [];
  const copy = copyFor(loaderData.locale);
  const name = loaderData.category?.name ?? copy.allProducts;
  return [{ title: `${name} - MACHTEC` }];
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return <ShopErrorBoundary error={error} />;
}

export default function CategoryPage({ loaderData }: Route.ComponentProps) {
  const {
    locale,
    defaultLocale,
    slug,
    category,
    categories,
    query,
    page,
    total,
    lastPage,
    hasMore,
    items,
    brands,
    stockFacets,
  } = loaderData;
  const copy = copyFor(locale);
  const stockState = query.stock;
  const term = query.q;
  const stockLabels: Record<StockState, string> = {
    in: copy.inStock,
    low: copy.lowStock,
    out: copy.backorder,
  };
  const sortLabels: Record<(typeof SORT_VALUES)[number], string> = {
    title: copy.sortName,
    price: copy.sortPriceAsc,
    "-price": copy.sortPriceDesc,
  };
  const href = (path: string) => localePath(path, locale, defaultLocale);

  const base = href(`/c/${slug}`);
  const current = {
    brand: query.brand,
    sort: query.sort,
    q: term,
    stock: stockState,
  };

  const activeFilters = [
    query.brand
      ? {
          label: query.brand,
          clearHref: buildHref(base, current, {
            brand: undefined,
            page: undefined,
          }),
        }
      : null,
    term
      ? {
          label: `"${term}"`,
          clearHref: buildHref(base, current, {
            q: undefined,
            page: undefined,
          }),
        }
      : null,
    stockState
      ? {
          label: stockLabels[stockState],
          clearHref: buildHref(base, current, {
            stock: undefined,
            page: undefined,
          }),
        }
      : null,
  ].filter((filter) => filter !== null);

  return (
    <>
      <h1 style={{ marginTop: 0 }}>
        {category ? category.name : copy.allProducts}
      </h1>
      {category?.description ? (
        <p className="shop-muted">{category.description}</p>
      ) : null}

      <div className={styles.layout}>
        <aside className={`shop-card ${styles.facets}`}>
          <div className={styles.facetGroup}>
            <span className={styles.facetTitle}>{copy.category}</span>
            <Link
              to={href("/c/all")}
              className={`${styles.facetLink} ${
                slug === "all" ? styles.facetLinkActive : ""
              }`}
            >
              {copy.allProducts}
            </Link>
            {categories.map((item) => (
              <Link
                key={item.id}
                to={href(`/c/${item.slug}`)}
                className={`${styles.facetLink} ${
                  item.slug === slug ? styles.facetLinkActive : ""
                }`}
              >
                {item.name}
              </Link>
            ))}
          </div>

          {stockFacets.length > 0 ? (
            <div className={styles.facetGroup}>
              <span className={styles.facetTitle}>{copy.availability}</span>
              <Link
                to={buildHref(base, current, {
                  stock: undefined,
                  page: undefined,
                })}
                className={`${styles.facetLink} ${
                  !stockState ? styles.facetLinkActive : ""
                }`}
              >
                {copy.anyAvailability}
              </Link>
              {stockFacets.map((facet) => (
                <Link
                  key={facet.state}
                  to={buildHref(base, current, {
                    stock: facet.state,
                    page: undefined,
                  })}
                  className={`${styles.facetLink} ${
                    stockState === facet.state ? styles.facetLinkActive : ""
                  }`}
                >
                  <span>{stockLabels[facet.state]}</span>
                  <span className={styles.facetCount}>{facet.count}</span>
                </Link>
              ))}
            </div>
          ) : null}

          {brands.length > 0 ? (
            <div className={styles.facetGroup}>
              <span className={styles.facetTitle}>{copy.brand}</span>
              <Link
                to={buildHref(base, current, {
                  brand: undefined,
                  page: undefined,
                })}
                className={`${styles.facetLink} ${
                  !query.brand ? styles.facetLinkActive : ""
                }`}
              >
                {copy.anyBrand}
              </Link>
              {brands.map((facet) => (
                <Link
                  key={facet.brand}
                  to={buildHref(base, current, {
                    brand: facet.brand,
                    page: undefined,
                  })}
                  className={`${styles.facetLink} ${
                    query.brand === facet.brand ? styles.facetLinkActive : ""
                  }`}
                >
                  <span>{facet.brand}</span>
                  <span className={styles.facetCount}>{facet.count}</span>
                </Link>
              ))}
            </div>
          ) : null}
        </aside>

        <div>
          <div className={styles.toolbar}>
            <span className={styles.count}>
              {fill(
                total === 1 ? copy.productsCountOne : copy.productsCountMany,
                { count: total },
              )}
              {query.brand
                ? ` ${fill(copy.fromBrand, { brand: query.brand })}`
                : ""}
            </span>
            <div className={styles.sort}>
              <span className="shop-label" style={{ margin: 0 }}>
                {copy.sort}
              </span>
              {SORT_VALUES.map((value) => (
                <Link
                  key={value}
                  to={buildHref(base, current, {
                    sort: value,
                    page: undefined,
                  })}
                  className={`${styles.facetLink} ${
                    (query.sort ?? "title") === value
                      ? styles.facetLinkActive
                      : ""
                  }`}
                >
                  {sortLabels[value]}
                </Link>
              ))}
            </div>
          </div>

          {activeFilters.length > 0 ? (
            <div className={styles.chips}>
              <span className={styles.chipsLabel}>{copy.activeFilters}</span>
              {activeFilters.map((filter) => (
                <Link
                  key={filter.label}
                  to={filter.clearHref}
                  className={styles.chip}
                >
                  {filter.label}
                  <span aria-hidden>x</span>
                  <span className="shop-sr">{copy.removeFilter}</span>
                </Link>
              ))}
              <Link to={base} className={styles.chipsReset}>
                {copy.reset}
              </Link>
            </div>
          ) : null}

          {items.length === 0 ? (
            <div className={`shop-card ${styles.empty}`}>
              {term ? (
                <>
                  <h2>{copy.noProductsFound}</h2>
                  <p className="shop-muted">
                    {fill(copy.searchEmptyHint, { term })}
                  </p>
                  <Link className="shop-btn" to={base}>
                    {fill(copy.browseX, {
                      what: category
                        ? category.name.toLowerCase()
                        : copy.theCatalog,
                    })}
                  </Link>
                </>
              ) : (
                <>
                  <h2>{copy.noProductsMatch}</h2>
                  <p className="shop-muted">{copy.noProductsHint}</p>
                  <Link className="shop-btn" to={base}>
                    {copy.clearAllFilters}
                  </Link>
                </>
              )}
            </div>
          ) : (
            <div className={styles.grid}>
              {items.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          {lastPage > 1 ? (
            <nav className={styles.pager} aria-label={copy.paginationAria}>
              {page > 1 ? (
                <Link
                  className="shop-btn"
                  to={buildHref(base, current, { page: String(page - 1) })}
                >
                  {copy.previous}
                </Link>
              ) : null}
              <span className={styles.count}>
                {fill(copy.pageOf, { page, last: lastPage })}
              </span>
              {hasMore ? (
                <Link
                  className="shop-btn"
                  to={buildHref(base, current, { page: String(page + 1) })}
                >
                  {copy.next}
                </Link>
              ) : null}
            </nav>
          ) : null}
        </div>
      </div>
    </>
  );
}
