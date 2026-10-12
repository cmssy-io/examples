import assert from "node:assert/strict";
import { describe, it } from "node:test";

const APPS = [
  "../next-storefront/lib/variants.ts",
  "../astro-storefront/src/lib/variants.ts",
  "../remix-storefront/app/lib/variants.ts",
];

const make = (n, prefix = "v", price = 100) =>
  Array.from({ length: n }, (_, i) => ({
    id: `${prefix}${i}`,
    sku: `${prefix}-sku-${i}`,
    price,
  }));

const ids = (variants) => variants.map((variant) => variant.id);

const reader =
  (states) =>
  (all, offset, cap = 500, id = "p1") => ({
    id,
    variantCount: all.length,
    states: all.slice(0, cap).map(({ id, sku, price }) => ({ id, sku, price })),
    page: all.slice(offset, offset + 50),
    head: { at: states.reads },
  });

for (const app of APPS) {
  const { readAllVariants, variantStates } = await import(app);

  describe(app, () => {
    const run = async (first, count, serve) => {
      const counter = { reads: 0 };
      const read = reader(counter);
      const result = await readAllVariants(
        { id: "p1", variantCount: count, variants: first },
        async (offset) => {
          counter.reads++;
          const all = serve(counter.reads);
          return all === null ? null : read(all, offset);
        },
      );
      return { result, reads: counter.reads };
    };

    it("reads nothing more for a product whose variants fit the first page", async () => {
      const all = make(12);
      const { result, reads } = await run(all, 12, () => all);
      assert.equal(reads, 0);
      assert.deepEqual(ids(result.variants), ids(all));
      assert.equal(result.head, null);
    });

    it("reads each later page once when nothing changes", async () => {
      const all = make(120);
      const { result, reads } = await run(all.slice(0, 50), 120, () => all);
      assert.equal(reads, 2);
      assert.deepEqual(ids(result.variants), ids(all));
      assert.deepEqual(result.head, { at: 2 });
    });

    it("drops a variant deleted from a page already read, and skips none", async () => {
      const before = make(120);
      const after = before.filter((variant) => variant.id !== "v10");
      const { result } = await run(before.slice(0, 50), 120, () => after);
      assert.deepEqual(ids(result.variants), ids(after));
    });

    it("drops a variant deleted from a page not read yet", async () => {
      const before = make(120);
      const after = before.filter((variant) => variant.id !== "v60");
      const { result } = await run(before.slice(0, 50), 120, () => after);
      assert.deepEqual(ids(result.variants), ids(after));
    });

    it("reads a variant inserted ahead of the pages already read, once", async () => {
      const before = make(120);
      const after = [{ id: "new", sku: "new-sku", price: 100 }, ...before];
      const { result } = await run(before.slice(0, 50), 120, () => after);
      assert.deepEqual(ids(result.variants), ids(after));
    });

    it("re-reads a variant whose SKU or price changed after it was read", async () => {
      const before = make(120);
      const after = before.map((variant) =>
        variant.id === "v3"
          ? { ...variant, sku: "v-sku-70" }
          : variant.id === "v70"
            ? { ...variant, sku: "v-sku-3" }
            : variant.id === "v5"
              ? { ...variant, price: 250 }
              : variant,
      );
      const { result } = await run(before.slice(0, 50), 120, () => after);
      assert.deepEqual(result.variants, after);
    });

    it("re-reads a variant whose price alone changed after it was read", async () => {
      const before = make(120);
      const after = before.map((variant) =>
        variant.id === "v5" ? { ...variant, price: 250 } : variant,
      );
      const { result } = await run(before.slice(0, 50), 120, () => after);
      assert.deepEqual(result.variants, after);
    });

    it("does not read again when only stock moved", async () => {
      const all = make(120);
      const { result, reads } = await run(all.slice(0, 50), 120, (n) =>
        all.map((variant) => ({ ...variant, inventory: n })),
      );
      assert.equal(reads, 2);
      assert.deepEqual(ids(result.variants), ids(all));
    });

    it("answers null when the slug now names another record", async () => {
      const all = make(120);
      const result = await readAllVariants(
        { id: "p1", variantCount: 120, variants: all.slice(0, 50) },
        async (offset) => reader({ reads: 1 })(all, offset, 500, "p2"),
      );
      assert.equal(result, null);
    });

    it("answers null when the product is gone mid-read", async () => {
      const { result } = await run(make(120).slice(0, 50), 120, () => null);
      assert.equal(result, null);
    });

    it("throws rather than render fewer variants than the product has", async () => {
      const all = make(520);
      await assert.rejects(
        readAllVariants(
          { id: "p1", variantCount: 520, variants: all.slice(0, 50) },
          async (offset) => reader({ reads: 0 })(all, offset, 500),
        ),
        /520 variants .* reads 500/,
      );
    });

    it("stops after a bounded number of reads when the variants never settle", async () => {
      const base = make(120);
      let reads = 0;
      await assert.rejects(
        readAllVariants(
          { id: "p1", variantCount: 120, variants: base.slice(0, 50) },
          async (offset) => {
            reads++;
            return reader({ reads })(
              [
                { id: `f${reads}`, sku: null, price: 1 },
                ...base,
                { id: `t${reads}`, sku: null, price: 1 },
              ],
              offset,
            );
          },
        ),
        /kept changing/,
      );
      assert.equal(reads, 21);
    });

    it("allows enough reads for a product that grows to 500 variants mid-read", async () => {
      const grown = make(500, "g");
      const { result } = await run(make(60).slice(0, 50), 60, () => grown);
      assert.deepEqual(ids(result.variants), ids(grown));
    });

    it("collects the states of all ten pages in page order", () => {
      const pages = Object.fromEntries(
        Array.from({ length: 10 }, (_, i) => [
          `v${i}`,
          make(i < 9 ? 50 : 3, `p${i}-`),
        ]),
      );
      const states = variantStates(pages);
      assert.equal(states.length, 453);
      assert.equal(states[0].id, "p0-0");
      assert.equal(states[50].id, "p1-0");
      assert.equal(states[452].id, "p9-2");
    });
  });
}
