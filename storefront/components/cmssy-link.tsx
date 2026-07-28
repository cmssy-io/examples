"use client";

import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";
import { useLocalePath } from "@/components/shop/locale-ui";

type CmssyLinkProps = Omit<ComponentPropsWithoutRef<typeof Link>, "href"> & {
  href?: string | null;
};

export function CmssyLink({ href, ...rest }: CmssyLinkProps) {
  const localePath = useLocalePath();
  const target = href && href.trim() ? href : "#";
  const localized = target.startsWith("/") ? localePath(target) : target;
  return <Link href={localized} {...rest} />;
}
