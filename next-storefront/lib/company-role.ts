import type { AccountOrderScope } from "@/graphql/generated/graphql";
import type { ShopCopy } from "@/lib/shop-copy";

export const COMPANY_ORDERS_PERMISSION = "orders.company.read";

export interface CompanyRoleView {
  role: string;
  permissions: readonly string[];
}

export function canReadCompanyOrders(
  company: CompanyRoleView | null | undefined,
): boolean {
  return company?.permissions.includes(COMPANY_ORDERS_PERMISSION) ?? false;
}

// What the member's company role lets them do, in the shop's words. Every
// member places and reads their own orders; a permission this storefront has
// no wording for is shown as the API names it.
export function roleAllowances(
  company: CompanyRoleView,
  copy: ShopCopy,
): string[] {
  const known: Record<string, string> = {
    [COMPANY_ORDERS_PERMISSION]: copy.permissionCompanyOrders,
  };
  return [
    copy.permissionOwnOrders,
    ...company.permissions.map((permission) => known[permission] ?? permission),
  ];
}

export function orderScopeFor(
  requested: string | undefined,
  company: CompanyRoleView | null | undefined,
): AccountOrderScope {
  return requested === "company" && canReadCompanyOrders(company)
    ? "COMPANY"
    : "MINE";
}
