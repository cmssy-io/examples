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
      <svg
        className={styles.icon}
        style={{ width: codeSize * 1.6, height: codeSize * 1.6 }}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="9" cy="9" r="2" />
        <path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" />
      </svg>
      <span className={styles.code} style={{ fontSize: codeSize * 0.55 }}>
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
