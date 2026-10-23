"use client";

import { useState } from "react";
import Link from "next/link";
import { fill } from "@/lib/shop-copy";
import { Button, buttonClass } from "./ui/button";
import { useLocalePath, useShopCopy } from "./locale-ui";
import { SkuLineResults } from "./sku-line-results";
import {
  useAddBySku,
  type SkuLine,
  type SkuLineResult,
} from "./use-add-by-sku";

function parseLines(input: string): SkuLine[] {
  return input
    .split("\n")
    .map((row) => row.trim())
    .filter(Boolean)
    .map((row) => {
      const counted = row.match(/^(.+?)[\s,;]+(\d+(?:\.\d+)?)$/);
      const parsed = counted ? Math.floor(Number(counted[2])) : 1;
      return {
        sku: (counted ? counted[1] : row).trim(),
        quantity: Number.isFinite(parsed) && parsed > 0 ? parsed : 1,
      };
    })
    .filter((line) => line.sku.length > 0);
}

export function QuickOrder() {
  const localePath = useLocalePath();
  const copy = useShopCopy();
  const addLines = useAddBySku();
  const [input, setInput] = useState("");
  const [results, setResults] = useState<SkuLineResult[] | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setResults(null);
    try {
      setResults(await addLines(parseLines(input)));
    } finally {
      setBusy(false);
    }
  }

  const added = results?.filter((line) => line.ok).length ?? 0;

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 640 }} data-quick-order>
      <label className="shop-label" htmlFor="lines">
        {copy.quickOrderHint}
      </label>
      <textarea
        id="lines"
        className="shop-input"
        rows={8}
        placeholder={"BRG-6204-2RS, 50\nHYD-H2SN12 200\nPNU-SILG14;25"}
        value={input}
        onChange={(event) => setInput(event.target.value)}
        style={{
          height: "auto",
          minHeight: 200,
          padding: 12,
          lineHeight: 1.7,
          fontFamily: "var(--font-mono)",
          resize: "vertical",
        }}
      />

      <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
        <Button type="submit" disabled={busy || !input.trim()}>
          {busy ? copy.addingLines : copy.addAllToCart}
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
    </form>
  );
}
