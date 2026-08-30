/* eslint-disable */
/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import { DocumentTypeDecoration } from '@graphql-typed-document-node/core';
/** Input for adding an item to a cart */
export type AddToCartInput = {
  notes?: string | null | undefined;
  quantity: number;
  /** ModelRecord ID (product) */
  recordId: string | number;
  variantSelections?: unknown;
  workspaceId: string | number;
};

export type CheckoutInput = {
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
  fields?: unknown;
  identity: string;
  modelSlug: string;
  password: string;
};

export type SubmitFormInput = {
  data: unknown;
  website?: string | null | undefined;
};

/** Input for updating a cart item */
export type UpdateCartItemInput = {
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


export type PublicPageLayoutsQuery = { public: { page: { layouts: Array<{ position: string, settings: unknown, blocks: Array<{ id: string, type: string, content: unknown, style: unknown, advanced: unknown, order: number, isActive: boolean }> }> } } };

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


export type PublicFormQuery = { public: { form: { get: { id: string, name: string, slug: string, description: string | null, fields: Array<{ id: string, name: string, fieldType: FormFieldType, label: unknown, placeholder: unknown, helpText: unknown, defaultValue: string | null, width: string, order: number, showWhen: unknown, requiredWhen: unknown, options: Array<{ value: string, label: unknown, disabled: boolean }>, validation: { required: boolean, minLength: number | null, maxLength: number | null, minValue: number | null, maxValue: number | null, pattern: string | null, customMessage: string | null } }>, settings: { actionType: FormActionType, submitButtonLabel: unknown, successMessage: unknown, errorMessage: unknown, redirectUrl: string | null, requireLogin: boolean, enableCaptcha: boolean } } | null } } };

export type SubmitFormMutationVariables = Exact<{
  formId: string | number;
  input: SubmitFormInput;
}>;


export type SubmitFormMutation = { public: { form: { submit: { success: boolean, message: string, submissionId: string | null, redirectUrl: string | null, accessToken: string | null, customer: unknown } } } };

export type AddToCartMutationVariables = Exact<{
  input: AddToCartInput;
}>;


export type AddToCartMutation = { cart: { addItem: { id: string, status: string, itemCount: number, subtotal: number, currency: string | null, discountedTotal: number, tax: number, totalGross: number, pricesIncludeTax: boolean, shippingTotal: number, taxSummary: Array<{ rateId: string | null, name: string | null, rate: number, base: number, amount: number }>, shippingMethod: { id: string, label: string, price: number, etaLabel: string | null } | null, availableShippingMethods: Array<{ id: string, label: string, price: number, etaLabel: string | null }>, appliedDiscount: { code: string, type: string, value: number, computedAmount: number } | null, items: Array<{ id: string, recordId: string, quantity: number, variantSelections: unknown, unitPrice: number, currentPrice: number | null, priceMismatch: boolean, snapshot: { name: string, price: number, currency: string, imageUrl: string | null, sku: string | null, tiers: Array<{ minQty: number, price: number }> } }> } } };

export type ApplyDiscountMutationVariables = Exact<{
  workspaceId: string | number;
  code: string;
}>;


export type ApplyDiscountMutation = { cart: { applyDiscount: { id: string, status: string, itemCount: number, subtotal: number, currency: string | null, discountedTotal: number, tax: number, totalGross: number, pricesIncludeTax: boolean, shippingTotal: number, taxSummary: Array<{ rateId: string | null, name: string | null, rate: number, base: number, amount: number }>, shippingMethod: { id: string, label: string, price: number, etaLabel: string | null } | null, availableShippingMethods: Array<{ id: string, label: string, price: number, etaLabel: string | null }>, appliedDiscount: { code: string, type: string, value: number, computedAmount: number } | null, items: Array<{ id: string, recordId: string, quantity: number, variantSelections: unknown, unitPrice: number, currentPrice: number | null, priceMismatch: boolean, snapshot: { name: string, price: number, currency: string, imageUrl: string | null, sku: string | null, tiers: Array<{ minQty: number, price: number }> } }> } } };

export type CheckoutMutationVariables = Exact<{
  input: CheckoutInput;
}>;


export type CheckoutMutation = { cart: { checkout: { id: string, orderNumber: number | null, status: string, subtotal: number, discount: number, tax: number, total: number, currency: string, customerEmail: string, accessToken: string | null, poNumber: string | null, customerNote: string | null, shippingTotal: number, pricesIncludeTax: boolean, appliedDiscount: { code: string, type: string, value: number, amount: number } | null, shippingMethod: { id: string, label: string, price: number } | null, shippingAddress: { name: string, company: string | null, line1: string, line2: string | null, postalCode: string, city: string, region: string | null, country: string, phone: string | null, vatId: string | null } | null, taxSummary: Array<{ rateId: string | null, name: string | null, rate: number, base: number, amount: number }>, items: Array<{ name: string, sku: string | null, quantity: number, price: number, listPrice: number | null, tierMinQty: number | null, currency: string, taxRate: number, taxAmount: number }> } } };

export type ClearCartMutationVariables = Exact<{
  workspaceId: string | number;
}>;


export type ClearCartMutation = { cart: { clear: { id: string, status: string, itemCount: number, subtotal: number, currency: string | null, discountedTotal: number, tax: number, totalGross: number, pricesIncludeTax: boolean, shippingTotal: number, taxSummary: Array<{ rateId: string | null, name: string | null, rate: number, base: number, amount: number }>, shippingMethod: { id: string, label: string, price: number, etaLabel: string | null } | null, availableShippingMethods: Array<{ id: string, label: string, price: number, etaLabel: string | null }>, appliedDiscount: { code: string, type: string, value: number, computedAmount: number } | null, items: Array<{ id: string, recordId: string, quantity: number, variantSelections: unknown, unitPrice: number, currentPrice: number | null, priceMismatch: boolean, snapshot: { name: string, price: number, currency: string, imageUrl: string | null, sku: string | null, tiers: Array<{ minQty: number, price: number }> } }> } } };

export type MergeCartMutationVariables = Exact<{
  workspaceId: string | number;
}>;


export type MergeCartMutation = { cart: { merge: { id: string, status: string, itemCount: number, subtotal: number, currency: string | null, discountedTotal: number, tax: number, totalGross: number, pricesIncludeTax: boolean, shippingTotal: number, taxSummary: Array<{ rateId: string | null, name: string | null, rate: number, base: number, amount: number }>, shippingMethod: { id: string, label: string, price: number, etaLabel: string | null } | null, availableShippingMethods: Array<{ id: string, label: string, price: number, etaLabel: string | null }>, appliedDiscount: { code: string, type: string, value: number, computedAmount: number } | null, items: Array<{ id: string, recordId: string, quantity: number, variantSelections: unknown, unitPrice: number, currentPrice: number | null, priceMismatch: boolean, snapshot: { name: string, price: number, currency: string, imageUrl: string | null, sku: string | null, tiers: Array<{ minQty: number, price: number }> } }> } } };

export type RemoveCartItemMutationVariables = Exact<{
  workspaceId: string | number;
  itemId: string | number;
}>;


export type RemoveCartItemMutation = { cart: { removeItem: { id: string, status: string, itemCount: number, subtotal: number, currency: string | null, discountedTotal: number, tax: number, totalGross: number, pricesIncludeTax: boolean, shippingTotal: number, taxSummary: Array<{ rateId: string | null, name: string | null, rate: number, base: number, amount: number }>, shippingMethod: { id: string, label: string, price: number, etaLabel: string | null } | null, availableShippingMethods: Array<{ id: string, label: string, price: number, etaLabel: string | null }>, appliedDiscount: { code: string, type: string, value: number, computedAmount: number } | null, items: Array<{ id: string, recordId: string, quantity: number, variantSelections: unknown, unitPrice: number, currentPrice: number | null, priceMismatch: boolean, snapshot: { name: string, price: number, currency: string, imageUrl: string | null, sku: string | null, tiers: Array<{ minQty: number, price: number }> } }> } } };

export type RemoveDiscountMutationVariables = Exact<{
  workspaceId: string | number;
}>;


export type RemoveDiscountMutation = { cart: { removeDiscount: { id: string, status: string, itemCount: number, subtotal: number, currency: string | null, discountedTotal: number, tax: number, totalGross: number, pricesIncludeTax: boolean, shippingTotal: number, taxSummary: Array<{ rateId: string | null, name: string | null, rate: number, base: number, amount: number }>, shippingMethod: { id: string, label: string, price: number, etaLabel: string | null } | null, availableShippingMethods: Array<{ id: string, label: string, price: number, etaLabel: string | null }>, appliedDiscount: { code: string, type: string, value: number, computedAmount: number } | null, items: Array<{ id: string, recordId: string, quantity: number, variantSelections: unknown, unitPrice: number, currentPrice: number | null, priceMismatch: boolean, snapshot: { name: string, price: number, currency: string, imageUrl: string | null, sku: string | null, tiers: Array<{ minQty: number, price: number }> } }> } } };

export type SetShippingMethodMutationVariables = Exact<{
  workspaceId: string | number;
  shippingMethodId?: string | null | undefined;
}>;


export type SetShippingMethodMutation = { cart: { setShippingMethod: { id: string, status: string, itemCount: number, subtotal: number, currency: string | null, discountedTotal: number, tax: number, totalGross: number, pricesIncludeTax: boolean, shippingTotal: number, taxSummary: Array<{ rateId: string | null, name: string | null, rate: number, base: number, amount: number }>, shippingMethod: { id: string, label: string, price: number, etaLabel: string | null } | null, availableShippingMethods: Array<{ id: string, label: string, price: number, etaLabel: string | null }>, appliedDiscount: { code: string, type: string, value: number, computedAmount: number } | null, items: Array<{ id: string, recordId: string, quantity: number, variantSelections: unknown, unitPrice: number, currentPrice: number | null, priceMismatch: boolean, snapshot: { name: string, price: number, currency: string, imageUrl: string | null, sku: string | null, tiers: Array<{ minQty: number, price: number }> } }> } } };

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

export type UpdateCartItemMutationVariables = Exact<{
  input: UpdateCartItemInput;
}>;


export type UpdateCartItemMutation = { cart: { updateItem: { id: string, status: string, itemCount: number, subtotal: number, currency: string | null, discountedTotal: number, tax: number, totalGross: number, pricesIncludeTax: boolean, shippingTotal: number, taxSummary: Array<{ rateId: string | null, name: string | null, rate: number, base: number, amount: number }>, shippingMethod: { id: string, label: string, price: number, etaLabel: string | null } | null, availableShippingMethods: Array<{ id: string, label: string, price: number, etaLabel: string | null }>, appliedDiscount: { code: string, type: string, value: number, computedAmount: number } | null, items: Array<{ id: string, recordId: string, quantity: number, variantSelections: unknown, unitPrice: number, currentPrice: number | null, priceMismatch: boolean, snapshot: { name: string, price: number, currency: string, imageUrl: string | null, sku: string | null, tiers: Array<{ minQty: number, price: number }> } }> } } };

export type CartQueryVariables = Exact<{
  workspaceId: string | number;
}>;


export type CartQuery = { cart: { get: { id: string, status: string, itemCount: number, subtotal: number, currency: string | null, discountedTotal: number, tax: number, totalGross: number, pricesIncludeTax: boolean, shippingTotal: number, taxSummary: Array<{ rateId: string | null, name: string | null, rate: number, base: number, amount: number }>, shippingMethod: { id: string, label: string, price: number, etaLabel: string | null } | null, availableShippingMethods: Array<{ id: string, label: string, price: number, etaLabel: string | null }>, appliedDiscount: { code: string, type: string, value: number, computedAmount: number } | null, items: Array<{ id: string, recordId: string, quantity: number, variantSelections: unknown, unitPrice: number, currentPrice: number | null, priceMismatch: boolean, snapshot: { name: string, price: number, currency: string, imageUrl: string | null, sku: string | null, tiers: Array<{ minQty: number, price: number }> } }> } } };

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


export type PublicModelProductsQuery = { public: { model: { records: { total: number, hasMore: boolean, items: Array<{ id: string, data: unknown, priceTiers: Array<{ minQty: number, price: number }> }> } } } };

export type PublicOrderQueryVariables = Exact<{
  workspaceId: string | number;
  orderId: string | number;
  accessToken: string;
}>;


export type PublicOrderQuery = { public: { order: { byToken: { id: string, orderNumber: number | null, status: string, paymentStatus: string, fulfillmentStatus: string, subtotal: number, discount: number, tax: number, total: number, pricesIncludeTax: boolean, currency: string, customerEmail: string, poNumber: string | null, customerNote: string | null, shippingTotal: number, amountPaid: number, balanceDue: number, refundedAmount: number, trackingNumber: string | null, trackingCarrier: string | null, invoiceNumber: string | null, invoiceUrl: string | null, paidAt: string | null, fulfilledAt: string | null, createdAt: string, appliedDiscount: { code: string, type: string, value: number, amount: number } | null, taxSummary: Array<{ rateId: string | null, name: string | null, rate: number, base: number, amount: number }>, shippingMethod: { id: string, label: string, price: number } | null, shippingAddress: { name: string, company: string | null, line1: string, line2: string | null, postalCode: string, city: string, region: string | null, country: string, phone: string | null, vatId: string | null } | null, items: Array<{ name: string, price: number, listPrice: number | null, tierMinQty: number | null, currency: string, quantity: number, sku: string | null, taxRate: number, taxAmount: number }> } } } };

export type MyOrdersQueryVariables = Exact<{
  workspaceId: string | number;
  skip?: number | null | undefined;
  limit?: number | null | undefined;
}>;


export type MyOrdersQuery = { account: { orders: { total: number, hasMore: boolean, items: Array<{ id: string, status: string, subtotal: number, discount: number, tax: number, total: number, pricesIncludeTax: boolean, currency: string, customerEmail: string, refundedAmount: number, paymentProvider: string | null, paymentStatus: string, fulfillmentStatus: string, amountPaid: number, balanceDue: number, paymentReference: string | null, trackingNumber: string | null, trackingCarrier: string | null, invoiceNumber: string | null, invoiceUrl: string | null, invoiceProvider: string | null, paidAt: string | null, fulfilledAt: string | null, createdAt: string, orderNumber: number | null, poNumber: string | null, customerNote: string | null, shippingTotal: number, appliedDiscount: { code: string, type: string, value: number, amount: number } | null, taxSummary: Array<{ rateId: string | null, name: string | null, rate: number, base: number, amount: number }>, shippingMethod: { id: string, label: string, price: number } | null, shippingAddress: { name: string, company: string | null, line1: string, line2: string | null, postalCode: string, city: string, region: string | null, country: string, phone: string | null, vatId: string | null } | null, items: Array<{ name: string, price: number, listPrice: number | null, tierMinQty: number | null, currency: string, quantity: number, sku: string | null }>, payments: Array<{ amount: number, reference: string, provider: string | null, at: string }> }> } } };

export type MyOrderQueryVariables = Exact<{
  workspaceId: string | number;
  id: string | number;
}>;


export type MyOrderQuery = { account: { order: { id: string, status: string, subtotal: number, discount: number, tax: number, total: number, pricesIncludeTax: boolean, currency: string, customerEmail: string, refundedAmount: number, paymentProvider: string | null, paymentStatus: string, fulfillmentStatus: string, amountPaid: number, balanceDue: number, paymentReference: string | null, trackingNumber: string | null, trackingCarrier: string | null, invoiceNumber: string | null, invoiceUrl: string | null, invoiceProvider: string | null, paidAt: string | null, fulfilledAt: string | null, createdAt: string, orderNumber: number | null, poNumber: string | null, customerNote: string | null, shippingTotal: number, appliedDiscount: { code: string, type: string, value: number, amount: number } | null, taxSummary: Array<{ rateId: string | null, name: string | null, rate: number, base: number, amount: number }>, shippingMethod: { id: string, label: string, price: number } | null, shippingAddress: { name: string, company: string | null, line1: string, line2: string | null, postalCode: string, city: string, region: string | null, country: string, phone: string | null, vatId: string | null } | null, items: Array<{ name: string, price: number, listPrice: number | null, tierMinQty: number | null, currency: string, quantity: number, sku: string | null }>, payments: Array<{ amount: number, reference: string, provider: string | null, at: string }> } | null } };

export type PublicPagesByTypeQueryVariables = Exact<{
  workspaceId: string;
  parentSlug?: string | null | undefined;
  limit?: number | null | undefined;
  offset?: number | null | undefined;
}>;


export type PublicPagesByTypeQuery = { public: { page: { byType: { hasMore: boolean, items: Array<{ id: string, slug: string, fullSlug: string, publishedAt: string | null, displayName: unknown, seoTitle: unknown, seoDescription: unknown }> } } } };

export type ProductQueryVariables = Exact<{
  workspaceId: string;
  modelSlug: string;
  filter?: unknown;
}>;


export type ProductQuery = { public: { model: { records: { items: Array<{ id: string, data: unknown, priceTiers: Array<{ minQty: number, price: number }>, variants: Array<{ id: string, sku: string | null, price: number, inventory: number | null, tiers: Array<{ minQty: number, price: number }>, selectedOptions: Array<{ name: string, value: string }> }> }> } } } };

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
        position
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
          enableCaptcha
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
        accessToken
        customer
      }
    }
  }
}
    `) as unknown as TypedDocumentString<SubmitFormMutation, SubmitFormMutationVariables>;
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
      pricesIncludeTax
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
    mutation ApplyDiscount($workspaceId: ID!, $code: String!) {
  cart {
    applyDiscount(workspaceId: $workspaceId, code: $code) {
      id
      status
      itemCount
      subtotal
      currency
      discountedTotal
      tax
      totalGross
      pricesIncludeTax
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
      status
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
    mutation ClearCart($workspaceId: ID!) {
  cart {
    clear(workspaceId: $workspaceId) {
      id
      status
      itemCount
      subtotal
      currency
      discountedTotal
      tax
      totalGross
      pricesIncludeTax
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
export const MergeCartDocument = new TypedDocumentString(`
    mutation MergeCart($workspaceId: ID!) {
  cart {
    merge(workspaceId: $workspaceId) {
      id
      status
      itemCount
      subtotal
      currency
      discountedTotal
      tax
      totalGross
      pricesIncludeTax
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
    mutation RemoveCartItem($workspaceId: ID!, $itemId: ID!) {
  cart {
    removeItem(workspaceId: $workspaceId, itemId: $itemId) {
      id
      status
      itemCount
      subtotal
      currency
      discountedTotal
      tax
      totalGross
      pricesIncludeTax
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
    mutation RemoveDiscount($workspaceId: ID!) {
  cart {
    removeDiscount(workspaceId: $workspaceId) {
      id
      status
      itemCount
      subtotal
      currency
      discountedTotal
      tax
      totalGross
      pricesIncludeTax
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
export const SetShippingMethodDocument = new TypedDocumentString(`
    mutation SetShippingMethod($workspaceId: ID!, $shippingMethodId: String) {
  cart {
    setShippingMethod(
      workspaceId: $workspaceId
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
      pricesIncludeTax
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
      pricesIncludeTax
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
    query Cart($workspaceId: ID!) {
  cart {
    get(workspaceId: $workspaceId) {
      id
      status
      itemCount
      subtotal
      currency
      discountedTotal
      tax
      totalGross
      pricesIncludeTax
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
        }
        total
        hasMore
      }
    }
  }
}
    `) as unknown as TypedDocumentString<PublicModelProductsQuery, PublicModelProductsQueryVariables>;
export const PublicOrderDocument = new TypedDocumentString(`
    query PublicOrder($workspaceId: ID!, $orderId: ID!, $accessToken: String!) {
  public {
    order {
      byToken(workspaceId: $workspaceId, orderId: $orderId, accessToken: $accessToken) {
        id
        orderNumber
        status
        paymentStatus
        fulfillmentStatus
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
        trackingNumber
        trackingCarrier
        invoiceNumber
        invoiceUrl
        paidAt
        fulfilledAt
        createdAt
        items {
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
    query MyOrders($workspaceId: ID!, $skip: Int, $limit: Int) {
  account {
    orders(workspaceId: $workspaceId, skip: $skip, limit: $limit) {
      total
      hasMore
      items {
        id
        status
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
        paymentProvider
        paymentStatus
        fulfillmentStatus
        amountPaid
        balanceDue
        paymentReference
        trackingNumber
        trackingCarrier
        invoiceNumber
        invoiceUrl
        invoiceProvider
        paidAt
        fulfilledAt
        createdAt
        orderNumber
        poNumber
        customerNote
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
        payments {
          amount
          reference
          provider
          at
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
      status
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
      paymentProvider
      paymentStatus
      fulfillmentStatus
      amountPaid
      balanceDue
      paymentReference
      trackingNumber
      trackingCarrier
      invoiceNumber
      invoiceUrl
      invoiceProvider
      paidAt
      fulfilledAt
      createdAt
      orderNumber
      poNumber
      customerNote
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
      payments {
        amount
        reference
        provider
        at
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
export const ProductDocument = new TypedDocumentString(`
    query Product($workspaceId: String!, $modelSlug: String!, $filter: JSON) {
  public {
    model {
      records(
        workspaceId: $workspaceId
        modelSlug: $modelSlug
        filter: $filter
        limit: 1
      ) {
        items {
          id
          data
          priceTiers {
            minQty
            price
          }
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