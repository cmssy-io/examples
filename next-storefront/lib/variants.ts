import type { Product, ProductVariant, VariantOption } from "@/lib/catalog";
import type { ShopCopy } from "@/lib/shop-copy";

const AXIS_ORDER = ["size", "pack"];

const AXIS_LABEL: Record<string, keyof ShopCopy> = {
  size: "optionSize",
  pack: "optionPack",
};

export type VariantAxis = { name: string; values: string[] };

export type VariantSelection = Record<string, string>;

function axisRank(name: string): number {
  const index = AXIS_ORDER.indexOf(name);
  return index === -1 ? AXIS_ORDER.length : index;
}

export function axisLabel(copy: ShopCopy, name: string): string {
  const key = AXIS_LABEL[name];
  return key ? copy[key] : name;
}

export function variantAxes(variants: ProductVariant[]): VariantAxis[] {
  const axes = new Map<string, string[]>();
  for (const variant of variants) {
    for (const { name, value } of variant.selectedOptions) {
      const values = axes.get(name) ?? [];
      if (!values.includes(value)) values.push(value);
      axes.set(name, values);
    }
  }
  return [...axes.entries()]
    .map(([name, values]) => ({ name, values }))
    .sort((a, b) => axisRank(a.name) - axisRank(b.name));
}

export function optionOf(
  variant: ProductVariant,
  axis: string,
): string | undefined {
  return variant.selectedOptions.find((option) => option.name === axis)?.value;
}

function matches(
  variant: ProductVariant,
  selection: VariantSelection,
  axes: string[],
): boolean {
  return axes.every(
    (axis) => !selection[axis] || optionOf(variant, axis) === selection[axis],
  );
}

export function optionAvailable(
  variants: ProductVariant[],
  axes: VariantAxis[],
  selection: VariantSelection,
  axisIndex: number,
  value: string,
): boolean {
  const earlier = axes.slice(0, axisIndex).map((axis) => axis.name);
  const axis = axes[axisIndex].name;
  return variants.some(
    (variant) =>
      optionOf(variant, axis) === value && matches(variant, selection, earlier),
  );
}

export function selectOption(
  variants: ProductVariant[],
  axes: VariantAxis[],
  selection: VariantSelection,
  axis: string,
  value: string,
): VariantSelection {
  const next: VariantSelection = { ...selection, [axis]: value };
  axes.forEach((candidate, index) => {
    const chosen = next[candidate.name];
    if (chosen && !optionAvailable(variants, axes, next, index, chosen)) {
      delete next[candidate.name];
    }
  });
  return next;
}

export function findVariant(
  variants: ProductVariant[],
  axes: VariantAxis[],
  selection: VariantSelection,
): ProductVariant | null {
  if (axes.some((axis) => !selection[axis.name])) return null;
  return (
    variants.find((variant) =>
      axes.every(
        (axis) => optionOf(variant, axis.name) === selection[axis.name],
      ),
    ) ?? null
  );
}

export function selectionsOf(
  variant: Pick<ProductVariant, "selectedOptions">,
): VariantSelection {
  return Object.fromEntries(
    variant.selectedOptions.map(({ name, value }) => [name, value]),
  );
}

function selectionEntries(selections: unknown): VariantOption[] {
  if (
    !selections ||
    typeof selections !== "object" ||
    Array.isArray(selections)
  ) {
    return [];
  }
  return Object.entries(selections)
    .filter(
      (entry): entry is [string, string] =>
        typeof entry[1] === "string" && entry[1] !== "",
    )
    .map(([name, value]) => ({ name, value }))
    .sort(
      (a, b) =>
        axisRank(a.name) - axisRank(b.name) || a.name.localeCompare(b.name),
    );
}

export function selectionLabel(selections: unknown): string | null {
  const entries = selectionEntries(selections);
  return entries.length > 0
    ? entries.map((entry) => entry.value).join(" · ")
    : null;
}

export function selectionKey(selections: unknown): string {
  return JSON.stringify(
    selectionEntries(selections).map(({ name, value }) => [name, value]),
  );
}

export function variantInStock(
  variant: Pick<ProductVariant, "inventory">,
): boolean {
  return variant.inventory === null || variant.inventory > 0;
}

export function productOutOfStock(
  product: Pick<Product, "available" | "variants">,
): boolean {
  if (product.variants.length === 0) {
    return product.available !== null && product.available <= 0;
  }
  return !product.variants.some(variantInStock);
}
