import styles from "../components/shop/catalog.module.css";
import { shopIsland } from "../components/shop/island";
import { ProductCard } from "../components/shop/product-card";
import type { Product } from "../services/catalog";

function CatalogGrid({ products }: { products: Product[] }) {
  return (
    <div className={styles.grid}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} quickAdd />
      ))}
    </div>
  );
}

export const CatalogGridIsland = shopIsland(CatalogGrid);
