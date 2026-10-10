import { data, Link } from "react-router";
import sanitizeHtml from "sanitize-html";
import { BuyBox } from "../components/shop/buy-box";
import styles from "../components/shop/product-detail.module.css";
import { ProductGallery } from "../components/shop/product-gallery";
import { ShopErrorBoundary } from "../components/shop/shop-error";
import { skuCode } from "../components/shop/ui/image-placeholder";
import { localePath } from "../lib/locale-path";
import { shopRouteLocale } from "../lib/locale";
import { stockState } from "../lib/money";
import { copyFor } from "../lib/shop-copy";
import { loadCategories, loadProductBySlug } from "../services/catalog";
import type { Route } from "./+types/product";

export async function loader({ request, params }: Route.LoaderArgs) {
  const { locale, defaultLocale } = await shopRouteLocale(request, params);
  const [product, categories] = await Promise.all([
    loadProductBySlug(params.slug, locale),
    loadCategories(locale),
  ]);
  if (!product) throw data(null, { status: 404 });

  const category =
    categories.find((item) => item.id === product.categoryId) ?? null;
  return {
    locale,
    defaultLocale,
    product,
    category,
    descriptionHtml: product.description
      ? sanitizeHtml(product.description)
      : null,
    descriptionText: product.description
      ? sanitizeHtml(product.description, { allowedTags: [] }).slice(0, 160)
      : null,
  };
}

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData) return [];
  const { product, descriptionText } = loaderData;
  return [
    { title: `${product.title} (${product.sku}) - MACHTEC` },
    ...(descriptionText
      ? [{ name: "description", content: descriptionText }]
      : []),
  ];
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return <ShopErrorBoundary error={error} />;
}

export default function ProductPage({ loaderData }: Route.ComponentProps) {
  const { locale, defaultLocale, product, category, descriptionHtml } =
    loaderData;
  const href = (path: string) => localePath(path, locale, defaultLocale);
  const copy = copyFor(locale);
  const specs = product.specs;
  const outOfStock = stockState(product.inventory) === "out";

  return (
    <>
      <nav className={styles.crumbs} aria-label={copy.breadcrumbAria}>
        <Link to={href("/")}>{copy.shop}</Link> /{" "}
        {category ? (
          <>
            <Link to={href(`/c/${category.slug}`)}>{category.name}</Link> /{" "}
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
        {descriptionHtml ? (
          <div
            className={styles.prose}
            dangerouslySetInnerHTML={{ __html: descriptionHtml }}
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
