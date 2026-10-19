export interface ShippingMethodCountries {
  enabled: boolean;
  countries: readonly string[];
}

export function shippingCountries(
  methods: readonly ShippingMethodCountries[],
): string[] | null {
  const codes = new Set<string>();
  for (const method of methods) {
    if (!method.enabled) continue;
    if (method.countries.length === 0) return null;
    for (const code of method.countries) codes.add(code.toUpperCase());
  }
  return [...codes];
}

export interface CountryOption {
  code: string;
  name: string;
}

export function countryOptions(
  codes: readonly string[],
  locale: string,
): CountryOption[] {
  let names: Intl.DisplayNames | null = null;
  try {
    names = new Intl.DisplayNames([locale], { type: "region" });
  } catch {
    names = null;
  }
  const collation = names ? locale : undefined;
  return codes
    .map((code) => ({ code, name: names?.of(code) ?? code }))
    .sort((a, b) => a.name.localeCompare(b.name, collation));
}
