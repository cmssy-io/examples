import type {
  CartQuery,
  CheckoutMutation,
  PublicOrderQuery,
} from "./generated/graphql";

export type Cart = NonNullable<CartQuery["cart"]["get"]>;
export type CartItem = Cart["items"][number];

export type PublicOrder = NonNullable<
  PublicOrderQuery["public"]["order"]["byToken"]
>;

export type CheckoutOrder = NonNullable<CheckoutMutation["cart"]["checkout"]>;
