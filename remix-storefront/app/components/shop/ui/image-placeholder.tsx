import type { CSSProperties } from "react";
import styles from "./image-placeholder.module.css";

export function ImagePlaceholder({
  code,
  className,
  codeSize = 22,
  style,
}: {
  code: string;
  className?: string;
  codeSize?: number;
  style?: CSSProperties;
}) {
  return (
    <div
      className={[styles.ph, className].filter(Boolean).join(" ")}
      style={style}
      aria-hidden
    >
      <span className={styles.code} style={{ fontSize: codeSize }}>
        {code}
      </span>
    </div>
  );
}

export function skuCode(sku: string | null | undefined): string {
  if (!sku) return "—";
  const prefix = sku.split(/[-\s]/)[0];
  return prefix ? prefix.toUpperCase() : "—";
}
