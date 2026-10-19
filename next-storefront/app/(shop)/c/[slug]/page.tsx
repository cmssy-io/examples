import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, cache } from "react";
import {
  PAGE_SIZE,
  loadBrandFacets,
  loadProducts,
  loadStockFacets,
  type ProductQuery,
  type StockState,
} from "@/lib/catalog";
import { loadCategories } from "@/lib/catalog-cached";
import { ProductCard } from "@/components/shop/product-card";
import { localePath, shopLocale } from "@/lib/locale";
import { copyFor, fill, type ShopCopy } from "@/lib/shop-copy";
import styles from "@/components/shop/catalog.module.css";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  brand?: string;
  sort?: string;
  page?: string;
  q?: string;
  stock?: string;
}>;

function toStockState(value: string | undefined): StockState | undefined {
  return value === "in" || value === "low" || value === "out"
    ? value
    : undefined;
}

const SORT_VALUES = ["title", "price", "-price"] as const;

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

const productsFor = cache((key: string) =>
  loadProducts(JSON.parse(key) as ProductQuery),
);

type Current = Record<string, string | undefined>;

function stockLabelsFor(copy: ShopCopy): Record<StockState, string> {
  return { in: copy.inStock, low: copy.lowStock, out: copy.backorder };
}

async function ResultCount({
  productsKey,
  brand,
  copy,
}: {
  productsKey: string;
  brand: string | undefined;
  copy: ShopCopy;
}) {
  const { total } = await productsFor(productsKey);
  return (
    <>
      {fill(total === 1 ? copy.productsCountOne : copy.productsCountMany, {
        count: total,
      })}
      {brand ? ` ${fill(copy.fromBrand, { brand })}` : ""}
    </>
  );
}

async function RefineFacets({
  categoryId,
  locale,
  base,
  current,
  copy,
}: {
  categoryId: string | undefined;
  locale: string;
  base: string;
  current: Current;
  copy: ShopCopy;
}) {
  const [brands, stockFacets] = await Promise.all([
    loadBrandFacets(categoryId, locale),
    loadStockFacets(categoryId, current.brand, locale),
  ]);
  const stockLabels = stockLabelsFor(copy);
  return (
    <>
      {stockFacets.length > 0 ? (
        <div className={styles.facetGroup}>
          <span className={styles.facetTitle}>{copy.availability}</span>
          <Link
            href={buildHref(base, current, {
              stock: undefined,
              page: undefined,
            })}
            className={`${styles.facetLink} ${
              !current.stock ? styles.facetLinkActive : ""
            }`}
          >
            {copy.anyAvailability}
          </Link>
          {stockFacets.map((facet) => (
            <Link
              key={facet.state}
              href={buildHref(base, current, {
                stock: facet.state,
                page: undefined,
              })}
              className={`${styles.facetLink} ${
                current.stock === facet.state ? styles.facetLinkActive : ""
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
            href={buildHref(base, current, {
              brand: undefined,
              page: undefined,
            })}
            className={`${styles.facetLink} ${
              !current.brand ? styles.facetLinkActive : ""
            }`}
          >
            {copy.anyBrand}
          </Link>
          {brands.map((facet) => (
            <Link
              key={facet.brand}
              href={buildHref(base, current, {
                brand: facet.brand,
                page: undefined,
              })}
              className={`${styles.facetLink} ${
                current.brand === facet.brand ? styles.facetLinkActive : ""
              }`}
            >
              <span>{facet.brand}</span>
              <span className={styles.facetCount}>{facet.count}</span>
            </Link>
          ))}
        </div>
      ) : null}
    </>
  );
}

async function ProductResults({
  productsKey,
  page,
  term,
  categoryName,
  base,
  current,
  copy,
}: {
  productsKey: string;
  page: number;
  term: string | undefined;
  categoryName: string | null;
  base: string;
  current: Current;
  copy: ShopCopy;
}) {
  const result = await productsFor(productsKey);
  const lastPage = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
  return (
    <>
      {result.items.length === 0 ? (
        <div className={`shop-card ${styles.empty}`}>
          {term ? (
            <>
              <h2>{copy.noProductsFound}</h2>
              <p className="shop-muted">
                {fill(copy.searchEmptyHint, { term })}
              </p>
              <Link className="shop-btn" href={base}>
                {fill(copy.browseX, {
                  what: categoryName
                    ? categoryName.toLowerCase()
                    : copy.theCatalog,
                })}
              </Link>
            </>
          ) : (
            <>
              <h2>{copy.noProductsMatch}</h2>
              <p className="shop-muted">{copy.noProductsHint}</p>
              <Link className="shop-btn" href={base}>
                {copy.clearAllFilters}
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className={styles.grid}>
          {result.items.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {lastPage > 1 ? (
        <nav className={styles.pager} aria-label={copy.paginationAria}>
          {page > 1 ? (
            <Link
              className="shop-btn"
              href={buildHref(base, current, { page: String(page - 1) })}
            >
              {copy.previous}
            </Link>
          ) : null}
          <span className={styles.count}>
            {fill(copy.pageOf, { page, last: lastPage })}
          </span>
          {result.hasMore ? (
            <Link
              className="shop-btn"
              href={buildHref(base, current, { page: String(page + 1) })}
            >
              {copy.next}
            </Link>
          ) : null}
        </nav>
      ) : null}
    </>
  );
}

function FacetsSkeleton() {
  return (
    <div className={styles.facetGroup}>
      <div className="sf-skel" style={{ height: 12, width: 90 }} />
      {Array.from({ length: 4 }).map((_, row) => (
        <div key={row} className="sf-skel" style={{ height: 14 }} />
      ))}
    </div>
  );
}

function ProductGridSkeleton() {
  return (
    <div className={styles.grid}>
      {Array.from({ length: 8 }).map((_, card) => (
        <div key={card} className={`sf-card ${styles.card}`}>
          <div
            className="sf-skel"
            style={{ aspectRatio: "1.5 / 1", borderRadius: 0 }}
          />
          <div className={styles.cardBody}>
            <div className="sf-skel" style={{ height: 10, width: 60 }} />
            <div className="sf-skel" style={{ height: 16 }} />
            <div className="sf-skel" style={{ height: 12, width: 90 }} />
            <div
              className="sf-skel"
              style={{ height: 20, width: 72, marginTop: 4 }}
            />
            <div className="sf-skel" style={{ height: 32, marginTop: 10 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: SearchParams;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const { locale, defaultLocale } = await shopLocale();
  const categories = await loadCategories(locale);

  const category =
    slug === "all" ? null : categories.find((item) => item.slug === slug);
  if (slug !== "all" && !category) notFound();

  const page = Math.max(1, Number(query.page ?? "1") || 1);

  const stockState = toStockState(query.stock);
  const term = query.q?.trim() || undefined;
  const productsKey = JSON.stringify({
    categoryId: category?.id,
    brand: query.brand,
    search: term,
    sort: query.sort,
    stockState,
    page,
    locale,
  } satisfies ProductQuery);

  const copy = copyFor(locale);
  const stockLabels = stockLabelsFor(copy);
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
  const facetsKey = JSON.stringify([slug, query.brand, locale]);

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
              href={href("/c/all")}
              className={`${styles.facetLink} ${
                slug === "all" ? styles.facetLinkActive : ""
              }`}
            >
              {copy.allProducts}
            </Link>
            {categories.map((item) => (
              <Link
                key={item.id}
                href={href(`/c/${item.slug}`)}
                className={`${styles.facetLink} ${
                  item.slug === slug ? styles.facetLinkActive : ""
                }`}
              >
                {item.name}
              </Link>
            ))}
          </div>

          <Suspense key={facetsKey} fallback={<FacetsSkeleton />}>
            <RefineFacets
              categoryId={category?.id}
              locale={locale}
              base={base}
              current={current}
              copy={copy}
            />
          </Suspense>
        </aside>

        <div>
          <div className={styles.toolbar}>
            <span className={styles.count}>
              <Suspense
                key={productsKey}
                fallback={
                  <span
                    className="sf-skel"
                    style={{ display: "inline-block", height: 14, width: 96 }}
                  />
                }
              >
                <ResultCount
                  productsKey={productsKey}
                  brand={query.brand}
                  copy={copy}
                />
              </Suspense>
            </span>
            <div className={styles.sort}>
              <span className="shop-label" style={{ margin: 0 }}>
                {copy.sort}
              </span>
              {SORT_VALUES.map((value) => (
                <Link
                  key={value}
                  href={buildHref(base, current, {
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
                  href={filter.clearHref}
                  className={styles.chip}
                >
                  {filter.label}
                  <span aria-hidden>x</span>
                  <span className="shop-sr">{copy.removeFilter}</span>
                </Link>
              ))}
              <Link href={base} className={styles.chipsReset}>
                {copy.reset}
              </Link>
            </div>
          ) : null}

          <Suspense key={productsKey} fallback={<ProductGridSkeleton />}>
            <ProductResults
              productsKey={productsKey}
              page={page}
              term={term}
              categoryName={category?.name ?? null}
              base={base}
              current={current}
              copy={copy}
            />
          </Suspense>
        </div>
      </div>
    </>
  );
}
