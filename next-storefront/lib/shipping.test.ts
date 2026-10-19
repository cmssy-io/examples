import { describe, expect, it } from "vitest";
import { referenceFromNote, referenceNote, routeFor } from "./shipping";

describe("routeFor", () => {
  it.each([
    ["us-ground", "US", "shippo", "USPS"],
    ["us-priority", "us", "shippo", "USPS"],
    ["dhl-express", "NO", "shippo", "DHL Express"],
    ["dhl-express", "DE", "shippo", "DHL Express"],
    ["nordic-letter", "FI", "shippo", "Deutsche Post"],
  ])("sends %s to %s via %s as %s", (method, country, provider, carrier) => {
    expect(routeFor(method, country)).toMatchObject({ provider, carrier });
  });

  it.each([
    ["courier24", "PL"],
    ["nordic-letter", "DE"],
    ["us-ground", "CA"],
    ["dhl-express", "US"],
    ["pallet", "PL"],
    ["pickup", "PL"],
  ])("leaves %s to %s for a person to ship", (method, country) => {
    expect(routeFor(method, country)).toBeNull();
  });
});

describe("the shipment note", () => {
  it("reads back the carrier reference it wrote", () => {
    expect(referenceFromNote("USPS", referenceNote("USPS", "1234567"))).toBe(
      "1234567",
    );
  });

  it("ignores a note another carrier or a person wrote", () => {
    expect(
      referenceFromNote("USPS", referenceNote("DHL Express", "70")),
    ).toBeNull();
    expect(referenceFromNote("USPS", "left at the gate")).toBeNull();
    expect(referenceFromNote("USPS", null)).toBeNull();
  });
});
