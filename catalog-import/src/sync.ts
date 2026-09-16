import { createClient, type CmssyConfig } from "./cmssy.js";
import { ensureModel, indexBy, listAll, patchRecord, upsert } from "./catalog.js";
import {
  MODELS,
  customFields,
  groupData,
  ownedKeys,
  productData,
  recordPatch,
  stockGroupIds,
  supplierData,
  type RecordData,
  type StockItemRow,
} from "./mapping.js";
import { openSource, type HistoryRow } from "./wwi.js";

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Set ${name} (see .env.example)`);
  return value;
}

const config: CmssyConfig = {
  apiUrl: env("CMSSY_API_URL"),
  token: env("CMSSY_TOKEN"),
  workspaceId: env("CMSSY_WORKSPACE_ID"),
};
const replay = process.argv.includes("--replay");
const concurrency = Number(process.env.REPLAY_CONCURRENCY ?? 8);
if (!Number.isInteger(concurrency) || concurrency < 1) {
  throw new Error("REPLAY_CONCURRENCY must be a positive integer");
}

const client = createClient(config);
const source = await openSource(env("WWI_SQL_URL"));
const started = Date.now();
const elapsed = () => `${((Date.now() - started) / 1000).toFixed(1)}s`;

try {
  const groupsModel = await ensureModel(client, MODELS.groups);
  const suppliersModel = await ensureModel(client, MODELS.suppliers);
  const productsModel = await ensureModel(client, MODELS.products);

  const groups = await upsert(
    client,
    groupsModel,
    "wwiId",
    (await source.stockGroups()).map(groupData),
    ownedKeys(MODELS.groups),
  );
  console.log(`[${elapsed()}] stock groups`, groups.stats);

  const suppliers = await upsert(
    client,
    suppliersModel,
    "wwiId",
    (await source.suppliers()).map(supplierData),
    ownedKeys(MODELS.suppliers),
  );
  console.log(`[${elapsed()}] suppliers`, suppliers.stats);

  const toData = (row: StockItemRow): RecordData =>
    productData(
      row,
      suppliers.index.get(String(row.SupplierID))?.id,
      stockGroupIds(row).flatMap((id) => groups.index.get(String(id))?.id ?? []),
    );

  const items = await source.stockItems();
  const unmapped = new Set(items.flatMap((row) => customFields(row.CustomFields).unmapped));
  if (unmapped.size > 0) console.log("custom fields with no target:", [...unmapped]);

  if (!replay) {
    const products = await upsert(
      client,
      productsModel,
      "sku",
      items.map(toData),
      ownedKeys(MODELS.products),
    );
    console.log(`[${elapsed()}] products`, products.stats);
  } else {
    const index = indexBy(await listAll(client, productsModel), "sku");
    const versions = await source.history();
    const byItem = new Map<number, HistoryRow[]>();
    for (const version of versions) {
      byItem.set(version.StockItemID, [...(byItem.get(version.StockItemID) ?? []), version]);
    }

    const changes: Array<{ id: string; patch: RecordData }[]> = [];
    for (const [itemId, rows] of byItem) {
      const stored = index.get(`WWI-${itemId}`);
      if (!stored) throw new Error(`WWI-${itemId} is not imported yet - run pnpm sync first`);
      const steps: { id: string; patch: RecordData }[] = [];
      let previous = stored.data;
      for (const row of rows) {
        const next = toData(row);
        const patch = recordPatch(previous, next, ownedKeys(MODELS.products));
        if (Object.keys(patch).length > 0) steps.push({ id: stored.id, patch });
        previous = next;
      }
      changes.push(steps);
    }

    const total = changes.reduce((sum, steps) => sum + steps.length, 0);
    const queue = [...changes];
    await Promise.all(
      Array.from({ length: concurrency }, async () => {
        for (let steps = queue.shift(); steps; steps = queue.shift()) {
          for (const step of steps) await patchRecord(client, step.id, step.patch);
        }
      }),
    );
    console.log(`[${elapsed()}] replayed ${total} changes over ${byItem.size} products`);

    const after = indexBy(await listAll(client, productsModel), "sku");
    const drift = items.filter((row) => {
      const stored = after.get(`WWI-${row.StockItemID}`);
      return !stored || Object.keys(recordPatch(stored.data, toData(row), ownedKeys(MODELS.products))).length > 0;
    });
    console.log(`[${elapsed()}] products differing from the source after replay: ${drift.length}`);
    if (drift.length > 0) process.exitCode = 1;
  }

  console.log(`[${elapsed()}] API calls`, client.stats);
} finally {
  await source.close();
}
