import { describe, expect, it } from "vitest";
import {
  orderCanceledMail,
  orderConfirmationMail,
  orderShippedMail,
  taxNote,
  type OrderForMail,
} from "./order-mail";

const taxed = (net: number, tax: number) => ({ net, tax, gross: net + tax });

function order(overrides: Partial<OrderForMail> = {}): OrderForMail {
  return {
    id: "o1",
    orderNumber: 42,
    customerEmail: "buyer@example.com",
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
  const mail = orderConfirmationMail(order());

  it("goes to the buyer under the order number", () => {
    expect(mail.to).toBe("buyer@example.com");
    expect(mail.subject).toBe("Your order #42 is confirmed");
  });

  it("lists every line with its quantity and gross total", () => {
    expect(mail.text).toContain("2 x Oak <desk> (DESK-1)  €498.00");
    expect(mail.text).toContain("1 x Cable tray  €12.30");
    expect(mail.html).toContain("Oak &lt;desk&gt; (DESK-1)");
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
    );
    expect(discounted.text).toContain("Discount: -€12.30");
  });

  it("carries no tax note on a standard order", () => {
    expect(mail.text).not.toContain("Reverse charge");
  });

  it("carries the reverse-charge legal note and the buyer's VAT id", () => {
    const reverse = orderConfirmationMail(
      order({ taxTreatment: REVERSE_CHARGE }),
    );
    const note = `${REVERSE_CHARGE.legalNote} Buyer VAT ID: DE123456789.`;
    expect(reverse.text).toContain(note);
    expect(reverse.html).toContain("Art. 196");
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
    const mail = orderShippedMail(order(), {
      carrier: "USPS",
      trackingNumber: "9400100000000000000000",
      trackingUrl:
        "https://tools.usps.com/go/TrackConfirmAction?tLabels=9400&x=1",
    });
    expect(mail.subject).toBe("Your order #42 has shipped");
    expect(mail.text).toContain("Carrier: USPS");
    expect(mail.text).toContain("Tracking number: 9400100000000000000000");
    expect(mail.text).toContain("Track it: https://tools.usps.com/");
    expect(mail.html).toContain(
      'href="https://tools.usps.com/go/TrackConfirmAction?tLabels=9400&amp;x=1"',
    );
  });

  it("works without a tracking link", () => {
    const mail = orderShippedMail(order(), {
      carrier: null,
      trackingNumber: "JD0001",
      trackingUrl: null,
    });
    expect(mail.text).toContain("Tracking number: JD0001");
    expect(mail.html).not.toContain("href");
  });
});

describe("orderCanceledMail", () => {
  it("tells the buyer the order is canceled", () => {
    const mail = orderCanceledMail(order({ orderNumber: null }));
    expect(mail.subject).toBe("Your order was canceled");
    expect(mail.text).toContain("Order total: €522.60");
  });
});
