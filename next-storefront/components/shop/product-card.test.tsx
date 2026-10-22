import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { Product } from "@/lib/catalog";
import { CurrencyProvider, LocaleProvider } from "./locale-ui";
import { ProductCard } from "./product-card";

const pathname = vi.hoisted(() => ({ current: "/" }));

vi.mock("next/navigation", () => ({
  usePathname: () => pathname.current,
}));
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

function render(locale: string, currency: string | null): string {
  pathname.current = locale === "en" ? "/c/all" : `/${locale}/c/all`;
  const html = renderToStaticMarkup(
    <LocaleProvider
      value={{ locale, defaultLocale: "en", locales: ["en", "no"] }}
    >
      <CurrencyProvider currency={currency}>
        <ProductCard product={PRODUCT} />
      </CurrencyProvider>
    </LocaleProvider>,
  );
  return html.replace(/\s/g, " ");
}

describe("ProductCard in a NOK workspace", () => {
  it("prices in kroner on the Norwegian shop", () => {
    const html = render("no", "NOK");
    expect(html).toContain("21,00 kr");
    expect(html).toContain("19,00 kr");
    expect(html).not.toContain("€");
  });

  it("prices in NOK on the English shop", () => {
    const html = render("en", "NOK");
    expect(html).toContain("NOK 21.00");
    expect(html).not.toContain("€");
  });

  it("refuses to price without a currency provider", () => {
    expect(() =>
      renderToStaticMarkup(
        <LocaleProvider
          value={{ locale: "en", defaultLocale: "en", locales: ["en"] }}
        >
          <ProductCard product={PRODUCT} />
        </LocaleProvider>,
      ),
    ).toThrow("CurrencyProvider");
  });
});
