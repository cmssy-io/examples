"use client";

import { useState } from "react";
import Link from "next/link";
import type { Order } from "@/graphql/types";
import { fill } from "@/lib/shop-copy";
import { reorderLines } from "@/lib/reorder-lines";
import { Button, buttonClass } from "./ui/button";
import { useLocalePath, useShopCopy } from "./locale-ui";
import { SkuLineResults } from "./sku-line-results";
import { useAddBySku, type SkuLineResult } from "./use-add-by-sku";
import styles from "./order.module.css";

export function ReorderButton({ items }: { items: Order["items"] }) {
  const localePath = useLocalePath();
  const copy = useShopCopy();
  const addLines = useAddBySku();
  const [results, setResults] = useState<SkuLineResult[] | null>(null);
  const [busy, setBusy] = useState(false);
  const lines = reorderLines(items);

  if (lines.length === 0) return null;

  async function reorder() {
    setBusy(true);
    setResults(null);
    try {
      setResults(await addLines(lines));
    } finally {
      setBusy(false);
    }
  }

  const added = results?.filter((line) => line.ok).length ?? 0;

  return (
    <div className={styles.reorder}>
      <div className={styles.actions}>
        <Button onClick={reorder} disabled={busy}>
          {busy ? copy.addingLines : copy.orderAgain}
        </Button>
        {added > 0 ? (
          <Link
            className={buttonClass("outline", "md")}
            href={localePath("/cart")}
          >
            {fill(copy.goToCartAdded, { count: added })}
          </Link>
        ) : null}
      </div>
      {results ? <SkuLineResults results={results} /> : null}
    </div>
  );
}
