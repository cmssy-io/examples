import { notFound } from "next/navigation";
import Link from "next/link";
import sanitizeHtml from "sanitize-html";
import { loadCategories, loadProductBySlug } from "@/lib/catalog";
import { BuyBox } from "@/components/shop/buy-box";
import { ProductGallery } from "@/components/shop/product-gallery";
import { skuCode } from "@/components/shop/ui/image-placeholder";
import { localePath, shopLocale } from "@/lib/locale";
import { stockState } from "@/lib/money";
import { copyFor } from "@/lib/shop-copy";
import styles from "@/components/shop/product-detail.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { locale } = await shopLocale();
  const product = await loadProductBySlug(slug, locale);
  if (!product) {
    return { title: `${copyFor(locale).productNotFound} - MACHTEC` };
  }
  return {
    title: `${product.title} (${product.sku}) - MACHTEC`,
    description: product.description
      ? sanitizeHtml(product.description, { allowedTags: [] }).slice(0, 160)
      : undefined,
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { locale, defaultLocale } = await shopLocale();
  const [product, categories] = await Promise.all([
    loadProductBySlug(slug, locale),
    loadCategories(locale),
  ]);
  const href = (path: string) => localePath(path, locale, defaultLocale);
  const copy = copyFor(locale);

  if (!product) notFound();

  const category = categories.find((item) => item.id === product.categoryId);
  const specs = product.specs;
  const outOfStock = stockState(product.inventory) === "out";

  return (
    <>
      <nav className={styles.crumbs} aria-label={copy.breadcrumbAria}>
        <Link href={href("/")}>{copy.shop}</Link> /{" "}
        {category ? (
          <>
            <Link href={href(`/c/${category.slug}`)}>{category.name}</Link>{" "}
            /{" "}
          </>
        ) : null}
        <span>{product.title}</span>
      </nav>

      <div className={styles.layout}>
        <ProductGallery
          images={
            product.gallery.length
              ? product.gallery
              : product.image
                ? [product.image]
                : []
          }
          code={skuCode(product.sku)}
          alt={product.title}
          outOfStock={outOfStock}
          outOfStockLabel={copy.outOfStock}
        />

        <div>
          <span className={styles.sku}>{product.sku}</span>
          <h1 className={styles.title}>{product.title}</h1>
          {product.brand ? (
            <p className={styles.brand}>
              {copy.by} {product.brand}
            </p>
          ) : null}

          <BuyBox product={product} categorySlug={category?.slug ?? null} />
        </div>
      </div>

      <div className={styles.details}>
        {product.description ? (
          <div
            className={styles.prose}
            dangerouslySetInnerHTML={{
              __html: sanitizeHtml(product.description),
            }}
          />
        ) : null}

        {specs ? (
          <section>
            <h2 className={styles.sectionTitle}>{copy.technicalData}</h2>
            <table className={styles.specs}>
              <tbody>
                {specs.material ? (
                    <tr>
                      <th scope="row">{copy.material}</th>
                      <td>{specs.material}</td>
                    </tr>
                  ) : null}
                  {specs.dimensions ? (
                    <tr>
                      <th scope="row">{copy.dimensions}</th>
                      <td>{specs.dimensions}</td>
                    </tr>
                  ) : null}
                  {specs.weightKg ? (
                    <tr>
                      <th scope="row">{copy.weight}</th>
                      <td>{specs.weightKg} kg</td>
                    </tr>
                  ) : null}
                  {specs.standard ? (
                    <tr>
                      <th scope="row">{copy.standard}</th>
                      <td>{specs.standard}</td>
                    </tr>
                  ) : null}
                  {specs.operatingTemp ? (
                    <tr>
                      <th scope="row">{copy.operatingTemperature}</th>
                      <td>{specs.operatingTemp}</td>
                    </tr>
                  ) : null}
                  <tr>
                    <th scope="row">{copy.unit}</th>
                    <td>{product.unit ?? "pcs"}</td>
                  </tr>
                </tbody>
              </table>
            </section>
        ) : null}
      </div>
    </>
  );
}
