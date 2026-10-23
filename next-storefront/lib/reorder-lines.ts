type OrderLine = { sku?: string | null; quantity: number };

export function reorderLines(items: readonly OrderLine[]) {
  const totals = new Map<string, number>();
  for (const item of items) {
    const sku = item.sku?.trim();
    if (!sku || item.quantity <= 0) continue;
    totals.set(sku, (totals.get(sku) ?? 0) + item.quantity);
  }
  return [...totals].map(([sku, quantity]) => ({ sku, quantity }));
}
