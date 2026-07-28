

import type {
  CartQuery,
  CheckoutMutation,
  MyOrderQuery,
  MyOrdersQuery,
  ProductQuery,
  PublicOrderQuery,
} from "@/graphql/generated/graphql";

export type Cart = NonNullable<CartQuery["cart"]["get"]>;
export type CartItem = Cart["items"][number];

export type Order = NonNullable<MyOrderQuery["account"]["order"]>;

export type MyOrders = MyOrdersQuery["account"]["orders"];

export type PublicOrder = NonNullable<
  PublicOrderQuery["public"]["order"]["byToken"]
>;

export type CheckoutOrder = NonNullable<CheckoutMutation["cart"]["checkout"]>;

export type Product = ProductQuery["public"]["model"]["records"]["items"][number];
