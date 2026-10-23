"use client";

import { usePathname } from "next/navigation";
import { useShopCopy } from "./locale-ui";
import styles from "./channel-banner.module.css";

export function draftExitHref(pathname: string): string {
  return `/api/draft?disable=1&redirect=${encodeURIComponent(pathname)}`;
}

export function DraftBanner() {
  const copy = useShopCopy();
  const pathname = usePathname();

  return (
    <div className={styles.banner} role="status">
      <span>{copy.draftBanner}</span>
      <a className={styles.link} href={draftExitHref(pathname)}>
        {copy.draftExit}
      </a>
    </div>
  );
}
