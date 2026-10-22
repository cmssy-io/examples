/* eslint-disable */
/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import { DocumentTypeDecoration } from '@graphql-typed-document-node/core';
/** Whose orders account.orders lists: MINE - the member's own; COMPANY - every order placed for the member's company, which needs the orders.company.read company permission. */
export type AccountOrderScope =
  | 'COMPANY'
  | 'MINE';

/** Input for adding an item to a cart */
export type AddToCartInput = {
  channel?: string | null | undefined;
  notes?: string | null | undefined;
  quantity: number;
  /** ModelRecord ID (product) */
  recordId: string | number;
  variantSelections?: unknown;
  workspaceId: string | number;
};

export type CheckoutInput = {
  channel?: string | null | undefined;
  /** Values for the order fields the customer can set (publicCart.orderFields), by key */
  customFields?: unknown;
  customerEmail: string;
  /** Buyer's message for this order (distinct from admin notes) */
  customerNote?: string | null | undefined;
  /** Buyer's purchase-order reference, frozen on the order */
  poNumber?: string | null | undefined;
  shippingAddress?: ShippingAddressInput | null | undefined;
  workspaceId: string | number;
};

export type FormActionType =
  | 'contact'
  | 'custom';

export type FormFieldType =
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'email'
  | 'file'
  | 'hidden'
  | 'multiselect'
  | 'number'
  | 'password'
  | 'phone'
  | 'radio'
  | 'select'
  | 'text'
  | 'textarea'
  | 'url';

export type OrderDeliveryStatus =
  | 'delivered'
  | 'exception'
  | 'in_transit'
  | 'none'
  | 'partially_delivered';

export type OrderFieldType =
  | 'boolean'
  | 'date'
  | 'email'
  | 'number'
  | 'phone'
  | 'select'
  | 'text'
  | 'url';

export type OrderReturnStatus =
  | 'approved'
  | 'canceled'
  | 'completed'
  | 'received'
  | 'rejected'
  | 'requested';

export type OrderState =
  | 'canceled'
  | 'closed'
  | 'open';

export type PriceDisplayMode =
  | 'gross'
  | 'net';

/** Whose list it is: the customer's (MEMBER), their company's or the sales channel's. */
export type PriceListSource =
  | 'CHANNEL'
  | 'COMPANY'
  | 'MEMBER';

/** A product, or one variant of it, to price for the signed-in member. */
export type PriceQueryItem = {
  recordId: string | number;
  /** The variant's id as the delivery ProductVariant.id returns it. Leave it out on a variant product to get its lowest and highest price. */
  variantKey?: string | null | undefined;
};

export type PriceSource =
  | 'catalogue'
  | 'price_list_entry'
  | 'price_list_percent';

export type ReturnLineInput = {
  /** The order line's id. */
  itemId: string | number;
  quantity: number;
  reason: ReturnReason;
};

export type ReturnReason =
  | 'damaged'
  | 'defective'
  | 'no_longer_needed'
  | 'not_as_described'
  | 'other'
  | 'wrong_item';

export type ShipmentStatus =
  | 'canceled'
  | 'delivered'
  | 'exception'
  | 'in_transit'
  | 'label_purchased'
  | 'out_for_delivery'
  | 'pending'
  | 'returned_to_sender';

/** Postal address for the order, frozen on the order at checkout (CMS-913). */
export type ShippingAddressInput = {
  city: string;
  company?: string | null | undefined;
  /** ISO 3166-1 alpha-2 country code */
  country: string;
  line1: string;
  line2?: string | null | undefined;
  name: string;
  phone?: string | null | undefined;
  postalCode: string;
  region?: string | null | undefined;
  vatId?: string | null | undefined;
};

export type SiteMemberLoginInput = {
  identity: string;
  modelSlug: string;
  password: string;
};

export type SiteMemberRegisterInput = {
  /** Initial values, keyed by field. Only fields the account model marks memberCanSet are accepted; any other non-null key refuses the registration and the message names it. Password fields and the company field are never accepted, whatever their flag. The login field may be sent but is ignored: the login comes from identity, the password from password. */
  fields?: unknown;
  identity: string;
  modelSlug: string;
  password: string;
};

export type SubmitFormInput = {
  data: unknown;
  website?: string | null | undefined;
};

export type TaxTreatmentKind =
  | 'exempt'
  | 'reverse_charge'
  | 'standard';

/** Input for updating a cart item */
export type UpdateCartItemInput = {
  channel?: string | null | undefined;
  itemId: string | number;
  notes?: string | null | undefined;
  /** Set to 0 to remove the item */
  quantity?: number | null | undefined;
  workspaceId: string | number;
};

export type PublicSiteConfigQueryVariables = Exact<{
  workspaceSlug: string;
}>;


export type PublicSiteConfigQuery = { public: { siteConfig: { id: string, workspaceId: string, siteName: unknown, defaultLanguage: string, enabledLanguages: Array<string>, enabledFeatures: Array<string>, notFoundPageId: string | null, previewUrl: string | null, branding: { brandName: string | null, logoUrl: string | null, logoDarkUrl: string | null, faviconUrl: string | null, ogImageUrl: string | null } | null } | null } };

export type PublicPageQueryVariables = Exact<{
  workspaceSlug: string;
  slug: string;
  previewSecret?: string | null | undefined;
}>;


export type PublicPageQuery = { public: { page: { get: { id: string, slug: string, pageType: string, blocks: Array<{ id: string, type: string, content: unknown, style: unknown, advanced: unknown }>, publishedBlocks: Array<{ id: string, type: string, content: unknown, style: unknown, advanced: unknown }> } | null } } };

export type PublicPageByIdQueryVariables = Exact<{
  workspaceSlug: string;
  pageId: string | number;
}>;


export type PublicPageByIdQuery = { public: { page: { getById: { id: string, slug: string, pageType: string, publishedBlocks: Array<{ id: string, type: string, content: unknown, style: unknown, advanced: unknown }> } | null } } };

export type PublicPagesQueryVariables = Exact<{
  workspaceSlug: string;
}>;


export type PublicPagesQuery = { public: { page: { list: Array<{ id: string, slug: string, updatedAt: string, publishedAt: string | null }> } } };

export type PublicPageMetaQueryVariables = Exact<{
  workspaceSlug: string;
  slug: string;
}>;


export type PublicPageMetaQuery = { public: { page: { get: { id: string, seoTitle: unknown, seoDescription: unknown, seoKeywords: Array<string>, displayName: unknown } | null } } };

export type PublicPageLayoutsQueryVariables = Exact<{
  workspaceSlug: string;
  pageSlug: string;
  previewSecret?: string | null | undefined;
}>;


export type PublicPageLayoutsQuery = { public: { page: { layouts: Array<{ region: string, settings: unknown, blocks: Array<{ id: string, type: string, content: unknown, style: unknown, advanced: unknown, order: number, isActive: boolean }> }> } } };

export type PublicModelRecordsQueryVariables = Exact<{
  workspaceId: string;
  modelSlug: string;
  filter?: unknown;
  sort?: string | null | undefined;
  locale?: string | null | undefined;
  limit?: number | null | undefined;
  offset?: number | null | undefined;
  populate?: Array<string> | string | null | undefined;
}>;


export type PublicModelRecordsQuery = { public: { model: { records: { total: number, hasMore: boolean, items: Array<{ id: string, modelId: string, data: unknown, status: string | null, createdAt: string, updatedAt: string }> } } } };

export type PublicRecordsByIdsQueryVariables = Exact<{
  workspaceId: string;
  ids: Array<string> | string;
  locale?: string | null | undefined;
}>;


export type PublicRecordsByIdsQuery = { public: { model: { recordsByIds: Array<{ id: string, modelId: string, data: unknown, status: string | null, createdAt: string, updatedAt: string }> } } };

export type PublicFormQueryVariables = Exact<{
  formId: string | number;
}>;


export type PublicFormQuery = { public: { form: { get: { id: string, name: string, slug: string, description: string | null, fields: Array<{ id: string, name: string, fieldType: FormFieldType, label: unknown, placeholder: unknown, helpText: unknown, defaultValue: string | null, width: string, order: number, showWhen: unknown, requiredWhen: unknown, options: Array<{ value: string, label: unknown, disabled: boolean }>, validation: { required: boolean, minLength: number | null, maxLength: number | null, minValue: number | null, maxValue: number | null, pattern: string | null, customMessage: string | null } }>, settings: { actionType: FormActionType, submitButtonLabel: unknown, successMessage: unknown, errorMessage: unknown, redirectUrl: string | null, requireLogin: boolean } } | null } } };

export type SubmitFormMutationVariables = Exact<{
  formId: string | number;
  input: SubmitFormInput;
}>;


export type SubmitFormMutation = { public: { form: { submit: { success: boolean, message: string, submissionId: string | null, redirectUrl: string | null } } } };

export type BuyerPricesQueryVariables = Exact<{
  workspaceId: string | number;
  items: Array<PriceQueryItem> | PriceQueryItem;
  channel?: string | null | undefined;
}>;


export type BuyerPricesQuery = { account: { prices: Array<{ recordId: string, variantKey: string | null, currency: string, price: number, priceMax: number | null, listed: boolean, basePrice: number, source: PriceSource, listSource: PriceListSource | null, minQuantity: number, maxQuantity: number, increment: number, displayMode: PriceDisplayMode, taxRate: number, taxTreatmentKind: TaxTreatmentKind, tiers: Array<{ minQty: number, price: number }>, priceAmount: { net: number, tax: number, gross: number }, priceMaxAmount: { net: number, tax: number, gross: number } | null, basePriceAmount: { net: number, tax: number, gross: number } }> } };

export type AddToCartMutationVariables = Exact<{
  input: AddToCartInput;
}>;


export type AddToCartMutation = { cart: { addItem: { id: string, status: string, itemCount: number, subtotal: number, currency: string | null, discountedTotal: number, tax: number, totalGross: number, pricesIncludeTax: boolean, channel: string | null, displayMode: PriceDisplayMode, shippingTotal: number, amounts: { subtotal: { gross: number }, discount: { gross: number }, shipping: { gross: number } }, taxTreatment: { kind: TaxTreatmentKind, legalNote: string | null, buyerVatId: string | null, buyerVatCountry: string | null }, taxSummary: Array<{ rateId: string | null, name: string | null, rate: number, base: number, amount: number }>, shippingMethod: { id: string, label: string, price: number, etaLabel: string | null } | null, availableShippingMethods: Array<{ id: string, label: string, price: number, etaLabel: string | null, amount: { gross: number } }>, appliedDiscount: { code: string, type: string, value: number, computedAmount: number } | null, items: Array<{ id: string, recordId: string, quantity: number, variantSelections: unknown, unitPrice: number, currentPrice: number | null, priceMismatch: boolean, unit: { net: number, gross: number }, line: { net: number, gross: number }, snapshot: { name: string, price: number, currency: string, imageUrl: string | null, sku: string | null, tiers: Array<{ minQty: number, price: number }> } }> } } };

export type ApplyDiscountMutationVariables = Exact<{
  workspaceId: string | number;
  code: string;
  channel?: string | null | undefined;
}>;


export type ApplyDiscountMutation = { cart: { applyDiscount: { id: string, status: string, itemCount: number, subtotal: number, currency: string | null, discountedTotal: number, tax: number, totalGross: number, pricesIncludeTax: boolean, channel: string | null, displayMode: PriceDisplayMode, shippingTotal: number, amounts: { subtotal: { gross: number }, discount: { gross: number }, shipping: { gross: number } }, taxTreatment: { kind: TaxTreatmentKind, legalNote: string | null, buyerVatId: string | null, buyerVatCountry: string | null }, taxSummary: Array<{ rateId: string | null, name: string | null, rate: number, base: number, amount: number }>, shippingMethod: { id: string, label: string, price: number, etaLabel: string | null } | null, availableShippingMethods: Array<{ id: string, label: string, price: number, etaLabel: string | null, amount: { gross: number } }>, appliedDiscount: { code: string, type: string, value: number, computedAmount: number } | null, items: Array<{ id: string, recordId: string, quantity: number, variantSelections: unknown, unitPrice: number, currentPrice: number | null, priceMismatch: boolean, unit: { net: number, gross: number }, line: { net: number, gross: number }, snapshot: { name: string, price: number, currency: string, imageUrl: string | null, sku: string | null, tiers: Array<{ minQty: number, price: number }> } }> } } };

export type CheckoutMutationVariables = Exact<{
  input: CheckoutInput;
}>;


export type CheckoutMutation = { cart: { checkout: { id: string, orderNumber: number | null, state: OrderState, subtotal: number, discount: number, tax: number, total: number, currency: string, customerEmail: string, accessToken: string | null, poNumber: string | null, customerNote: string | null, customFields: unknown, shippingTotal: number, pricesIncludeTax: boolean, appliedDiscount: { code: string, type: string, value: number, amount: number } | null, shippingMethod: { id: string, label: string, price: number } | null, shippingAddress: { name: string, company: string | null, line1: string, line2: string | null, postalCode: string, city: string, region: string | null, country: string, phone: string | null, vatId: string | null } | null, taxSummary: Array<{ rateId: string | null, name: string | null, rate: number, base: number, amount: number }>, items: Array<{ name: string, sku: string | null, quantity: number, price: number, listPrice: number | null, tierMinQty: number | null, currency: string, taxRate: number, taxAmount: number }> } } };

export type ClearCartMutationVariables = Exact<{
  workspaceId: string | number;
  channel?: string | null | undefined;
}>;


export type ClearCartMutation = { cart: { clear: { id: string, status: string, itemCount: number, subtotal: number, currency: string | null, discountedTotal: number, tax: number, totalGross: number, pricesIncludeTax: boolean, channel: string | null, displayMode: PriceDisplayMode, shippingTotal: number, amounts: { subtotal: { gross: number }, discount: { gross: number }, shipping: { gross: number } }, taxTreatment: { kind: TaxTreatmentKind, legalNote: string | null, buyerVatId: string | null, buyerVatCountry: string | null }, taxSummary: Array<{ rateId: string | null, name: string | null, rate: number, base: number, amount: number }>, shippingMethod: { id: string, label: string, price: number, etaLabel: string | null } | null, availableShippingMethods: Array<{ id: string, label: string, price: number, etaLabel: string | null, amount: { gross: number } }>, appliedDiscount: { code: string, type: string, value: number, computedAmount: number } | null, items: Array<{ id: string, recordId: string, quantity: number, variantSelections: unknown, unitPrice: number, currentPrice: number | null, priceMismatch: boolean, unit: { net: number, gross: number }, line: { net: number, gross: number }, snapshot: { name: string, price: number, currency: string, imageUrl: string | null, sku: string | null, tiers: Array<{ minQty: number, price: number }> } }> } } };

export type MemberChangePasswordMutationVariables = Exact<{
  currentPassword: string;
  newPassword: string;
}>;


export type MemberChangePasswordMutation = { siteMember: { changePassword: { success: boolean, message: string, accessToken: string | null, refreshToken: string | null, accessTokenExpiresIn: number | null } } };

export type MemberConfirmLoginChangeMutationVariables = Exact<{
  token: string;
}>;


export type MemberConfirmLoginChangeMutation = { siteMember: { confirmLoginChange: { success: boolean, message: string } } };

export type MemberDeleteAccountMutationVariables = Exact<{
  currentPassword: string;
}>;


export type MemberDeleteAccountMutation = { siteMember: { deleteAccount: { success: boolean, message: string } } };

export type MemberRequestLoginChangeMutationVariables = Exact<{
  newLogin: string;
  currentPassword: string;
}>;


export type MemberRequestLoginChangeMutation = { siteMember: { requestLoginChange: { success: boolean, message: string } } };

export type MemberUpdateProfileMutationVariables = Exact<{
  fields: unknown;
}>;


export type MemberUpdateProfileMutation = { siteMember: { updateProfile: { id: string, login: string, pendingLogin: string | null, data: unknown, editableFields: Array<string>, loginField: string, passwordField: string, company: { id: string, name: string | null, role: string, permissions: Array<string> } | null, priceList: { name: string } | null } } };

export type MergeCartMutationVariables = Exact<{
  workspaceId: string | number;
  channel?: string | null | undefined;
}>;


export type MergeCartMutation = { cart: { merge: { id: string, status: string, itemCount: number, subtotal: number, currency: string | null, discountedTotal: number, tax: number, totalGross: number, pricesIncludeTax: boolean, channel: string | null, displayMode: PriceDisplayMode, shippingTotal: number, amounts: { subtotal: { gross: number }, discount: { gross: number }, shipping: { gross: number } }, taxTreatment: { kind: TaxTreatmentKind, legalNote: string | null, buyerVatId: string | null, buyerVatCountry: string | null }, taxSummary: Array<{ rateId: string | null, name: string | null, rate: number, base: number, amount: number }>, shippingMethod: { id: string, label: string, price: number, etaLabel: string | null } | null, availableShippingMethods: Array<{ id: string, label: string, price: number, etaLabel: string | null, amount: { gross: number } }>, appliedDiscount: { code: string, type: string, value: number, computedAmount: number } | null, items: Array<{ id: string, recordId: string, quantity: number, variantSelections: unknown, unitPrice: number, currentPrice: number | null, priceMismatch: boolean, unit: { net: number, gross: number }, line: { net: number, gross: number }, snapshot: { name: string, price: number, currency: string, imageUrl: string | null, sku: string | null, tiers: Array<{ minQty: number, price: number }> } }> } } };

export type RemoveCartItemMutationVariables = Exact<{
  workspaceId: string | number;
  itemId: string | number;
  channel?: string | null | undefined;
}>;


export type RemoveCartItemMutation = { cart: { removeItem: { id: string, status: string, itemCount: number, subtotal: number, currency: string | null, discountedTotal: number, tax: number, totalGross: number, pricesIncludeTax: boolean, channel: string | null, displayMode: PriceDisplayMode, shippingTotal: number, amounts: { subtotal: { gross: number }, discount: { gross: number }, shipping: { gross: number } }, taxTreatment: { kind: TaxTreatmentKind, legalNote: string | null, buyerVatId: string | null, buyerVatCountry: string | null }, taxSummary: Array<{ rateId: string | null, name: string | null, rate: number, base: number, amount: number }>, shippingMethod: { id: string, label: string, price: number, etaLabel: string | null } | null, availableShippingMethods: Array<{ id: string, label: string, price: number, etaLabel: string | null, amount: { gross: number } }>, appliedDiscount: { code: string, type: string, value: number, computedAmount: number } | null, items: Array<{ id: string, recordId: string, quantity: number, variantSelections: unknown, unitPrice: number, currentPrice: number | null, priceMismatch: boolean, unit: { net: number, gross: number }, line: { net: number, gross: number }, snapshot: { name: string, price: number, currency: string, imageUrl: string | null, sku: string | null, tiers: Array<{ minQty: number, price: number }> } }> } } };

export type RemoveDiscountMutationVariables = Exact<{
  workspaceId: string | number;
  channel?: string | null | undefined;
}>;


export type RemoveDiscountMutation = { cart: { removeDiscount: { id: string, status: string, itemCount: number, subtotal: number, currency: string | null, discountedTotal: number, tax: number, totalGross: number, pricesIncludeTax: boolean, channel: string | null, displayMode: PriceDisplayMode, shippingTotal: number, amounts: { subtotal: { gross: number }, discount: { gross: number }, shipping: { gross: number } }, taxTreatment: { kind: TaxTreatmentKind, legalNote: string | null, buyerVatId: string | null, buyerVatCountry: string | null }, taxSummary: Array<{ rateId: string | null, name: string | null, rate: number, base: number, amount: number }>, shippingMethod: { id: string, label: string, price: number, etaLabel: string | null } | null, availableShippingMethods: Array<{ id: string, label: string, price: number, etaLabel: string | null, amount: { gross: number } }>, appliedDiscount: { code: string, type: string, value: number, computedAmount: number } | null, items: Array<{ id: string, recordId: string, quantity: number, variantSelections: unknown, unitPrice: number, currentPrice: number | null, priceMismatch: boolean, unit: { net: number, gross: number }, line: { net: number, gross: number }, snapshot: { name: string, price: number, currency: string, imageUrl: string | null, sku: string | null, tiers: Array<{ minQty: number, price: number }> } }> } } };

export type RequestReturnMutationVariables = Exact<{
  workspaceId: string | number;
  orderId: string | number;
  accessToken?: string | null | undefined;
  lines: Array<ReturnLineInput> | ReturnLineInput;
  note?: string | null | undefined;
}>;


export type RequestReturnMutation = { public: { order: { requestReturn: { id: string } } } };

export type SetShippingAddressMutationVariables = Exact<{
  workspaceId: string | number;
  shippingAddress?: ShippingAddressInput | null | undefined;
  channel?: string | null | undefined;
}>;


export type SetShippingAddressMutation = { cart: { setShippingAddress: { id: string, status: string, itemCount: number, subtotal: number, currency: string | null, discountedTotal: number, tax: number, totalGross: number, pricesIncludeTax: boolean, channel: string | null, displayMode: PriceDisplayMode, shippingTotal: number, amounts: { subtotal: { gross: number }, discount: { gross: number }, shipping: { gross: number } }, taxTreatment: { kind: TaxTreatmentKind, legalNote: string | null, buyerVatId: string | null, buyerVatCountry: string | null }, taxSummary: Array<{ rateId: string | null, name: string | null, rate: number, base: number, amount: number }>, shippingMethod: { id: string, label: string, price: number, etaLabel: string | null } | null, availableShippingMethods: Array<{ id: string, label: string, price: number, etaLabel: string | null, amount: { gross: number } }>, appliedDiscount: { code: string, type: string, value: number, computedAmount: number } | null, items: Array<{ id: string, recordId: string, quantity: number, variantSelections: unknown, unitPrice: number, currentPrice: number | null, priceMismatch: boolean, unit: { net: number, gross: number }, line: { net: number, gross: number }, snapshot: { name: string, price: number, currency: string, imageUrl: string | null, sku: string | null, tiers: Array<{ minQty: number, price: number }> } }> } } };

export type SetShippingMethodMutationVariables = Exact<{
  workspaceId: string | number;
  shippingMethodId?: string | null | undefined;
  channel?: string | null | undefined;
}>;


export type SetShippingMethodMutation = { cart: { setShippingMethod: { id: string, status: string, itemCount: number, subtotal: number, currency: string | null, discountedTotal: number, tax: number, totalGross: number, pricesIncludeTax: boolean, channel: string | null, displayMode: PriceDisplayMode, shippingTotal: number, amounts: { subtotal: { gross: number }, discount: { gross: number }, shipping: { gross: number } }, taxTreatment: { kind: TaxTreatmentKind, legalNote: string | null, buyerVatId: string | null, buyerVatCountry: string | null }, taxSummary: Array<{ rateId: string | null, name: string | null, rate: number, base: number, amount: number }>, shippingMethod: { id: string, label: string, price: number, etaLabel: string | null } | null, availableShippingMethods: Array<{ id: string, label: string, price: number, etaLabel: string | null, amount: { gross: number } }>, appliedDiscount: { code: string, type: string, value: number, computedAmount: number } | null, items: Array<{ id: string, recordId: string, quantity: number, variantSelections: unknown, unitPrice: number, currentPrice: number | null, priceMismatch: boolean, unit: { net: number, gross: number }, line: { net: number, gross: number }, snapshot: { name: string, price: number, currency: string, imageUrl: string | null, sku: string | null, tiers: Array<{ minQty: number, price: number }> } }> } } };

export type SiteMemberForgotPasswordMutationVariables = Exact<{
  modelSlug: string;
  identity: string;
}>;


export type SiteMemberForgotPasswordMutation = { siteMember: { forgotPassword: { success: boolean, message: string } } };

export type SiteMemberLoginMutationVariables = Exact<{
  input: SiteMemberLoginInput;
}>;


export type SiteMemberLoginMutation = { siteMember: { login: { success: boolean, message: string, accessToken: string | null, refreshToken: string | null, accessTokenExpiresIn: number | null } } };

export type SiteMemberLogoutMutationVariables = Exact<{
  refreshToken: string;
}>;


export type SiteMemberLogoutMutation = { siteMember: { logout: { success: boolean, message: string } } };

export type SiteMemberRefreshMutationVariables = Exact<{
  refreshToken: string;
}>;


export type SiteMemberRefreshMutation = { siteMember: { refresh: { success: boolean, message: string, accessToken: string | null, refreshToken: string | null, accessTokenExpiresIn: number | null } } };

export type SiteMemberRegisterMutationVariables = Exact<{
  input: SiteMemberRegisterInput;
}>;


export type SiteMemberRegisterMutation = { siteMember: { register: { success: boolean, message: string } } };

export type SiteMemberResetPasswordMutationVariables = Exact<{
  token: string;
  newPassword: string;
}>;


export type SiteMemberResetPasswordMutation = { siteMember: { resetPassword: { success: boolean, message: string } } };

export type SiteMemberVerifyEmailMutationVariables = Exact<{
  token: string;
}>;


export type SiteMemberVerifyEmailMutation = { siteMember: { verifyEmail: { success: boolean, message: string } } };

export type UpdateCartItemMutationVariables = Exact<{
  input: UpdateCartItemInput;
}>;


export type UpdateCartItemMutation = { cart: { updateItem: { id: string, status: string, itemCount: number, subtotal: number, currency: string | null, discountedTotal: number, tax: number, totalGross: number, pricesIncludeTax: boolean, channel: string | null, displayMode: PriceDisplayMode, shippingTotal: number, amounts: { subtotal: { gross: number }, discount: { gross: number }, shipping: { gross: number } }, taxTreatment: { kind: TaxTreatmentKind, legalNote: string | null, buyerVatId: string | null, buyerVatCountry: string | null }, taxSummary: Array<{ rateId: string | null, name: string | null, rate: number, base: number, amount: number }>, shippingMethod: { id: string, label: string, price: number, etaLabel: string | null } | null, availableShippingMethods: Array<{ id: string, label: string, price: number, etaLabel: string | null, amount: { gross: number } }>, appliedDiscount: { code: string, type: string, value: number, computedAmount: number } | null, items: Array<{ id: string, recordId: string, quantity: number, variantSelections: unknown, unitPrice: number, currentPrice: number | null, priceMismatch: boolean, unit: { net: number, gross: number }, line: { net: number, gross: number }, snapshot: { name: string, price: number, currency: string, imageUrl: string | null, sku: string | null, tiers: Array<{ minQty: number, price: number }> } }> } } };

export type CartQueryVariables = Exact<{
  workspaceId: string | number;
  channel?: string | null | undefined;
}>;


export type CartQuery = { cart: { get: { id: string, status: string, itemCount: number, subtotal: number, currency: string | null, discountedTotal: number, tax: number, totalGross: number, pricesIncludeTax: boolean, channel: string | null, displayMode: PriceDisplayMode, shippingTotal: number, amounts: { subtotal: { gross: number }, discount: { gross: number }, shipping: { gross: number } }, taxTreatment: { kind: TaxTreatmentKind, legalNote: string | null, buyerVatId: string | null, buyerVatCountry: string | null }, taxSummary: Array<{ rateId: string | null, name: string | null, rate: number, base: number, amount: number }>, shippingMethod: { id: string, label: string, price: number, etaLabel: string | null } | null, availableShippingMethods: Array<{ id: string, label: string, price: number, etaLabel: string | null, amount: { gross: number } }>, appliedDiscount: { code: string, type: string, value: number, computedAmount: number } | null, items: Array<{ id: string, recordId: string, quantity: number, variantSelections: unknown, unitPrice: number, currentPrice: number | null, priceMismatch: boolean, unit: { net: number, gross: number }, line: { net: number, gross: number }, snapshot: { name: string, price: number, currency: string, imageUrl: string | null, sku: string | null, tiers: Array<{ minQty: number, price: number }> } }> } } };

export type PublicModelProductsQueryVariables = Exact<{
  workspaceId: string;
  modelSlug: string;
  filter?: unknown;
  stockState?: string | null | undefined;
  locale?: string | null | undefined;
  limit?: number | null | undefined;
  offset?: number | null | undefined;
  sort?: string | null | undefined;
}>;


export type PublicModelProductsQuery = { public: { model: { records: { total: number, hasMore: boolean, items: Array<{ id: string, data: unknown, variantCount: number, available: number | null, priceTiers: Array<{ minQty: number, price: number }>, variantPriceRange: { min: number } | null }> } } } };

export type MyProfileQueryVariables = Exact<{
  workspaceId: string | number;
}>;


export type MyProfileQuery = { account: { profile: { id: string, login: string, pendingLogin: string | null, data: unknown, editableFields: Array<string>, loginField: string, passwordField: string, company: { id: string, name: string | null, role: string, permissions: Array<string> } | null, priceList: { name: string } | null } } };

export type PublicOrderQueryVariables = Exact<{
  workspaceId: string | number;
  orderId: string | number;
  accessToken: string;
}>;


export type PublicOrderQuery = { public: { order: { byToken: { id: string, orderNumber: number | null, state: OrderState, paymentStatus: string, fulfillmentStatus: string, deliveryStatus: OrderDeliveryStatus, subtotal: number, discount: number, tax: number, total: number, pricesIncludeTax: boolean, companyName: string | null, priceListSource: PriceListSource | null, currency: string, customerEmail: string, poNumber: string | null, customerNote: string | null, customFields: unknown, shippingTotal: number, amountPaid: number, balanceDue: number, refundedAmount: number, invoiceNumber: string | null, invoiceUrl: string | null, paidAt: string | null, fulfilledAt: string | null, deliveredAt: string | null, createdAt: string, appliedDiscount: { code: string, type: string, value: number, amount: number } | null, channel: { key: string, name: string } | null, priceList: { name: string } | null, taxTreatment: { kind: TaxTreatmentKind, legalNote: string | null, buyerVatId: string | null, buyerVatCountry: string | null }, taxSummary: Array<{ rateId: string | null, name: string | null, rate: number, base: number, amount: number }>, shippingMethod: { id: string, label: string, price: number } | null, shippingAddress: { name: string, company: string | null, line1: string, line2: string | null, postalCode: string, city: string, region: string | null, country: string, phone: string | null, vatId: string | null } | null, shipments: Array<{ carrier: string | null, trackingNumber: string | null, trackingUrl: string | null, status: ShipmentStatus, updatedAt: string, deliveredAt: string | null, items: Array<{ itemId: string, quantity: number }> }>, returns: Array<{ id: string, number: number, status: OrderReturnStatus, requestedAt: string, receivedAt: string | null, completedAt: string | null, refundedAmount: number, carrier: string | null, trackingNumber: string | null, lines: Array<{ itemId: string, quantity: number, reason: ReturnReason, receivedQuantity: number | null }> }>, items: Array<{ id: string, name: string, price: number, listPrice: number | null, tierMinQty: number | null, currency: string, quantity: number, sku: string | null, taxRate: number, taxAmount: number }> } } } };

export type MyOrdersQueryVariables = Exact<{
  workspaceId: string | number;
  skip?: number | null | undefined;
  limit?: number | null | undefined;
  scope?: AccountOrderScope | null | undefined;
}>;


export type MyOrdersQuery = { account: { orders: { total: number, hasMore: boolean, items: Array<{ id: string, state: OrderState, subtotal: number, discount: number, tax: number, total: number, pricesIncludeTax: boolean, companyName: string | null, priceListSource: PriceListSource | null, currency: string, customerEmail: string, refundedAmount: number, paymentStatus: string, fulfillmentStatus: string, deliveryStatus: OrderDeliveryStatus, amountPaid: number, balanceDue: number, invoiceNumber: string | null, invoiceUrl: string | null, paidAt: string | null, fulfilledAt: string | null, deliveredAt: string | null, createdAt: string, orderNumber: number | null, poNumber: string | null, customerNote: string | null, customFields: unknown, shippingTotal: number, appliedDiscount: { code: string, type: string, value: number, amount: number } | null, channel: { key: string, name: string } | null, priceList: { name: string } | null, taxTreatment: { kind: TaxTreatmentKind, legalNote: string | null, buyerVatId: string | null, buyerVatCountry: string | null }, taxSummary: Array<{ rateId: string | null, name: string | null, rate: number, base: number, amount: number }>, shipments: Array<{ carrier: string | null, trackingNumber: string | null, trackingUrl: string | null, status: ShipmentStatus, updatedAt: string }>, shippingMethod: { id: string, label: string, price: number } | null, shippingAddress: { name: string, company: string | null, line1: string, line2: string | null, postalCode: string, city: string, region: string | null, country: string, phone: string | null, vatId: string | null } | null, items: Array<{ name: string, price: number, listPrice: number | null, tierMinQty: number | null, currency: string, quantity: number, sku: string | null }> }> } } };

export type MyOrderQueryVariables = Exact<{
  workspaceId: string | number;
  id: string | number;
}>;


export type MyOrderQuery = { account: { order: { id: string, state: OrderState, subtotal: number, discount: number, tax: number, total: number, pricesIncludeTax: boolean, companyName: string | null, priceListSource: PriceListSource | null, currency: string, customerEmail: string, refundedAmount: number, paymentStatus: string, fulfillmentStatus: string, deliveryStatus: OrderDeliveryStatus, amountPaid: number, balanceDue: number, invoiceNumber: string | null, invoiceUrl: string | null, paidAt: string | null, fulfilledAt: string | null, deliveredAt: string | null, createdAt: string, orderNumber: number | null, poNumber: string | null, customerNote: string | null, customFields: unknown, shippingTotal: number, appliedDiscount: { code: string, type: string, value: number, amount: number } | null, channel: { key: string, name: string } | null, priceList: { name: string } | null, taxTreatment: { kind: TaxTreatmentKind, legalNote: string | null, buyerVatId: string | null, buyerVatCountry: string | null }, taxSummary: Array<{ rateId: string | null, name: string | null, rate: number, base: number, amount: number }>, shipments: Array<{ carrier: string | null, trackingNumber: string | null, trackingUrl: string | null, status: ShipmentStatus, updatedAt: string, deliveredAt: string | null, items: Array<{ itemId: string, quantity: number }> }>, returns: Array<{ id: string, number: number, status: OrderReturnStatus, requestedAt: string, receivedAt: string | null, completedAt: string | null, refundedAmount: number, carrier: string | null, trackingNumber: string | null, lines: Array<{ itemId: string, quantity: number, reason: ReturnReason, receivedQuantity: number | null }> }>, shippingMethod: { id: string, label: string, price: number } | null, shippingAddress: { name: string, company: string | null, line1: string, line2: string | null, postalCode: string, city: string, region: string | null, country: string, phone: string | null, vatId: string | null } | null, items: Array<{ id: string, name: string, price: number, listPrice: number | null, tierMinQty: number | null, currency: string, quantity: number, sku: string | null }> } | null } };

export type PublicPagesByTypeQueryVariables = Exact<{
  workspaceId: string;
  parentSlug?: string | null | undefined;
  limit?: number | null | undefined;
  offset?: number | null | undefined;
}>;


export type PublicPagesByTypeQuery = { public: { page: { byType: { hasMore: boolean, items: Array<{ id: string, slug: string, fullSlug: string, publishedAt: string | null, displayName: unknown, seoTitle: unknown, seoDescription: unknown }> } } } };

export type ProductBySkuQueryVariables = Exact<{
  workspaceId: string;
  modelSlug: string;
  sku: string;
  locale?: string | null | undefined;
}>;


export type ProductBySkuQuery = { public: { model: { records: { items: Array<{ id: string, data: unknown, variantCount: number, variants: Array<{ selectedOptions: Array<{ name: string, value: string }> }> }> } } } };

export type ProductRolesQueryVariables = Exact<{
  workspaceId: string;
}>;


export type ProductRolesQuery = { public: { model: { definitions: Array<{ slug: string, productRoles: { taxRate: string } | null }> } } };

export type ProductVariantPageQueryVariables = Exact<{
  workspaceId: string;
  modelSlug: string;
  filter?: unknown;
  locale?: string | null | undefined;
  offset: number;
}>;


export type ProductVariantPageQuery = { public: { model: { records: { items: Array<{ id: string, variantCount: number, available: number | null, variantPriceRange: { min: number } | null, v0: Array<{ id: string, sku: string | null, price: number }>, v1: Array<{ id: string, sku: string | null, price: number }>, v2: Array<{ id: string, sku: string | null, price: number }>, v3: Array<{ id: string, sku: string | null, price: number }>, v4: Array<{ id: string, sku: string | null, price: number }>, v5: Array<{ id: string, sku: string | null, price: number }>, v6: Array<{ id: string, sku: string | null, price: number }>, v7: Array<{ id: string, sku: string | null, price: number }>, v8: Array<{ id: string, sku: string | null, price: number }>, v9: Array<{ id: string, sku: string | null, price: number }>, page: Array<{ id: string, sku: string | null, price: number, inventory: number | null, tiers: Array<{ minQty: number, price: number }>, selectedOptions: Array<{ name: string, value: string }> }> }> } } } };

export type ProductQueryVariables = Exact<{
  workspaceId: string;
  modelSlug: string;
  filter?: unknown;
  locale?: string | null | undefined;
}>;


export type ProductQuery = { public: { model: { records: { items: Array<{ id: string, data: unknown, variantCount: number, available: number | null, priceTiers: Array<{ minQty: number, price: number }>, variantPriceRange: { min: number } | null, variants: Array<{ id: string, sku: string | null, price: number, inventory: number | null, tiers: Array<{ minQty: number, price: number }>, selectedOptions: Array<{ name: string, value: string }> }> }> } } } };

export type ShopSettingsQueryVariables = Exact<{
  workspaceSlug: string;
}>;


export type ShopSettingsQuery = { public: { siteConfig: { id: string, lowStockThreshold: number, publicCart: { defaultCurrency: string, defaultTaxRateId: string | null, taxRates: Array<{ id: string, rate: number }>, shippingMethods: Array<{ enabled: boolean, countries: Array<string> }>, orderFields: Array<{ key: string, label: unknown, type: OrderFieldType, required: boolean, customerCanSet: boolean, description: unknown, minLength: number | null, maxLength: number | null, minValue: number | null, maxValue: number | null, pattern: string | null, options: Array<{ value: string, label: unknown }> }> } | null } | null } };

export class TypedDocumentString<TResult, TVariables>
  extends String
  implements DocumentTypeDecoration<TResult, TVariables>
{
  __apiType?: NonNullable<DocumentTypeDecoration<TResult, TVariables>['__apiType']>;
  private value: string;
  public __meta__?: Record<string, any> | undefined;

  constructor(value: string, __meta__?: Record<string, any> | undefined) {
    super(value);
    this.value = value;
    this.__meta__ = __meta__;
  }

  override toString(): string & DocumentTypeDecoration<TResult, TVariables> {
    return this.value;
  }
}

export const PublicSiteConfigDocument = new TypedDocumentString(`
    query PublicSiteConfig($workspaceSlug: String!) {
  public {
    siteConfig(workspaceSlug: $workspaceSlug) {
      id
      workspaceId
      siteName
      defaultLanguage
      enabledLanguages
      enabledFeatures
      notFoundPageId
      previewUrl
      branding {
        brandName
        logoUrl
        logoDarkUrl
        faviconUrl
        ogImageUrl
      }
    }
  }
}
    `) as unknown as TypedDocumentString<PublicSiteConfigQuery, PublicSiteConfigQueryVariables>;
export const PublicPageDocument = new TypedDocumentString(`
    query PublicPage($workspaceSlug: String!, $slug: String!, $previewSecret: String) {
  public {
    page {
      get(workspaceSlug: $workspaceSlug, slug: $slug, previewSecret: $previewSecret) {
        id
        slug
        pageType
        blocks {
          id
          type
          content
          style
          advanced
        }
        publishedBlocks {
          id
          type
          content
          style
          advanced
        }
      }
    }
  }
}
    `) as unknown as TypedDocumentString<PublicPageQuery, PublicPageQueryVariables>;
export const PublicPageByIdDocument = new TypedDocumentString(`
    query PublicPageById($workspaceSlug: String!, $pageId: ID!) {
  public {
    page {
      getById(workspaceSlug: $workspaceSlug, pageId: $pageId) {
        id
        slug
        pageType
        publishedBlocks {
          id
          type
          content
          style
          advanced
        }
      }
    }
  }
}
    `) as unknown as TypedDocumentString<PublicPageByIdQuery, PublicPageByIdQueryVariables>;
export const PublicPagesDocument = new TypedDocumentString(`
    query PublicPages($workspaceSlug: String!) {
  public {
    page {
      list(workspaceSlug: $workspaceSlug) {
        id
        slug
        updatedAt
        publishedAt
      }
    }
  }
}
    `) as unknown as TypedDocumentString<PublicPagesQuery, PublicPagesQueryVariables>;
export const PublicPageMetaDocument = new TypedDocumentString(`
    query PublicPageMeta($workspaceSlug: String!, $slug: String!) {
  public {
    page {
      get(workspaceSlug: $workspaceSlug, slug: $slug) {
        id
        seoTitle
        seoDescription
        seoKeywords
        displayName
      }
    }
  }
}
    `) as unknown as TypedDocumentString<PublicPageMetaQuery, PublicPageMetaQueryVariables>;
export const PublicPageLayoutsDocument = new TypedDocumentString(`
    query PublicPageLayouts($workspaceSlug: String!, $pageSlug: String!, $previewSecret: String) {
  public {
    page {
      layouts(
        workspaceSlug: $workspaceSlug
        pageSlug: $pageSlug
        previewSecret: $previewSecret
      ) {
        region
        blocks {
          id
          type
          content
          style
          advanced
          order
          isActive
        }
        settings
      }
    }
  }
}
    `) as unknown as TypedDocumentString<PublicPageLayoutsQuery, PublicPageLayoutsQueryVariables>;
export const PublicModelRecordsDocument = new TypedDocumentString(`
    query PublicModelRecords($workspaceId: String!, $modelSlug: String!, $filter: JSON, $sort: String, $locale: String, $limit: Int, $offset: Int, $populate: [String!]) {
  public {
    model {
      records(
        workspaceId: $workspaceId
        modelSlug: $modelSlug
        filter: $filter
        sort: $sort
        locale: $locale
        limit: $limit
        offset: $offset
        populate: $populate
      ) {
        items {
          id
          modelId
          data
          status
          createdAt
          updatedAt
        }
        total
        hasMore
      }
    }
  }
}
    `) as unknown as TypedDocumentString<PublicModelRecordsQuery, PublicModelRecordsQueryVariables>;
export const PublicRecordsByIdsDocument = new TypedDocumentString(`
    query PublicRecordsByIds($workspaceId: String!, $ids: [String!]!, $locale: String) {
  public {
    model {
      recordsByIds(workspaceId: $workspaceId, ids: $ids, locale: $locale) {
        id
        modelId
        data
        status
        createdAt
        updatedAt
      }
    }
  }
}
    `) as unknown as TypedDocumentString<PublicRecordsByIdsQuery, PublicRecordsByIdsQueryVariables>;
export const PublicFormDocument = new TypedDocumentString(`
    query PublicForm($formId: ID!) {
  public {
    form {
      get(formId: $formId) {
        id
        name
        slug
        description
        fields {
          id
          name
          fieldType
          label
          placeholder
          helpText
          defaultValue
          width
          order
          showWhen
          requiredWhen
          options {
            value
            label
            disabled
          }
          validation {
            required
            minLength
            maxLength
            minValue
            maxValue
            pattern
            customMessage
          }
        }
        settings {
          actionType
          submitButtonLabel
          successMessage
          errorMessage
          redirectUrl
          requireLogin
        }
      }
    }
  }
}
    `) as unknown as TypedDocumentString<PublicFormQuery, PublicFormQueryVariables>;
export const SubmitFormDocument = new TypedDocumentString(`
    mutation SubmitForm($formId: ID!, $input: SubmitFormInput!) {
  public {
    form {
      submit(formId: $formId, input: $input) {
        success
        message
        submissionId
        redirectUrl
      }
    }
  }
}
    `) as unknown as TypedDocumentString<SubmitFormMutation, SubmitFormMutationVariables>;
export const BuyerPricesDocument = new TypedDocumentString(`
    query BuyerPrices($workspaceId: ID!, $items: [PriceQueryItem!]!, $channel: String) {
  account {
    prices(workspaceId: $workspaceId, items: $items, channel: $channel) {
      recordId
      variantKey
      currency
      price
      priceMax
      listed
      basePrice
      source
      listSource
      minQuantity
      maxQuantity
      increment
      tiers {
        minQty
        price
      }
      displayMode
      taxRate
      taxTreatmentKind
      priceAmount {
        net
        tax
        gross
      }
      priceMaxAmount {
        net
        tax
        gross
      }
      basePriceAmount {
        net
        tax
        gross
      }
    }
  }
}
    `) as unknown as TypedDocumentString<BuyerPricesQuery, BuyerPricesQueryVariables>;
export const AddToCartDocument = new TypedDocumentString(`
    mutation AddToCart($input: AddToCartInput!) {
  cart {
    addItem(input: $input) {
      id
      status
      itemCount
      subtotal
      currency
      discountedTotal
      tax
      totalGross
      amounts {
        subtotal {
          gross
        }
        discount {
          gross
        }
        shipping {
          gross
        }
      }
      pricesIncludeTax
      channel
      displayMode
      taxTreatment {
        kind
        legalNote
        buyerVatId
        buyerVatCountry
      }
      shippingTotal
      taxSummary {
        rateId
        name
        rate
        base
        amount
      }
      shippingMethod {
        id
        label
        price
        etaLabel
      }
      availableShippingMethods {
        id
        label
        price
        etaLabel
        amount {
          gross
        }
      }
      appliedDiscount {
        code
        type
        value
        computedAmount
      }
      items {
        id
        recordId
        quantity
        variantSelections
        unitPrice
        currentPrice
        priceMismatch
        unit {
          net
          gross
        }
        line {
          net
          gross
        }
        snapshot {
          name
          price
          currency
          imageUrl
          sku
          tiers {
            minQty
            price
          }
        }
      }
    }
  }
}
    `) as unknown as TypedDocumentString<AddToCartMutation, AddToCartMutationVariables>;
export const ApplyDiscountDocument = new TypedDocumentString(`
    mutation ApplyDiscount($workspaceId: ID!, $code: String!, $channel: String) {
  cart {
    applyDiscount(workspaceId: $workspaceId, channel: $channel, code: $code) {
      id
      status
      itemCount
      subtotal
      currency
      discountedTotal
      tax
      totalGross
      amounts {
        subtotal {
          gross
        }
        discount {
          gross
        }
        shipping {
          gross
        }
      }
      pricesIncludeTax
      channel
      displayMode
      taxTreatment {
        kind
        legalNote
        buyerVatId
        buyerVatCountry
      }
      shippingTotal
      taxSummary {
        rateId
        name
        rate
        base
        amount
      }
      shippingMethod {
        id
        label
        price
        etaLabel
      }
      availableShippingMethods {
        id
        label
        price
        etaLabel
        amount {
          gross
        }
      }
      appliedDiscount {
        code
        type
        value
        computedAmount
      }
      items {
        id
        recordId
        quantity
        variantSelections
        unitPrice
        currentPrice
        priceMismatch
        unit {
          net
          gross
        }
        line {
          net
          gross
        }
        snapshot {
          name
          price
          currency
          imageUrl
          sku
          tiers {
            minQty
            price
          }
        }
      }
    }
  }
}
    `) as unknown as TypedDocumentString<ApplyDiscountMutation, ApplyDiscountMutationVariables>;
export const CheckoutDocument = new TypedDocumentString(`
    mutation Checkout($input: CheckoutInput!) {
  cart {
    checkout(input: $input) {
      id
      orderNumber
      state
      subtotal
      discount
      appliedDiscount {
        code
        type
        value
        amount
      }
      tax
      total
      currency
      customerEmail
      accessToken
      poNumber
      customerNote
      customFields
      shippingTotal
      pricesIncludeTax
      shippingMethod {
        id
        label
        price
      }
      shippingAddress {
        name
        company
        line1
        line2
        postalCode
        city
        region
        country
        phone
        vatId
      }
      taxSummary {
        rateId
        name
        rate
        base
        amount
      }
      items {
        name
        sku
        quantity
        price
        listPrice
        tierMinQty
        currency
        taxRate
        taxAmount
      }
    }
  }
}
    `) as unknown as TypedDocumentString<CheckoutMutation, CheckoutMutationVariables>;
export const ClearCartDocument = new TypedDocumentString(`
    mutation ClearCart($workspaceId: ID!, $channel: String) {
  cart {
    clear(workspaceId: $workspaceId, channel: $channel) {
      id
      status
      itemCount
      subtotal
      currency
      discountedTotal
      tax
      totalGross
      amounts {
        subtotal {
          gross
        }
        discount {
          gross
        }
        shipping {
          gross
        }
      }
      pricesIncludeTax
      channel
      displayMode
      taxTreatment {
        kind
        legalNote
        buyerVatId
        buyerVatCountry
      }
      shippingTotal
      taxSummary {
        rateId
        name
        rate
        base
        amount
      }
      shippingMethod {
        id
        label
        price
        etaLabel
      }
      availableShippingMethods {
        id
        label
        price
        etaLabel
        amount {
          gross
        }
      }
      appliedDiscount {
        code
        type
        value
        computedAmount
      }
      items {
        id
        recordId
        quantity
        variantSelections
        unitPrice
        currentPrice
        priceMismatch
        unit {
          net
          gross
        }
        line {
          net
          gross
        }
        snapshot {
          name
          price
          currency
          imageUrl
          sku
          tiers {
            minQty
            price
          }
        }
      }
    }
  }
}
    `) as unknown as TypedDocumentString<ClearCartMutation, ClearCartMutationVariables>;
export const MemberChangePasswordDocument = new TypedDocumentString(`
    mutation MemberChangePassword($currentPassword: String!, $newPassword: String!) {
  siteMember {
    changePassword(currentPassword: $currentPassword, newPassword: $newPassword) {
      success
      message
      accessToken
      refreshToken
      accessTokenExpiresIn
    }
  }
}
    `) as unknown as TypedDocumentString<MemberChangePasswordMutation, MemberChangePasswordMutationVariables>;
export const MemberConfirmLoginChangeDocument = new TypedDocumentString(`
    mutation MemberConfirmLoginChange($token: String!) {
  siteMember {
    confirmLoginChange(token: $token) {
      success
      message
    }
  }
}
    `) as unknown as TypedDocumentString<MemberConfirmLoginChangeMutation, MemberConfirmLoginChangeMutationVariables>;
export const MemberDeleteAccountDocument = new TypedDocumentString(`
    mutation MemberDeleteAccount($currentPassword: String!) {
  siteMember {
    deleteAccount(currentPassword: $currentPassword) {
      success
      message
    }
  }
}
    `) as unknown as TypedDocumentString<MemberDeleteAccountMutation, MemberDeleteAccountMutationVariables>;
export const MemberRequestLoginChangeDocument = new TypedDocumentString(`
    mutation MemberRequestLoginChange($newLogin: String!, $currentPassword: String!) {
  siteMember {
    requestLoginChange(newLogin: $newLogin, currentPassword: $currentPassword) {
      success
      message
    }
  }
}
    `) as unknown as TypedDocumentString<MemberRequestLoginChangeMutation, MemberRequestLoginChangeMutationVariables>;
export const MemberUpdateProfileDocument = new TypedDocumentString(`
    mutation MemberUpdateProfile($fields: JSON!) {
  siteMember {
    updateProfile(fields: $fields) {
      id
      login
      pendingLogin
      data
      editableFields
      loginField
      passwordField
      company {
        id
        name
        role
        permissions
      }
      priceList {
        name
      }
    }
  }
}
    `) as unknown as TypedDocumentString<MemberUpdateProfileMutation, MemberUpdateProfileMutationVariables>;
export const MergeCartDocument = new TypedDocumentString(`
    mutation MergeCart($workspaceId: ID!, $channel: String) {
  cart {
    merge(workspaceId: $workspaceId, channel: $channel) {
      id
      status
      itemCount
      subtotal
      currency
      discountedTotal
      tax
      totalGross
      amounts {
        subtotal {
          gross
        }
        discount {
          gross
        }
        shipping {
          gross
        }
      }
      pricesIncludeTax
      channel
      displayMode
      taxTreatment {
        kind
        legalNote
        buyerVatId
        buyerVatCountry
      }
      shippingTotal
      taxSummary {
        rateId
        name
        rate
        base
        amount
      }
      shippingMethod {
        id
        label
        price
        etaLabel
      }
      availableShippingMethods {
        id
        label
        price
        etaLabel
        amount {
          gross
        }
      }
      appliedDiscount {
        code
        type
        value
        computedAmount
      }
      items {
        id
        recordId
        quantity
        variantSelections
        unitPrice
        currentPrice
        priceMismatch
        unit {
          net
          gross
        }
        line {
          net
          gross
        }
        snapshot {
          name
          price
          currency
          imageUrl
          sku
          tiers {
            minQty
            price
          }
        }
      }
    }
  }
}
    `) as unknown as TypedDocumentString<MergeCartMutation, MergeCartMutationVariables>;
export const RemoveCartItemDocument = new TypedDocumentString(`
    mutation RemoveCartItem($workspaceId: ID!, $itemId: ID!, $channel: String) {
  cart {
    removeItem(workspaceId: $workspaceId, channel: $channel, itemId: $itemId) {
      id
      status
      itemCount
      subtotal
      currency
      discountedTotal
      tax
      totalGross
      amounts {
        subtotal {
          gross
        }
        discount {
          gross
        }
        shipping {
          gross
        }
      }
      pricesIncludeTax
      channel
      displayMode
      taxTreatment {
        kind
        legalNote
        buyerVatId
        buyerVatCountry
      }
      shippingTotal
      taxSummary {
        rateId
        name
        rate
        base
        amount
      }
      shippingMethod {
        id
        label
        price
        etaLabel
      }
      availableShippingMethods {
        id
        label
        price
        etaLabel
        amount {
          gross
        }
      }
      appliedDiscount {
        code
        type
        value
        computedAmount
      }
      items {
        id
        recordId
        quantity
        variantSelections
        unitPrice
        currentPrice
        priceMismatch
        unit {
          net
          gross
        }
        line {
          net
          gross
        }
        snapshot {
          name
          price
          currency
          imageUrl
          sku
          tiers {
            minQty
            price
          }
        }
      }
    }
  }
}
    `) as unknown as TypedDocumentString<RemoveCartItemMutation, RemoveCartItemMutationVariables>;
export const RemoveDiscountDocument = new TypedDocumentString(`
    mutation RemoveDiscount($workspaceId: ID!, $channel: String) {
  cart {
    removeDiscount(workspaceId: $workspaceId, channel: $channel) {
      id
      status
      itemCount
      subtotal
      currency
      discountedTotal
      tax
      totalGross
      amounts {
        subtotal {
          gross
        }
        discount {
          gross
        }
        shipping {
          gross
        }
      }
      pricesIncludeTax
      channel
      displayMode
      taxTreatment {
        kind
        legalNote
        buyerVatId
        buyerVatCountry
      }
      shippingTotal
      taxSummary {
        rateId
        name
        rate
        base
        amount
      }
      shippingMethod {
        id
        label
        price
        etaLabel
      }
      availableShippingMethods {
        id
        label
        price
        etaLabel
        amount {
          gross
        }
      }
      appliedDiscount {
        code
        type
        value
        computedAmount
      }
      items {
        id
        recordId
        quantity
        variantSelections
        unitPrice
        currentPrice
        priceMismatch
        unit {
          net
          gross
        }
        line {
          net
          gross
        }
        snapshot {
          name
          price
          currency
          imageUrl
          sku
          tiers {
            minQty
            price
          }
        }
      }
    }
  }
}
    `) as unknown as TypedDocumentString<RemoveDiscountMutation, RemoveDiscountMutationVariables>;
export const RequestReturnDocument = new TypedDocumentString(`
    mutation RequestReturn($workspaceId: ID!, $orderId: ID!, $accessToken: String, $lines: [ReturnLineInput!]!, $note: String) {
  public {
    order {
      requestReturn(
        workspaceId: $workspaceId
        orderId: $orderId
        accessToken: $accessToken
        lines: $lines
        note: $note
      ) {
        id
      }
    }
  }
}
    `) as unknown as TypedDocumentString<RequestReturnMutation, RequestReturnMutationVariables>;
export const SetShippingAddressDocument = new TypedDocumentString(`
    mutation SetShippingAddress($workspaceId: ID!, $shippingAddress: ShippingAddressInput, $channel: String) {
  cart {
    setShippingAddress(
      workspaceId: $workspaceId
      channel: $channel
      shippingAddress: $shippingAddress
    ) {
      id
      status
      itemCount
      subtotal
      currency
      discountedTotal
      tax
      totalGross
      amounts {
        subtotal {
          gross
        }
        discount {
          gross
        }
        shipping {
          gross
        }
      }
      pricesIncludeTax
      channel
      displayMode
      taxTreatment {
        kind
        legalNote
        buyerVatId
        buyerVatCountry
      }
      shippingTotal
      taxSummary {
        rateId
        name
        rate
        base
        amount
      }
      shippingMethod {
        id
        label
        price
        etaLabel
      }
      availableShippingMethods {
        id
        label
        price
        etaLabel
        amount {
          gross
        }
      }
      appliedDiscount {
        code
        type
        value
        computedAmount
      }
      items {
        id
        recordId
        quantity
        variantSelections
        unitPrice
        currentPrice
        priceMismatch
        unit {
          net
          gross
        }
        line {
          net
          gross
        }
        snapshot {
          name
          price
          currency
          imageUrl
          sku
          tiers {
            minQty
            price
          }
        }
      }
    }
  }
}
    `) as unknown as TypedDocumentString<SetShippingAddressMutation, SetShippingAddressMutationVariables>;
export const SetShippingMethodDocument = new TypedDocumentString(`
    mutation SetShippingMethod($workspaceId: ID!, $shippingMethodId: String, $channel: String) {
  cart {
    setShippingMethod(
      workspaceId: $workspaceId
      channel: $channel
      shippingMethodId: $shippingMethodId
    ) {
      id
      status
      itemCount
      subtotal
      currency
      discountedTotal
      tax
      totalGross
      amounts {
        subtotal {
          gross
        }
        discount {
          gross
        }
        shipping {
          gross
        }
      }
      pricesIncludeTax
      channel
      displayMode
      taxTreatment {
        kind
        legalNote
        buyerVatId
        buyerVatCountry
      }
      shippingTotal
      taxSummary {
        rateId
        name
        rate
        base
        amount
      }
      shippingMethod {
        id
        label
        price
        etaLabel
      }
      availableShippingMethods {
        id
        label
        price
        etaLabel
        amount {
          gross
        }
      }
      appliedDiscount {
        code
        type
        value
        computedAmount
      }
      items {
        id
        recordId
        quantity
        variantSelections
        unitPrice
        currentPrice
        priceMismatch
        unit {
          net
          gross
        }
        line {
          net
          gross
        }
        snapshot {
          name
          price
          currency
          imageUrl
          sku
          tiers {
            minQty
            price
          }
        }
      }
    }
  }
}
    `) as unknown as TypedDocumentString<SetShippingMethodMutation, SetShippingMethodMutationVariables>;
export const SiteMemberForgotPasswordDocument = new TypedDocumentString(`
    mutation SiteMemberForgotPassword($modelSlug: String!, $identity: String!) {
  siteMember {
    forgotPassword(modelSlug: $modelSlug, identity: $identity) {
      success
      message
    }
  }
}
    `) as unknown as TypedDocumentString<SiteMemberForgotPasswordMutation, SiteMemberForgotPasswordMutationVariables>;
export const SiteMemberLoginDocument = new TypedDocumentString(`
    mutation SiteMemberLogin($input: SiteMemberLoginInput!) {
  siteMember {
    login(input: $input) {
      success
      message
      accessToken
      refreshToken
      accessTokenExpiresIn
    }
  }
}
    `) as unknown as TypedDocumentString<SiteMemberLoginMutation, SiteMemberLoginMutationVariables>;
export const SiteMemberLogoutDocument = new TypedDocumentString(`
    mutation SiteMemberLogout($refreshToken: String!) {
  siteMember {
    logout(refreshToken: $refreshToken) {
      success
      message
    }
  }
}
    `) as unknown as TypedDocumentString<SiteMemberLogoutMutation, SiteMemberLogoutMutationVariables>;
export const SiteMemberRefreshDocument = new TypedDocumentString(`
    mutation SiteMemberRefresh($refreshToken: String!) {
  siteMember {
    refresh(refreshToken: $refreshToken) {
      success
      message
      accessToken
      refreshToken
      accessTokenExpiresIn
    }
  }
}
    `) as unknown as TypedDocumentString<SiteMemberRefreshMutation, SiteMemberRefreshMutationVariables>;
export const SiteMemberRegisterDocument = new TypedDocumentString(`
    mutation SiteMemberRegister($input: SiteMemberRegisterInput!) {
  siteMember {
    register(input: $input) {
      success
      message
    }
  }
}
    `) as unknown as TypedDocumentString<SiteMemberRegisterMutation, SiteMemberRegisterMutationVariables>;
export const SiteMemberResetPasswordDocument = new TypedDocumentString(`
    mutation SiteMemberResetPassword($token: String!, $newPassword: String!) {
  siteMember {
    resetPassword(token: $token, newPassword: $newPassword) {
      success
      message
    }
  }
}
    `) as unknown as TypedDocumentString<SiteMemberResetPasswordMutation, SiteMemberResetPasswordMutationVariables>;
export const SiteMemberVerifyEmailDocument = new TypedDocumentString(`
    mutation SiteMemberVerifyEmail($token: String!) {
  siteMember {
    verifyEmail(token: $token) {
      success
      message
    }
  }
}
    `) as unknown as TypedDocumentString<SiteMemberVerifyEmailMutation, SiteMemberVerifyEmailMutationVariables>;
export const UpdateCartItemDocument = new TypedDocumentString(`
    mutation UpdateCartItem($input: UpdateCartItemInput!) {
  cart {
    updateItem(input: $input) {
      id
      status
      itemCount
      subtotal
      currency
      discountedTotal
      tax
      totalGross
      amounts {
        subtotal {
          gross
        }
        discount {
          gross
        }
        shipping {
          gross
        }
      }
      pricesIncludeTax
      channel
      displayMode
      taxTreatment {
        kind
        legalNote
        buyerVatId
        buyerVatCountry
      }
      shippingTotal
      taxSummary {
        rateId
        name
        rate
        base
        amount
      }
      shippingMethod {
        id
        label
        price
        etaLabel
      }
      availableShippingMethods {
        id
        label
        price
        etaLabel
        amount {
          gross
        }
      }
      appliedDiscount {
        code
        type
        value
        computedAmount
      }
      items {
        id
        recordId
        quantity
        variantSelections
        unitPrice
        currentPrice
        priceMismatch
        unit {
          net
          gross
        }
        line {
          net
          gross
        }
        snapshot {
          name
          price
          currency
          imageUrl
          sku
          tiers {
            minQty
            price
          }
        }
      }
    }
  }
}
    `) as unknown as TypedDocumentString<UpdateCartItemMutation, UpdateCartItemMutationVariables>;
export const CartDocument = new TypedDocumentString(`
    query Cart($workspaceId: ID!, $channel: String) {
  cart {
    get(workspaceId: $workspaceId, channel: $channel) {
      id
      status
      itemCount
      subtotal
      currency
      discountedTotal
      tax
      totalGross
      amounts {
        subtotal {
          gross
        }
        discount {
          gross
        }
        shipping {
          gross
        }
      }
      pricesIncludeTax
      channel
      displayMode
      taxTreatment {
        kind
        legalNote
        buyerVatId
        buyerVatCountry
      }
      shippingTotal
      taxSummary {
        rateId
        name
        rate
        base
        amount
      }
      shippingMethod {
        id
        label
        price
        etaLabel
      }
      availableShippingMethods {
        id
        label
        price
        etaLabel
        amount {
          gross
        }
      }
      appliedDiscount {
        code
        type
        value
        computedAmount
      }
      items {
        id
        recordId
        quantity
        variantSelections
        unitPrice
        currentPrice
        priceMismatch
        unit {
          net
          gross
        }
        line {
          net
          gross
        }
        snapshot {
          name
          price
          currency
          imageUrl
          sku
          tiers {
            minQty
            price
          }
        }
      }
    }
  }
}
    `) as unknown as TypedDocumentString<CartQuery, CartQueryVariables>;
export const PublicModelProductsDocument = new TypedDocumentString(`
    query PublicModelProducts($workspaceId: String!, $modelSlug: String!, $filter: JSON, $stockState: String, $locale: String, $limit: Int, $offset: Int, $sort: String) {
  public {
    model {
      records(
        workspaceId: $workspaceId
        modelSlug: $modelSlug
        filter: $filter
        stockState: $stockState
        locale: $locale
        limit: $limit
        offset: $offset
        sort: $sort
      ) {
        items {
          id
          data
          priceTiers {
            minQty
            price
          }
          variantCount
          variantPriceRange {
            min
          }
          available
        }
        total
        hasMore
      }
    }
  }
}
    `) as unknown as TypedDocumentString<PublicModelProductsQuery, PublicModelProductsQueryVariables>;
export const MyProfileDocument = new TypedDocumentString(`
    query MyProfile($workspaceId: ID!) {
  account {
    profile(workspaceId: $workspaceId) {
      id
      login
      pendingLogin
      data
      editableFields
      loginField
      passwordField
      company {
        id
        name
        role
        permissions
      }
      priceList {
        name
      }
    }
  }
}
    `) as unknown as TypedDocumentString<MyProfileQuery, MyProfileQueryVariables>;
export const PublicOrderDocument = new TypedDocumentString(`
    query PublicOrder($workspaceId: ID!, $orderId: ID!, $accessToken: String!) {
  public {
    order {
      byToken(workspaceId: $workspaceId, orderId: $orderId, accessToken: $accessToken) {
        id
        orderNumber
        state
        paymentStatus
        fulfillmentStatus
        deliveryStatus
        subtotal
        discount
        appliedDiscount {
          code
          type
          value
          amount
        }
        tax
        total
        pricesIncludeTax
        companyName
        channel {
          key
          name
        }
        priceList {
          name
        }
        priceListSource
        taxTreatment {
          kind
          legalNote
          buyerVatId
          buyerVatCountry
        }
        taxSummary {
          rateId
          name
          rate
          base
          amount
        }
        currency
        customerEmail
        poNumber
        customerNote
        customFields
        shippingTotal
        shippingMethod {
          id
          label
          price
        }
        shippingAddress {
          name
          company
          line1
          line2
          postalCode
          city
          region
          country
          phone
          vatId
        }
        amountPaid
        balanceDue
        refundedAmount
        shipments {
          carrier
          trackingNumber
          trackingUrl
          status
          updatedAt
          deliveredAt
          items {
            itemId
            quantity
          }
        }
        returns {
          id
          number
          status
          requestedAt
          receivedAt
          completedAt
          refundedAmount
          carrier
          trackingNumber
          lines {
            itemId
            quantity
            reason
            receivedQuantity
          }
        }
        invoiceNumber
        invoiceUrl
        paidAt
        fulfilledAt
        deliveredAt
        createdAt
        items {
          id
          name
          price
          listPrice
          tierMinQty
          currency
          quantity
          sku
          taxRate
          taxAmount
        }
      }
    }
  }
}
    `) as unknown as TypedDocumentString<PublicOrderQuery, PublicOrderQueryVariables>;
export const MyOrdersDocument = new TypedDocumentString(`
    query MyOrders($workspaceId: ID!, $skip: Int, $limit: Int, $scope: AccountOrderScope) {
  account {
    orders(workspaceId: $workspaceId, skip: $skip, limit: $limit, scope: $scope) {
      total
      hasMore
      items {
        id
        state
        subtotal
        discount
        appliedDiscount {
          code
          type
          value
          amount
        }
        tax
        total
        pricesIncludeTax
        companyName
        channel {
          key
          name
        }
        priceList {
          name
        }
        priceListSource
        taxTreatment {
          kind
          legalNote
          buyerVatId
          buyerVatCountry
        }
        taxSummary {
          rateId
          name
          rate
          base
          amount
        }
        currency
        customerEmail
        refundedAmount
        paymentStatus
        fulfillmentStatus
        deliveryStatus
        amountPaid
        balanceDue
        shipments {
          carrier
          trackingNumber
          trackingUrl
          status
          updatedAt
        }
        invoiceNumber
        invoiceUrl
        paidAt
        fulfilledAt
        deliveredAt
        createdAt
        orderNumber
        poNumber
        customerNote
        customFields
        shippingTotal
        shippingMethod {
          id
          label
          price
        }
        shippingAddress {
          name
          company
          line1
          line2
          postalCode
          city
          region
          country
          phone
          vatId
        }
        items {
          name
          price
          listPrice
          tierMinQty
          currency
          quantity
          sku
        }
      }
    }
  }
}
    `) as unknown as TypedDocumentString<MyOrdersQuery, MyOrdersQueryVariables>;
export const MyOrderDocument = new TypedDocumentString(`
    query MyOrder($workspaceId: ID!, $id: ID!) {
  account {
    order(workspaceId: $workspaceId, id: $id) {
      id
      state
      subtotal
      discount
      appliedDiscount {
        code
        type
        value
        amount
      }
      tax
      total
      pricesIncludeTax
      companyName
      channel {
        key
        name
      }
      priceList {
        name
      }
      priceListSource
      taxTreatment {
        kind
        legalNote
        buyerVatId
        buyerVatCountry
      }
      taxSummary {
        rateId
        name
        rate
        base
        amount
      }
      currency
      customerEmail
      refundedAmount
      paymentStatus
      fulfillmentStatus
      deliveryStatus
      amountPaid
      balanceDue
      shipments {
        carrier
        trackingNumber
        trackingUrl
        status
        updatedAt
        deliveredAt
        items {
          itemId
          quantity
        }
      }
      returns {
        id
        number
        status
        requestedAt
        receivedAt
        completedAt
        refundedAmount
        carrier
        trackingNumber
        lines {
          itemId
          quantity
          reason
          receivedQuantity
        }
      }
      invoiceNumber
      invoiceUrl
      paidAt
      fulfilledAt
      deliveredAt
      createdAt
      orderNumber
      poNumber
      customerNote
      customFields
      shippingTotal
      shippingMethod {
        id
        label
        price
      }
      shippingAddress {
        name
        company
        line1
        line2
        postalCode
        city
        region
        country
        phone
        vatId
      }
      items {
        id
        name
        price
        listPrice
        tierMinQty
        currency
        quantity
        sku
      }
    }
  }
}
    `) as unknown as TypedDocumentString<MyOrderQuery, MyOrderQueryVariables>;
export const PublicPagesByTypeDocument = new TypedDocumentString(`
    query PublicPagesByType($workspaceId: String!, $parentSlug: String, $limit: Int, $offset: Int) {
  public {
    page {
      byType(
        workspaceId: $workspaceId
        parentSlug: $parentSlug
        limit: $limit
        offset: $offset
      ) {
        items {
          id
          slug
          fullSlug
          publishedAt
          displayName
          seoTitle
          seoDescription
        }
        hasMore
      }
    }
  }
}
    `) as unknown as TypedDocumentString<PublicPagesByTypeQuery, PublicPagesByTypeQueryVariables>;
export const ProductBySkuDocument = new TypedDocumentString(`
    query ProductBySku($workspaceId: String!, $modelSlug: String!, $sku: String!, $locale: String) {
  public {
    model {
      records(
        workspaceId: $workspaceId
        modelSlug: $modelSlug
        sku: $sku
        locale: $locale
        limit: 2
      ) {
        items {
          id
          data
          variantCount
          variants(sku: $sku, limit: 1) {
            selectedOptions {
              name
              value
            }
          }
        }
      }
    }
  }
}
    `) as unknown as TypedDocumentString<ProductBySkuQuery, ProductBySkuQueryVariables>;
export const ProductRolesDocument = new TypedDocumentString(`
    query ProductRoles($workspaceId: String!) {
  public {
    model {
      definitions(workspaceId: $workspaceId) {
        slug
        productRoles {
          taxRate
        }
      }
    }
  }
}
    `) as unknown as TypedDocumentString<ProductRolesQuery, ProductRolesQueryVariables>;
export const ProductVariantPageDocument = new TypedDocumentString(`
    query ProductVariantPage($workspaceId: String!, $modelSlug: String!, $filter: JSON, $locale: String, $offset: Int!) {
  public {
    model {
      records(
        workspaceId: $workspaceId
        modelSlug: $modelSlug
        filter: $filter
        locale: $locale
        limit: 1
      ) {
        items {
          id
          variantCount
          available
          variantPriceRange {
            min
          }
          v0: variants(offset: 0) {
            id
            sku
            price
          }
          v1: variants(offset: 50) {
            id
            sku
            price
          }
          v2: variants(offset: 100) {
            id
            sku
            price
          }
          v3: variants(offset: 150) {
            id
            sku
            price
          }
          v4: variants(offset: 200) {
            id
            sku
            price
          }
          v5: variants(offset: 250) {
            id
            sku
            price
          }
          v6: variants(offset: 300) {
            id
            sku
            price
          }
          v7: variants(offset: 350) {
            id
            sku
            price
          }
          v8: variants(offset: 400) {
            id
            sku
            price
          }
          v9: variants(offset: 450) {
            id
            sku
            price
          }
          page: variants(offset: $offset) {
            id
            sku
            price
            inventory
            tiers {
              minQty
              price
            }
            selectedOptions {
              name
              value
            }
          }
        }
      }
    }
  }
}
    `) as unknown as TypedDocumentString<ProductVariantPageQuery, ProductVariantPageQueryVariables>;
export const ProductDocument = new TypedDocumentString(`
    query Product($workspaceId: String!, $modelSlug: String!, $filter: JSON, $locale: String) {
  public {
    model {
      records(
        workspaceId: $workspaceId
        modelSlug: $modelSlug
        filter: $filter
        locale: $locale
        limit: 1
      ) {
        items {
          id
          data
          priceTiers {
            minQty
            price
          }
          variantCount
          variantPriceRange {
            min
          }
          available
          variants {
            id
            sku
            price
            inventory
            tiers {
              minQty
              price
            }
            selectedOptions {
              name
              value
            }
          }
        }
      }
    }
  }
}
    `) as unknown as TypedDocumentString<ProductQuery, ProductQueryVariables>;
export const ShopSettingsDocument = new TypedDocumentString(`
    query ShopSettings($workspaceSlug: String!) {
  public {
    siteConfig(workspaceSlug: $workspaceSlug) {
      id
      lowStockThreshold
      publicCart {
        defaultCurrency
        defaultTaxRateId
        taxRates {
          id
          rate
        }
        shippingMethods {
          enabled
          countries
        }
        orderFields {
          key
          label
          type
          required
          customerCanSet
          description
          options {
            value
            label
          }
          minLength
          maxLength
          minValue
          maxValue
          pattern
        }
      }
    }
  }
}
    `) as unknown as TypedDocumentString<ShopSettingsQuery, ShopSettingsQueryVariables>;