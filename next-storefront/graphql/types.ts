

import type {
  CartQuery,
  CheckoutMutation,
  MyOrderQuery,
  MyOrdersQuery,
  ProductBySkuQuery,
  PublicOrderQuery,
  ShopSettingsQuery,
} from "@/graphql/generated/graphql";

export type Cart = NonNullable<CartQuery["cart"]["get"]>;
export type CartItem = Cart["items"][number];

export type Order = NonNullable<MyOrderQuery["account"]["order"]>;

export type MyOrders = MyOrdersQuery["account"]["orders"];

export type PublicOrder = NonNullable<
  PublicOrderQuery["public"]["order"]["byToken"]
>;

export type CheckoutOrder = NonNullable<CheckoutMutation["cart"]["checkout"]>;

export type SkuMatch =
  ProductBySkuQuery["public"]["model"]["records"]["items"][number];

export type OrderField = NonNullable<
  NonNullable<ShopSettingsQuery["public"]["siteConfig"]>["publicCart"]
>["orderFields"][number];
