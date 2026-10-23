"use client";

import { useCart } from "@/components/shop/cart-provider";
import type { ProductData } from "@/graphql/models";
import { addItemAction, findBySkuAction } from "@/lib/actions/cart";
import { localizedText } from "@/lib/localized";
import { PRODUCT_MODEL } from "@/lib/catalog-models";
import { selectionsOf } from "@/lib/variants";
import { useLocalePath, useShopCopy, useShopLocale } from "./locale-ui";

export type SkuLine = { sku: string; quantity: number };

export type SkuLineResult = SkuLine & {
  ok: boolean;
  name?: string;
  reason?: string;
  href?: string;
};

export function useAddBySku() {
  const localePath = useLocalePath();
  const copy = useShopCopy();
  const { locale, defaultLocale } = useShopLocale();
  const { refresh } = useCart();

  async function addLine(line: SkuLine): Promise<SkuLineResult> {
    const lookup = await findBySkuAction(PRODUCT_MODEL, line.sku, locale);
    if ("error" in lookup) return { ...line, ok: false, reason: lookup.error };
    if (lookup.matches.length === 0) {
      return { ...line, ok: false, reason: copy.skuNotFound };
    }
    if (lookup.matches.length > 1) {
      return { ...line, ok: false, reason: copy.skuAmbiguous };
    }
    const [product] = lookup.matches;
    const data = product.data as ProductData;
    const name = localizedText(data.title, { locale, defaultLocale });
    const variant = product.variants[0];
    if (product.variantCount > 0 && !variant) {
      return {
        ...line,
        ok: false,
        name,
        reason: copy.hasOptions,
        href: localePath(`/p/${data.slug}`),
      };
    }
    const result = await addItemAction({
      recordId: product.id,
      quantity: line.quantity,
      ...(variant ? { variantSelections: selectionsOf(variant) } : {}),
    });
    return "error" in result
      ? { ...line, ok: false, name, reason: result.error }
      : { ...line, ok: true, name };
  }

  return async function addLines(
    lines: readonly SkuLine[],
  ): Promise<SkuLineResult[]> {
    const outcome: SkuLineResult[] = [];
    for (const line of lines) outcome.push(await addLine(line));
    if (outcome.some((line) => line.ok)) await refresh();
    return outcome;
  };
}
