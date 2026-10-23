import type { ShippingAddressInput } from "@/graphql/generated/graphql";
import type { Cart, CheckoutOrder, SkuMatch } from "@/graphql/types";
import { cartRequest } from "@/lib/cmssy/cart-request";
import {
  AddToCartDocument,
  ApplyDiscountDocument,
  CartDocument,
  CheckoutDocument,
  ClearCartDocument,
  MergeCartDocument,
  ProductBySkuDocument,
  RemoveCartItemDocument,
  RemoveDiscountDocument,
  SetShippingAddressDocument,
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
  customFields: Record<string, unknown> | null;
  shippingAddress: ShippingAddressInput | null;
  expectedTotal: number;
}

export function getCart(): Promise<Cart | null> {
  return cartRequest(
    CartDocument,
    (workspaceId, channel) => ({ workspaceId, channel }),
  ).then((data) => data.cart.get);
}

export function addToCart(input: AddToCartInput): Promise<Cart> {
  return cartRequest(
    AddToCartDocument,
    (workspaceId, channel) => ({ input: { workspaceId, channel, ...input } }),
  ).then((data) => data.cart.addItem);
}

export function updateItem(input: UpdateItemInput): Promise<Cart> {
  return cartRequest(
    UpdateCartItemDocument,
    (workspaceId, channel) => ({ input: { workspaceId, channel, ...input } }),
  ).then((data) => data.cart.updateItem);
}

export function removeItem(itemId: string): Promise<Cart> {
  return cartRequest(
    RemoveCartItemDocument,
    (workspaceId, channel) => ({ workspaceId, channel, itemId }),
  ).then((data) => data.cart.removeItem);
}

export function clearCart(): Promise<Cart> {
  return cartRequest(
    ClearCartDocument,
    (workspaceId, channel) => ({ workspaceId, channel }),
  ).then((data) => data.cart.clear);
}

export function applyDiscount(code: string): Promise<Cart> {
  return cartRequest(
    ApplyDiscountDocument,
    (workspaceId, channel) => ({ workspaceId, channel, code }),
  ).then((data) => data.cart.applyDiscount);
}

export function removeDiscount(): Promise<Cart> {
  return cartRequest(
    RemoveDiscountDocument,
    (workspaceId, channel) => ({ workspaceId, channel }),
  ).then((data) => data.cart.removeDiscount);
}

export function setShippingMethod(
  shippingMethodId: string | null,
): Promise<Cart> {
  return cartRequest(
    SetShippingMethodDocument,
    (workspaceId, channel) => ({ workspaceId, channel, shippingMethodId }),
  ).then((data) => data.cart.setShippingMethod);
}

export function setShippingAddress(
  shippingAddress: ShippingAddressInput | null,
): Promise<Cart> {
  return cartRequest(
    SetShippingAddressDocument,
    (workspaceId, channel) => ({ workspaceId, channel, shippingAddress }),
  ).then((data) => data.cart.setShippingAddress);
}

export function mergeCart(): Promise<Cart> {
  return cartRequest(
    MergeCartDocument,
    (workspaceId, channel) => ({ workspaceId, channel }),
  ).then((data) => data.cart.merge);
}

export function checkout(input: CheckoutInput): Promise<CheckoutOrder> {
  return cartRequest(
    CheckoutDocument,
    (workspaceId, channel) => ({ input: { workspaceId, channel, ...input } }),
  ).then((data) => data.cart.checkout);
}

export function findBySku(
  modelSlug: string,
  sku: string,
  locale: string,
): Promise<SkuMatch[]> {
  return cartRequest(
    ProductBySkuDocument,
    (workspaceId) => ({ workspaceId, modelSlug, sku, locale }),
  ).then((data) => data.public.model.records.items);
}
