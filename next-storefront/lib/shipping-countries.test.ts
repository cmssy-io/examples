import { describe, expect, it } from "vitest";
import { countryOptions, shippingCountries } from "./shipping-countries";

describe("shippingCountries", () => {
  it("joins the countries of every enabled method once", () => {
    expect(
      shippingCountries([
        { enabled: true, countries: ["PL", "de"] },
        { enabled: true, countries: ["US", "PL"] },
        { enabled: false, countries: ["JP"] },
      ]),
    ).toEqual(["PL", "DE", "US"]);
  });

  it("gives no list when an enabled method ships everywhere", () => {
    expect(
      shippingCountries([
        { enabled: true, countries: ["PL"] },
        { enabled: true, countries: [] },
      ]),
    ).toBeNull();
  });

  it("ignores a disabled method that ships everywhere", () => {
    expect(
      shippingCountries([
        { enabled: false, countries: [] },
        { enabled: true, countries: ["NO"] },
      ]),
    ).toEqual(["NO"]);
  });

  it("is empty when nothing ships", () => {
    expect(shippingCountries([])).toEqual([]);
  });
});

describe("countryOptions", () => {
  it("names each country in the shop's language and sorts by that name", () => {
    expect(countryOptions(["US", "DE", "NO"], "en")).toEqual([
      { code: "DE", name: "Germany" },
      { code: "NO", name: "Norway" },
      { code: "US", name: "United States" },
    ]);
    expect(countryOptions(["DE", "NO"], "no").map((o) => o.name)).toEqual([
      "Norge",
      "Tyskland",
    ]);
  });

  it("falls back to the code for a locale it cannot name in", () => {
    expect(countryOptions(["PL", "DE", "NO"], "not a locale!")).toEqual([
      { code: "DE", name: "DE" },
      { code: "NO", name: "NO" },
      { code: "PL", name: "PL" },
    ]);
  });
});
