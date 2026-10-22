import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { Product } from "../../services/catalog";
import { LocaleProvider, useMoney } from "./locale-ui";
import { ProductCard } from "./product-card";

vi.mock("./add-to-cart-button", () => ({ AddToCartButton: () => null }));

const PRODUCT: Product = {
  id: "p1",
  title: "Anchor bolt",
  slug: "anchor-bolt",
  sku: "AB-1",
  brand: null,
  categoryId: null,
  description: null,
  price: 2100,
  taxRate: 25,
  unit: "pcs",
  packaging: null,
  available: null,
  lowStockThreshold: null,
  specs: null,
  datasheetUrl: null,
  tiers: [{ minQty: 10, price: 1900 }],
  image: null,
  gallery: [],
  documents: [],
  video: null,
  fromPrice: 2100,
  hasVariants: true,
  variantCount: 2,
  variants: [],
};

function shop(locale: string, currency: string | null, node: ReactNode) {
  const html = renderToStaticMarkup(
    <LocaleProvider
      value={{
        locale,
        defaultLocale: "en",
        locales: ["en", "no"],
        pathname: "/c/all",
        search: "",
        currency,
      }}
    >
      {node}
    </LocaleProvider>,
  );
  return html.replace(/\s/g, " ");
}

describe("ProductCard in a NOK workspace", () => {
  it("prices in kroner on the Norwegian shop", () => {
    const html = shop("no", "NOK", <ProductCard product={PRODUCT} />);
    expect(html).toContain("21,00 kr");
    expect(html).toContain("19,00 kr");
    expect(html).not.toContain("€");
  });

  it("prices in NOK on the English shop", () => {
    const html = shop("en", "NOK", <ProductCard product={PRODUCT} />);
    expect(html).toContain("NOK 21.00");
    expect(html).not.toContain("€");
  });
});

function Amount({ currency }: { currency?: string | null }) {
  return <>{useMoney(currency)(2100)}</>;
}

describe("useMoney", () => {
  it("prices a cart or an order in its own currency over the shop's", () => {
    expect(shop("en", "NOK", <Amount currency="EUR" />)).toBe("€21.00");
  });

  it("falls back to the shop currency when the amount carries none", () => {
    expect(shop("en", "NOK", <Amount currency={null} />)).toBe("NOK 21.00");
  });
});
