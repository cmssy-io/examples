"use client";

import Link from "next/link";
import { fill } from "@/lib/shop-copy";
import { Badge } from "./ui/badge";
import { buttonClass } from "./ui/button";
import { useShopCopy } from "./locale-ui";
import type { SkuLineResult } from "./use-add-by-sku";
import styles from "./order.module.css";

export function SkuLineResults({ results }: { results: SkuLineResult[] }) {
  const copy = useShopCopy();
  const added = results.filter((line) => line.ok).length;
  return (
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
  );
}
