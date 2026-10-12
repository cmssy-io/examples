import type {
  Product,
  ProductVariant,
  VariantOption,
} from "../services/catalog";
import type { ShopCopy } from "./shop-copy";

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

export function selectionsOf(variant: ProductVariant): VariantSelection {
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

const VARIANT_STATE_PAGES = [
  "v0",
  "v1",
  "v2",
  "v3",
  "v4",
  "v5",
  "v6",
  "v7",
  "v8",
  "v9",
] as const;

const MAX_VARIANT_READS = 2 * VARIANT_STATE_PAGES.length + 1;

export interface VariantState {
  id: string;
  sku: string | null;
  price: number;
}

export type VariantStatePages = Record<
  (typeof VARIANT_STATE_PAGES)[number],
  VariantState[]
>;

export function variantStates(pages: VariantStatePages): VariantState[] {
  return VARIANT_STATE_PAGES.flatMap((key) => pages[key]);
}

export interface VariantRead<V, H> {
  id: string;
  variantCount: number;
  states: VariantState[];
  page: V[];
  head: H;
}

export async function readAllVariants<V extends VariantState, H>(
  record: { id: string; variantCount: number; variants: V[] },
  at: (offset: number) => Promise<VariantRead<V, H> | null>,
): Promise<{ variants: V[]; head: H | null } | null> {
  const first = record.variants;
  if (first.length >= record.variantCount) {
    return { variants: first, head: null };
  }
  const held = new Map(first.map((variant) => [variant.id, variant]));
  let offset = first.length;
  for (let n = 0; n < MAX_VARIANT_READS; n++) {
    const read = await at(offset);
    if (read === null || read.id !== record.id) return null;
    if (read.states.length !== read.variantCount) {
      throw new Error(
        `The product has ${read.variantCount} variants and the variant page query reads ${read.states.length}: add a page alias to it`,
      );
    }
    for (const variant of read.page) held.set(variant.id, variant);
    const stale = read.states.findIndex((state) => {
      const variant = held.get(state.id);
      return (
        !variant || variant.sku !== state.sku || variant.price !== state.price
      );
    });
    if (stale === -1) {
      return {
        variants: read.states.map((state) => held.get(state.id) as V),
        head: read.head,
      };
    }
    offset = stale;
  }
  throw new Error("The product's variants kept changing while it was read");
}
