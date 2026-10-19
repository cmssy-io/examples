import { describe, expect, it } from "vitest";
import {
  referenceFromNote,
  referenceNote,
  routeFor,
  splitName,
  splitStreet,
} from "./shipping";

describe("routeFor", () => {
  it.each([
    ["courier24", "PL", "inpost", "InPost"],
    ["courier-express", "pl", "inpost", "InPost"],
    ["us-ground", "US", "shippo", "USPS"],
    ["us-priority", "us", "shippo", "USPS"],
    ["dhl-express", "NO", "shippo", "DHL Express"],
    ["dhl-express", "DE", "shippo", "DHL Express"],
    ["nordic-letter", "FI", "shippo", "Deutsche Post"],
  ])("sends %s to %s via %s as %s", (method, country, provider, carrier) => {
    expect(routeFor(method, country)).toMatchObject({ provider, carrier });
  });

  it.each([
    ["courier24", "DE"],
    ["nordic-letter", "DE"],
    ["us-ground", "CA"],
    ["dhl-express", "US"],
    ["pallet", "PL"],
    ["pickup", "PL"],
  ])("leaves %s to %s for a person to ship", (method, country) => {
    expect(routeFor(method, country)).toBeNull();
  });
});

describe("splitStreet", () => {
  it.each([
    ["ul. Przemysłowa 12", "ul. Przemysłowa", "12"],
    ["Aleje Jerozolimskie 134/2A", "Aleje Jerozolimskie", "134/2A"],
    ["Storgata 7b", "Storgata", "7b"],
  ])("splits %s", (line, street, buildingNumber) => {
    expect(splitStreet(line)).toEqual({ street, buildingNumber });
  });

  it("refuses a line without a building number", () => {
    expect(splitStreet("Plac Defilad")).toBeNull();
  });
});

describe("splitName", () => {
  it("keeps every given name before the surname", () => {
    expect(splitName("Anna Maria Kowalska")).toEqual({
      first: "Anna Maria",
      last: "Kowalska",
    });
  });

  it("uses a single name for both parts", () => {
    expect(splitName("Kowalski")).toEqual({ first: "Kowalski", last: "Kowalski" });
  });
});

describe("the shipment note", () => {
  it("reads back the carrier reference it wrote", () => {
    expect(referenceFromNote("InPost", referenceNote("InPost", "1234567"))).toBe(
      "1234567",
    );
  });

  it("ignores a note another carrier or a person wrote", () => {
    expect(referenceFromNote("InPost", referenceNote("DHL Express", "70"))).toBeNull();
    expect(referenceFromNote("InPost", "left at the gate")).toBeNull();
    expect(referenceFromNote("InPost", null)).toBeNull();
  });
});
