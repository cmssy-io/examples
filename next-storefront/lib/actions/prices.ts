"use server";

import type { Product } from "@/lib/catalog";
import { priceProducts } from "@/services/prices";

export async function priceProductsAction(
  products: Product[],
  locale?: string,
): Promise<Product[]> {
  return priceProducts(products, locale);
}
