import type { ComponentPropsWithoutRef } from "react";
import { Link } from "react-router";
import { useLocalePath } from "./shop/locale-ui";

type CmssyLinkProps = Omit<ComponentPropsWithoutRef<typeof Link>, "to"> & {
  href?: string | null;
};

export function CmssyLink({ href, ...rest }: CmssyLinkProps) {
  const localePath = useLocalePath();
  const target = href && href.trim() ? href : "#";
  const localized = target.startsWith("/") ? localePath(target) : target;
  return <Link to={localized} {...rest} />;
}
