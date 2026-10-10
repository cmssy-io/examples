import type { ComponentPropsWithoutRef } from "react";
import { useLocalePath } from "./shop/locale-ui";

type CmssyLinkProps = Omit<ComponentPropsWithoutRef<"a">, "href"> & {
  href?: string | null;
};

export function CmssyLink({ href, ...rest }: CmssyLinkProps) {
  const localePath = useLocalePath();
  const target = href && href.trim() ? href : "#";
  const localized = target.startsWith("/") ? localePath(target) : target;
  return <a href={localized} {...rest} />;
}
