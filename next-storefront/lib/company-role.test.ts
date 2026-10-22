import { describe, expect, it } from "vitest";
import {
  canReadCompanyOrders,
  orderScopeFor,
  roleAllowances,
} from "./company-role";
import { copyFor } from "./shop-copy";

const copy = copyFor("en");
const admin = { role: "admin", permissions: ["orders.company.read"] };
const buyer = { role: "buyer", permissions: [] };

describe("canReadCompanyOrders", () => {
  it("is true only with the orders.company.read permission", () => {
    expect(canReadCompanyOrders(admin)).toBe(true);
    expect(canReadCompanyOrders(buyer)).toBe(false);
    expect(canReadCompanyOrders(null)).toBe(false);
  });

  it("branches on the permission, not on the role name", () => {
    expect(canReadCompanyOrders({ role: "admin", permissions: [] })).toBe(
      false,
    );
    expect(
      canReadCompanyOrders({
        role: "purchaser",
        permissions: ["orders.company.read"],
      }),
    ).toBe(true);
  });
});

describe("roleAllowances", () => {
  it("lets every member place and see their own orders", () => {
    expect(roleAllowances(buyer, copy)).toEqual([copy.permissionOwnOrders]);
  });

  it("adds company orders for an admin and names unknown permissions raw", () => {
    expect(
      roleAllowances(
        {
          role: "admin",
          permissions: ["orders.company.read", "quotes.approve"],
        },
        copy,
      ),
    ).toEqual([
      copy.permissionOwnOrders,
      copy.permissionCompanyOrders,
      "quotes.approve",
    ]);
  });
});

describe("orderScopeFor", () => {
  it("lists company orders only when asked and permitted", () => {
    expect(orderScopeFor("company", admin)).toBe("COMPANY");
    expect(orderScopeFor("company", buyer)).toBe("MINE");
    expect(orderScopeFor(undefined, admin)).toBe("MINE");
    expect(orderScopeFor("company", null)).toBe("MINE");
  });
});
