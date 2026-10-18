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
    ["courier24", "PL", "inpost"],
    ["courier-express", "pl", "inpost"],
    ["bring-home", "NO", "bring"],
  ])("sends %s to %s via the carrier that serves it", (method, country, provider) => {
    expect(routeFor(method, country)).toBe(provider);
  });

  it.each([
    ["courier24", "DE"],
    ["bring-home", "SE"],
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
    expect(referenceFromNote("InPost", referenceNote("Bring", "70"))).toBeNull();
    expect(referenceFromNote("InPost", "left at the gate")).toBeNull();
    expect(referenceFromNote("InPost", null)).toBeNull();
  });
});
