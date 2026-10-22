import { describe, expect, it } from "vitest";
import {
  orderCanceledMail,
  orderConfirmationMail,
  orderShippedMail,
  taxNote,
  type OrderForMail,
} from "./order-mail";
import type { Brand } from "./mail-layout";

const BRAND: Brand = {
  name: "Northwind Parts",
  logoUrl: null,
  siteUrl: "https://parts.example",
};

const taxed = (net: number, tax: number) => ({ net, tax, gross: net + tax });

function order(overrides: Partial<OrderForMail> = {}): OrderForMail {
  return {
    id: "o1",
    orderNumber: 42,
    customerEmail: "buyer@example.com",
    customerId: null,
    currency: "EUR",
    items: [
      {
        name: "Oak <desk>",
        sku: "DESK-1",
        quantity: 2,
        taxRate: 0.23,
        line: taxed(40488, 9312),
      },
      {
        name: "Cable tray",
        sku: null,
        quantity: 1,
        taxRate: 0.23,
        line: taxed(1000, 230),
      },
    ],
    amounts: {
      subtotal: taxed(41488, 9542),
      discount: taxed(0, 0),
      shipping: taxed(1000, 230),
      total: taxed(42488, 9772),
    },
    taxTreatment: { kind: "standard", legalNote: null, buyerVatId: null },
    ...overrides,
  };
}

const REVERSE_CHARGE = {
  kind: "reverse_charge" as const,
  legalNote: "Reverse charge - Art. 196 Directive 2006/112/EC.",
  buyerVatId: "DE123456789",
};

describe("orderConfirmationMail", () => {
  const mail = orderConfirmationMail(order(), BRAND);

  it("goes to the buyer under the order number", () => {
    expect(mail.to).toBe("buyer@example.com");
    expect(mail.subject).toBe("Your order #42 is confirmed");
  });

  it("lists every line with its quantity and gross total", () => {
    expect(mail.text).toContain("2 x Oak <desk> (DESK-1)  €498.00");
    expect(mail.text).toContain("1 x Cable tray  €12.30");
    expect(mail.html).toContain("<strong>Oak &lt;desk&gt;</strong>");
    expect(mail.html).toMatch(
      /<strong>Oak &lt;desk&gt;<\/strong><br><span[^>]*>SKU DESK-1<\/span>/,
    );
    expect(mail.html).toContain("<strong>Cable tray</strong></td>");
    expect(mail.html).toContain("€404.88");
    expect(mail.html).not.toContain("€249.00");
    expect(mail.html).not.toContain("<desk>");
  });

  it("shows net, VAT and gross of the totals", () => {
    expect(mail.text).toContain("Subtotal: €510.30 (net €414.88, VAT €95.42)");
    expect(mail.text).toContain("Shipping: €12.30 (net €10.00, VAT €2.30)");
    expect(mail.text).toContain("Total: €522.60 (net €424.88, VAT €97.72)");
    expect(mail.html).toContain("€97.72");
  });

  it("leaves out a discount row when there is none, and shows one when there is", () => {
    expect(mail.text).not.toContain("Discount");
    const discounted = orderConfirmationMail(
      order({
        amounts: { ...order().amounts, discount: taxed(1000, 230) },
      }),
      BRAND,
    );
    expect(discounted.text).toContain("Discount: -€12.30");
    expect(mail.html).not.toContain(">Discount<");
    expect(discounted.html).toMatch(/>Discount<\/td><td[^>]*>-€12\.30</);
  });

  it("sums the order up as gross rows, then net, VAT and a bold total", () => {
    expect(mail.html).toMatch(/>Subtotal<\/td><td[^>]*>€510\.30</);
    expect(mail.html).toMatch(/>Shipping<\/td><td[^>]*>€12\.30</);
    expect(mail.html).toMatch(/>Total excl\. VAT<\/td><td[^>]*>€424\.88</);
    expect(mail.html).toMatch(/>VAT<\/td><td[^>]*>€97\.72</);
    expect(mail.html).toMatch(
      /font-size:18px;[^"]*font-weight:700;[^"]*">€522\.60</,
    );
  });

  it("is headed by the order number and signed by the shop", () => {
    expect(mail.html).toContain(">Order #42 confirmed</h1>");
    expect(mail.html).toContain("you placed an order at Northwind Parts.");
    expect(
      orderConfirmationMail(order({ orderNumber: null }), BRAND).html,
    ).toContain(">Order confirmed</h1>");
  });

  it("links a member to the order page, and a guest to nothing it cannot open", () => {
    expect(mail.html).not.toContain("View your order");
    expect(mail.text).not.toContain("View your order");
    const member = orderConfirmationMail(
      order({ id: "o 1", customerId: "m1" }),
      BRAND,
    );
    expect(member.html).toMatch(
      /href="https:\/\/parts\.example\/order\/o%201"[^>]*>View your order</,
    );
    expect(member.text).toContain(
      "View your order: https://parts.example/order/o%201",
    );
  });

  it("carries no tax note on a standard order", () => {
    expect(mail.text).not.toContain("Reverse charge");
    expect(mail.html).not.toContain("Reverse charge");
  });

  it("carries the reverse-charge legal note and the buyer's VAT id", () => {
    const reverse = orderConfirmationMail(
      order({ taxTreatment: REVERSE_CHARGE }),
      BRAND,
    );
    const note = `${REVERSE_CHARGE.legalNote} Buyer VAT ID: DE123456789.`;
    expect(reverse.text).toContain(note);
    expect(reverse.html).toMatch(
      /<td style="padding:16px;background:#f9fafb;[^>]*>Reverse charge - Art\. 196 Directive 2006\/112\/EC\. Buyer VAT ID: DE123456789\.<\/td>/,
    );
  });
});

describe("taxNote", () => {
  it("adds no legal text of its own when the seller set none", () => {
    expect(
      taxNote(
        order({
          taxTreatment: {
            ...REVERSE_CHARGE,
            legalNote: null,
            buyerVatId: null,
          },
        }),
      ),
    ).toBeNull();
  });

  it("gives the buyer VAT id without a note when the seller set none", () => {
    expect(
      taxNote(
        order({
          taxTreatment: {
            ...REVERSE_CHARGE,
            legalNote: null,
            buyerVatId: "DE123456789",
          },
        }),
      ),
    ).toBe("Buyer VAT ID: DE123456789.");
  });

  it("stays silent for an exempt order", () => {
    expect(
      taxNote(
        order({
          taxTreatment: {
            kind: "exempt",
            legalNote: "Exempt",
            buyerVatId: null,
          },
        }),
      ),
    ).toBeNull();
  });
});

describe("orderShippedMail", () => {
  it("gives the carrier, the tracking number and the tracking link", () => {
    const mail = orderShippedMail(
      order(),
      {
        carrier: "USPS",
        trackingNumber: "9400100000000000000000",
        trackingUrl:
          "https://tools.usps.com/go/TrackConfirmAction?tLabels=9400&x=1",
      },
      BRAND,
    );
    expect(mail.subject).toBe("Your order #42 has shipped");
    expect(mail.text).toContain("Carrier: USPS");
    expect(mail.text).toContain("Tracking number: 9400100000000000000000");
    expect(mail.text).toContain("Track it: https://tools.usps.com/");
    expect(mail.html).toContain(
      'href="https://tools.usps.com/go/TrackConfirmAction?tLabels=9400&amp;x=1"',
    );
    expect(mail.html).toContain(">Track your parcel</a>");
    expect(mail.html).toContain(">Order #42 has shipped</h1>");
    expect(mail.html).toMatch(/>Carrier<\/span><br><strong>USPS<\/strong>/);
    expect(mail.html).toMatch(
      />Tracking number<\/span><br><strong>9400100000000000000000<\/strong>/,
    );
  });

  it("works without a tracking link", () => {
    const mail = orderShippedMail(
      order(),
      {
        carrier: null,
        trackingNumber: "JD0001",
        trackingUrl: null,
      },
      BRAND,
    );
    expect(mail.text).toContain("Tracking number: JD0001");
    expect(mail.html).not.toContain("Track your parcel");
    expect(mail.html).not.toContain(">Carrier<");
  });

  it("puts no button on a tracking link that is not a web address", () => {
    const mail = orderShippedMail(
      order(),
      {
        carrier: null,
        trackingNumber: "JD0001",
        trackingUrl: "javascript:alert(1)",
      },
      BRAND,
    );
    expect(mail.html).not.toContain("Track your parcel");
    expect(mail.html).not.toContain("javascript:");
  });
});

describe("orderCanceledMail", () => {
  it("tells the buyer the order is canceled", () => {
    const mail = orderCanceledMail(order({ orderNumber: null }), BRAND);
    expect(mail.subject).toBe("Your order was canceled");
    expect(mail.text).toContain("Order total: €522.60");
    expect(mail.html).toContain(">Order canceled</h1>");
    expect(mail.html).toContain("Your order has been canceled.");
    expect(mail.html).toMatch(
      />Order total<\/span><br><strong>€522\.60<\/strong>/,
    );
  });
});
