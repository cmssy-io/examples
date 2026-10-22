import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { formatMoney } from "./money";

const plain = (text: string) => text.replace(/\s/g, " ");

describe("formatMoney", () => {
  it("prints NOK the way a Norwegian page writes it", () => {
    expect(plain(formatMoney(2100, "NOK", "no"))).toBe("21,00 kr");
  });

  it("prints NOK by its code on an English page", () => {
    expect(plain(formatMoney(2100, "NOK", "en"))).toBe("NOK 21.00");
  });

  it("prints EUR in either locale", () => {
    expect(plain(formatMoney(2100, "EUR", "en"))).toBe("€21.00");
    expect(plain(formatMoney(2100, "EUR", "no"))).toBe("21,00 €");
  });

  it("prints a bare amount when the currency is unknown", () => {
    expect(plain(formatMoney(123456, null, "en"))).toBe("1,234.56");
    expect(plain(formatMoney(123456, null, "no"))).toBe("1 234,56");
  });
});

const ROOT = fileURLToPath(new URL("..", import.meta.url));

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    if (!/\.(ts|tsx|astro|mjs)$/.test(entry.name)) return [];
    if (/\.test\.tsx?$/.test(entry.name)) return [];
    return [path];
  });
}

describe("currency literals", () => {
  it("leaves no currency or number locale hardcoded in the app", () => {
    const offenders = sourceFiles(ROOT).filter((file) =>
      /["'`](EUR|en-IE)["'`]/.test(readFileSync(file, "utf8")),
    );
    expect(offenders.map((file) => relative(ROOT, file))).toEqual([]);
  });
});
