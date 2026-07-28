import type { ShippingAddressInput } from "@/graphql/generated/graphql";
import type { Cart, CheckoutOrder, Product } from "@/graphql/types";
import { cartRequest } from "@/lib/cmssy/cart-request";
import {
  AddToCartDocument,
  ApplyDiscountDocument,
  CartDocument,
  CheckoutDocument,
  ClearCartDocument,
  MergeCartDocument,
  ProductDocument,
  RemoveCartItemDocument,
  RemoveDiscountDocument,
  SetShippingMethodDocument,
  UpdateCartItemDocument,
} from "@/graphql/generated/graphql";

export interface AddToCartInput {
  recordId: string;
  quantity: number;
  variantSelections?: Record<string, string>;
}

export interface UpdateItemInput {
  itemId: string;
  quantity: number;
}

export interface CheckoutInput {
  customerEmail: string;
  poNumber: string | null;
  customerNote: string | null;
  shippingAddress: ShippingAddressInput | null;
}

export function getCart(): Promise<Cart | null> {
  return cartRequest(
    CartDocument,
    (workspaceId) => ({ workspaceId }),
  ).then((data) => data.cart.get);
}

export function addToCart(input: AddToCartInput): Promise<Cart> {
  return cartRequest(
    AddToCartDocument,
    (workspaceId) => ({ input: { workspaceId, ...input } }),
  ).then((data) => data.cart.addItem);
}

export function updateItem(input: UpdateItemInput): Promise<Cart> {
  return cartRequest(
    UpdateCartItemDocument,
    (workspaceId) => ({ input: { workspaceId, ...input } }),
  ).then((data) => data.cart.updateItem);
}

export function removeItem(itemId: string): Promise<Cart> {
  return cartRequest(
    RemoveCartItemDocument,
    (workspaceId) => ({ workspaceId, itemId }),
  ).then((data) => data.cart.removeItem);
}

export function clearCart(): Promise<Cart> {
  return cartRequest(
    ClearCartDocument,
    (workspaceId) => ({ workspaceId }),
  ).then((data) => data.cart.clear);
}

export function applyDiscount(code: string): Promise<Cart> {
  return cartRequest(
    ApplyDiscountDocument,
    (workspaceId) => ({ workspaceId, code }),
  ).then((data) => data.cart.applyDiscount);
}

export function removeDiscount(): Promise<Cart> {
  return cartRequest(
    RemoveDiscountDocument,
    (workspaceId) => ({ workspaceId }),
  ).then((data) => data.cart.removeDiscount);
}

export function setShippingMethod(
  shippingMethodId: string | null,
): Promise<Cart> {
  return cartRequest(
    SetShippingMethodDocument,
    (workspaceId) => ({ workspaceId, shippingMethodId }),
  ).then((data) => data.cart.setShippingMethod);
}

export function mergeCart(): Promise<Cart> {
  return cartRequest(
    MergeCartDocument,
    (workspaceId) => ({ workspaceId }),
  ).then((data) => data.cart.merge);
}

export function checkout(input: CheckoutInput): Promise<CheckoutOrder> {
  return cartRequest(
    CheckoutDocument,
    (workspaceId) => ({ input: { workspaceId, ...input } }),
  ).then((data) => data.cart.checkout);
}

export function findProduct(
  modelSlug: string,
  filter: Record<string, unknown>,
): Promise<Product | null> {
  return cartRequest(
    ProductDocument,
    (workspaceId) => ({ workspaceId, modelSlug, filter }),
  ).then((data) => data.public.model.records.items[0] ?? null);
}
