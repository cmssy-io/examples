"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/components/shop/cart-provider";
import type { ProductData } from "@/graphql/models";
import { addItemAction, findBySkuAction } from "@/lib/actions/cart";
import { localizedText } from "@/lib/localized";
import { PRODUCT_MODEL } from "@/lib/catalog-models";
import { selectionsOf } from "@/lib/variants";
import { Badge } from "./ui/badge";
import { Button, buttonClass } from "./ui/button";
import { useLocalePath, useShopCopy, useShopLocale } from "./locale-ui";
import { fill } from "@/lib/shop-copy";
import styles from "./order.module.css";

type Line = { sku: string; quantity: number };
type Result = {
  sku: string;
  quantity: number;
  ok: boolean;
  name?: string;
  reason?: string;
  href?: string;
};

function parseLines(input: string): Line[] {
  return input
    .split("\n")
    .map((row) => row.trim())
    .filter(Boolean)
    .map((row) => {
      const counted = row.match(/^(.+?)[\s,;]+(\d+(?:\.\d+)?)$/);
      const parsed = counted ? Math.floor(Number(counted[2])) : 1;
      return {
        sku: (counted ? counted[1] : row).trim(),
        quantity: parsed > 0 ? parsed : 1,
      };
    })
    .filter((line) => line.sku.length > 0);
}

export function QuickOrder() {
  const localePath = useLocalePath();
  const copy = useShopCopy();
  const { locale, defaultLocale } = useShopLocale();
  const { refresh } = useCart();
  const [input, setInput] = useState("");
  const [results, setResults] = useState<Result[] | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setResults(null);

    const lines = parseLines(input);
    const outcome: Result[] = [];

    try {
      for (const line of lines) {
        const lookup = await findBySkuAction(PRODUCT_MODEL, line.sku, locale);
        if ("error" in lookup) {
          outcome.push({ ...line, ok: false, reason: lookup.error });
          continue;
        }
        if (lookup.matches.length === 0) {
          outcome.push({ ...line, ok: false, reason: copy.skuNotFound });
          continue;
        }
        if (lookup.matches.length > 1) {
          outcome.push({ ...line, ok: false, reason: copy.skuAmbiguous });
          continue;
        }
        const [product] = lookup.matches;
        const data = product.data as ProductData;
        const name = localizedText(data.title, { locale, defaultLocale });
        const variant = product.variants[0];
        if (product.variantCount > 0 && !variant) {
          outcome.push({
            ...line,
            ok: false,
            name,
            reason: copy.hasOptions,
            href: localePath(`/p/${data.slug}`),
          });
          continue;
        }
        const result = await addItemAction({
          recordId: product.id,
          quantity: line.quantity,
          ...(variant ? { variantSelections: selectionsOf(variant) } : {}),
        });
        if ("error" in result) {
          outcome.push({ ...line, ok: false, name, reason: result.error });
        } else {
          outcome.push({ ...line, ok: true, name });
        }
      }
      setResults(outcome);
    } finally {
      setBusy(false);
    }

    if (outcome.some((line) => line.ok)) await refresh();
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

      {results ? (
        <div
          className={`shop-card ${styles.qResult}`}
          style={{ marginTop: 20 }}
        >
          <div className={`${styles.qRow} ${styles.qHead}`}>
            <span>SKU</span>
            <span>{copy.product}</span>
            <span className={styles.qNum}>{copy.qty}</span>
            <span className={styles.qStatus}>{copy.status}</span>
          </div>
          {results.map((line, index) => (
            <div key={`${line.sku}-${index}`} className={styles.qRow}>
              <span className={styles.qSku}>{line.sku}</span>
              <span className="shop-muted">{line.name ?? "—"}</span>
              <span className={styles.qNum}>{line.quantity}</span>
              <span className={styles.qStatus}>
                {line.href ? (
                  <Link
                    href={line.href}
                    className={buttonClass("outline", "sm")}
                  >
                    {copy.chooseOptions}
                  </Link>
                ) : (
                  <Badge variant={line.ok ? "success" : "destructive"}>
                    {line.ok ? copy.added : (line.reason ?? copy.couldNotAdd)}
                  </Badge>
                )}
              </span>
            </div>
          ))}
          <div className={styles.qFoot}>
            {fill(copy.quickOrderSummary, {
              added,
              total: results.length,
            })}
          </div>
        </div>
      ) : null}
    </form>
  );
}
