import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { Cart, CartItem } from "@/graphql/types";
import { copyFor } from "@/lib/shop-copy";
import { CurrencyProvider, LocaleProvider } from "./locale-ui";
import { CartView } from "./cart-view";

const cartState = vi.hoisted(() => ({
  cart: null as unknown,
  unavailableItemId: null as string | null,
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/no/cart",
  useRouter: () => ({ push: () => {} }),
}));
vi.mock("@/components/shop/user-provider", () => ({
  useCmssyUser: () => ({ user: null }),
}));
vi.mock("@/components/shop/cart-provider", () => ({
  useCart: () => ({
    cart: cartState.cart,
    loading: false,
    error: null,
    signInRequired: false,
    unavailableItemId: cartState.unavailableItemId,
    updateItem: async () => true,
    removeItem: async () => true,
    applyDiscount: async () => true,
    removeDiscount: async () => true,
    setShippingMethod: async () => true,
    setShippingAddress: async () => true,
    checkout: async () => {
      throw new Error("not in this test");
    },
  }),
}));

const amount = (gross: number) => ({ net: gross, gross });

function line(id: string, name: string, currentPrice: number | null): CartItem {
  return {
    id,
    recordId: `record-${id}`,
    quantity: 2,
    variantSelections: null,
    unitPrice: 1000,
    currentPrice,
    priceMismatch: false,
    unit: amount(1000),
    line: amount(2000),
    snapshot: {
      name,
      price: 1000,
      currency: "EUR",
      imageUrl: null,
      sku: null,
      tiers: [],
    },
  };
}

function cartWith(items: CartItem[]): Cart {
  return {
    id: "cart-1",
    status: "active",
    itemCount: items.length,
    subtotal: 4000,
    currency: "EUR",
    discountedTotal: 4000,
    tax: 0,
    totalGross: 4000,
    pricesIncludeTax: true,
    channel: null,
    displayMode: "gross",
    shippingTotal: 0,
    amounts: {
      subtotal: { gross: 4000 },
      discount: { gross: 0 },
      shipping: { gross: 0 },
    },
    taxTreatment: {
      kind: "standard",
      legalNote: null,
      buyerVatId: null,
      buyerVatCountry: null,
    },
    taxSummary: [],
    shippingMethod: null,
    availableShippingMethods: [],
    appliedDiscount: null,
    items,
  } as Cart;
}

function render(items: CartItem[], unavailableItemId: string | null = null) {
  cartState.cart = cartWith(items);
  cartState.unavailableItemId = unavailableItemId;
  return renderToStaticMarkup(
    <LocaleProvider
      value={{ locale: "no", defaultLocale: "en", locales: ["en", "no"] }}
    >
      <CurrencyProvider currency="EUR">
        <CartView payOnline={false} orderFields={[]} countries={null} />
      </CurrencyProvider>
    </LocaleProvider>,
  );
}

const copy = copyFor("no");

function quantityInputs(html: string): string[] {
  return [
    ...html.matchAll(
      /aria-label="([^"]+)"[^>]*type="number"|type="number"[^>]*aria-label="([^"]+)"/g,
    ),
  ].map((m) => m[1] ?? m[2]);
}

describe("CartView with a line that is no longer available", () => {
  it("notes the unavailable line, keeps Remove and hides its quantity", () => {
    const html = render([
      line("kept", "Anchor bolt", 1000),
      line("gone", "Valve 52", null),
    ]);

    expect(html.split(copy.lineUnavailable)).toHaveLength(2);
    expect(html.split(`>${copy.remove}</button>`)).toHaveLength(3);
    expect(quantityInputs(html)).toEqual([
      copy.quantityFor.replace("{name}", "Anchor bolt"),
    ]);
  });

  it("shows no note and a quantity for every line that is still sold", () => {
    const html = render([
      line("a", "Anchor bolt", 1000),
      line("b", "Valve 52", 1200),
    ]);

    expect(html).not.toContain(copy.lineUnavailable);
    expect(quantityInputs(html)).toHaveLength(2);
  });

  it("flags the line a refusal named before the cart is read again", () => {
    const html = render(
      [line("a", "Anchor bolt", 1000), line("b", "Valve 52", 1200)],
      "b",
    );

    expect(html.split(copy.lineUnavailable)).toHaveLength(2);
    expect(quantityInputs(html)).toEqual([
      copy.quantityFor.replace("{name}", "Anchor bolt"),
    ]);
  });
});
