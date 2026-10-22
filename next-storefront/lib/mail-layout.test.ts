import { describe, expect, it } from "vitest";
import {
  brandFrom,
  button,
  displayName,
  renderMail,
  safeUrl,
  type Brand,
} from "./mail-layout";

const BRAND: Brand = {
  name: "Northwind <Parts>",
  logoUrl: null,
  siteUrl: "https://parts.example",
};

function render(brand: Brand = BRAND) {
  return renderMail({
    brand,
    preheader: "Your order #7 has been placed.",
    heading: "Order #7 confirmed",
    body: "<p>body</p>",
    reason: "You received this email because you placed an order.",
  });
}

describe("renderMail", () => {
  it("wraps the body in a centered 600px card with a hidden preheader", () => {
    const html = render();
    expect(html).toContain("max-width:600px");
    expect(html).toMatch(
      /<div style="display:none;[^"]*">Your order #7 has been placed\.<\/div>/,
    );
    expect(html).toContain(">Order #7 confirmed</h1>");
    expect(html).toContain("<p>body</p>");
    expect(html).not.toMatch(/<link|<style/);
  });

  it("names the shop it is given, escaped, in the header and the footer", () => {
    const html = render();
    expect(html.match(/Northwind &lt;Parts&gt;/g)).toHaveLength(2);
    expect(html).not.toContain("<Parts>");
    const other = render({ ...BRAND, name: "Fjord Tools" });
    expect(other).toContain("Fjord Tools");
    expect(other).not.toContain("Northwind");
    expect(other).not.toMatch(/MACHTEC|cmssy/i);
  });

  it("shows the logo instead of the name when the shop has one", () => {
    const html = render({ ...BRAND, logoUrl: "https://cdn.example/logo.png" });
    expect(html).toContain(
      '<img src="https://cdn.example/logo.png" alt="Northwind &lt;Parts&gt;"',
    );
    expect(render()).not.toContain("<img");
  });
});

describe("button", () => {
  it("escapes the label and the link", () => {
    const html = button("Go <now>", 'https://shop.example/?a=1&b="x"');
    expect(html).toContain(
      'href="https://shop.example/?a=1&amp;b=&quot;x&quot;"',
    );
    expect(html).toContain(">Go &lt;now&gt;</a>");
  });
});

describe("safeUrl", () => {
  it("keeps web links and drops everything else", () => {
    expect(safeUrl("https://track.example/1")).toBe("https://track.example/1");
    expect(safeUrl("http://track.example/1")).toBe("http://track.example/1");
    expect(safeUrl("javascript:alert(1)")).toBeNull();
    expect(safeUrl("not a url")).toBeNull();
    expect(safeUrl(null)).toBeNull();
  });
});

describe("displayName", () => {
  it("reads the name part of a sender address", () => {
    expect(displayName("Fjord Tools <shop@fjord.example>")).toBe("Fjord Tools");
    expect(displayName('"Fjord Tools" <shop@fjord.example>')).toBe(
      "Fjord Tools",
    );
    expect(displayName("shop@fjord.example")).toBeNull();
    expect(displayName(undefined)).toBeNull();
  });
});

describe("brandFrom", () => {
  const options = {
    mailFrom: "Mail Sender <shop@shop.example>",
    siteUrl: "https://parts.example",
  };

  it("prefers the brand name set in cmssy", () => {
    const brand = brandFrom(
      {
        siteName: "Site title",
        defaultLanguage: "en",
        branding: {
          brandName: " Northwind ",
          logoUrl: "https://cdn.example/l.png",
        },
      },
      options,
    );
    expect(brand).toEqual({
      name: "Northwind",
      logoUrl: "https://cdn.example/l.png",
      siteUrl: "https://parts.example",
    });
  });

  it("falls back to the site name in the default language", () => {
    const brand = brandFrom(
      {
        siteName: { de: "Nordwind", en: "Northwind" },
        defaultLanguage: "en",
        branding: { brandName: "", logoUrl: "javascript:alert(1)" },
      },
      options,
    );
    expect(brand.name).toBe("Northwind");
    expect(brand.logoUrl).toBeNull();
  });

  it("uses the sender's display name only when cmssy has no name", () => {
    expect(brandFrom(null, options).name).toBe("Mail Sender");
    expect(
      brandFrom(
        { siteName: null, defaultLanguage: null, branding: null },
        options,
      ).name,
    ).toBe("Mail Sender");
  });

  it("ends at the site's host when nothing names the shop", () => {
    expect(
      brandFrom(null, { mailFrom: "shop@x.example", siteUrl: options.siteUrl })
        .name,
    ).toBe("parts.example");
  });
});
