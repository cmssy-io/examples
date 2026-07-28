import type { ReactNode } from "react";
import styles from "./badge.module.css";

export type BadgeVariant =
  | "success"
  | "warning"
  | "info"
  | "destructive"
  | "neutral";

export function Badge({
  variant = "neutral",
  children,
  className,
}: {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={[styles.badge, styles[variant], className].filter(Boolean).join(" ")}>
      {children}
    </span>
  );
}
