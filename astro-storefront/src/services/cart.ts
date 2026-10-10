import type { ShippingAddressInput } from "../graphql/generated/graphql";
import type { Cart, CheckoutOrder, Product } from "../graphql/types";
import { cartRequest, type ShopAuth } from "../lib/cmssy/cart-request";
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
} from "../graphql/generated/graphql";

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

export function getCart(auth: ShopAuth): Promise<Cart | null> {
  return cartRequest(auth, CartDocument, (workspaceId) => ({
    workspaceId,
  })).then((data) => data.cart.get);
}

export function addToCart(auth: ShopAuth, input: AddToCartInput): Promise<Cart> {
  return cartRequest(auth, AddToCartDocument, (workspaceId) => ({
    input: { workspaceId, ...input },
  })).then((data) => data.cart.addItem);
}

export function updateItem(
  auth: ShopAuth,
  input: UpdateItemInput,
): Promise<Cart> {
  return cartRequest(auth, UpdateCartItemDocument, (workspaceId) => ({
    input: { workspaceId, ...input },
  })).then((data) => data.cart.updateItem);
}

export function removeItem(auth: ShopAuth, itemId: string): Promise<Cart> {
  return cartRequest(auth, RemoveCartItemDocument, (workspaceId) => ({
    workspaceId,
    itemId,
  })).then((data) => data.cart.removeItem);
}

export function clearCart(auth: ShopAuth): Promise<Cart> {
  return cartRequest(auth, ClearCartDocument, (workspaceId) => ({
    workspaceId,
  })).then((data) => data.cart.clear);
}

export function applyDiscount(auth: ShopAuth, code: string): Promise<Cart> {
  return cartRequest(auth, ApplyDiscountDocument, (workspaceId) => ({
    workspaceId,
    code,
  })).then((data) => data.cart.applyDiscount);
}

export function removeDiscount(auth: ShopAuth): Promise<Cart> {
  return cartRequest(auth, RemoveDiscountDocument, (workspaceId) => ({
    workspaceId,
  })).then((data) => data.cart.removeDiscount);
}

export function setShippingMethod(
  auth: ShopAuth,
  shippingMethodId: string | null,
): Promise<Cart> {
  return cartRequest(auth, SetShippingMethodDocument, (workspaceId) => ({
    workspaceId,
    shippingMethodId,
  })).then((data) => data.cart.setShippingMethod);
}

export function mergeCart(auth: ShopAuth): Promise<Cart> {
  return cartRequest(auth, MergeCartDocument, (workspaceId) => ({
    workspaceId,
  })).then((data) => data.cart.merge);
}

export function checkout(
  auth: ShopAuth,
  input: CheckoutInput,
): Promise<CheckoutOrder> {
  return cartRequest(auth, CheckoutDocument, (workspaceId) => ({
    input: { workspaceId, ...input },
  })).then((data) => data.cart.checkout);
}

export function findProduct(
  auth: ShopAuth,
  modelSlug: string,
  filter: Record<string, unknown>,
): Promise<Product | null> {
  return cartRequest(auth, ProductDocument, (workspaceId) => ({
    workspaceId,
    modelSlug,
    filter,
  })).then((data) => data.public.model.records.items[0] ?? null);
}
