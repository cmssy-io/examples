import Link from "next/link";
import { notFound } from "next/navigation";
import { loadBrandBySlug } from "@/lib/catalog-cached";
import { ProductCard } from "@/components/shop/product-card";
import { localePath, shopLocale } from "@/lib/locale";
import { copyFor, fill } from "@/lib/shop-copy";
import { pageTitle } from "@/services/site";
import { loadPricedProducts } from "@/services/prices";
import styles from "@/components/shop/catalog.module.css";

export const dynamic = "force-dynamic";

const BRAND_PAGE_LIMIT = 100;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { locale } = await shopLocale();
  const brand = await loadBrandBySlug(slug, locale);
  if (!brand) {
    return { title: await pageTitle(copyFor(locale).brandNotFound) };
  }
  return {
    title: await pageTitle(brand.name),
    description: brand.description?.slice(0, 160),
  };
}

export default async function BrandPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { locale, defaultLocale } = await shopLocale();
  const brand = await loadBrandBySlug(slug, locale);
  if (!brand) notFound();

  const { items, total } = await loadPricedProducts({
    brandId: brand.id,
    limit: BRAND_PAGE_LIMIT,
    locale,
  });
  const copy = copyFor(locale);
  const href = (path: string) => localePath(path, locale, defaultLocale);

  return (
    <>
      {brand.logo ? (
        <img src={brand.logo} alt={brand.name} height={48} />
      ) : null}
      <h1 style={{ marginTop: 0 }}>{brand.name}</h1>
      {brand.country ? <p className="shop-muted">{brand.country}</p> : null}
      {brand.description ? <p>{brand.description}</p> : null}
      {brand.website ? (
        <p>
          <a href={brand.website} target="_blank" rel="noopener noreferrer">
            {copy.brandWebsite}
          </a>
        </p>
      ) : null}

      <p className={styles.count}>
        {fill(total === 1 ? copy.productsCountOne : copy.productsCountMany, {
          count: total,
        })}
      </p>
      {items.length === 0 ? (
        <div className={`shop-card ${styles.empty}`}>
          <h2>{copy.noProductsMatch}</h2>
          <Link className="shop-btn" href={href("/c/all")}>
            {copy.allProducts}
          </Link>
        </div>
      ) : (
        <div className={styles.grid}>
          {items.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </>
  );
}
