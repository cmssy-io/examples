import type { CmssyClient } from "./cmssy.js";
import { recordPatch, type RecordData } from "./mapping.js";

export interface ModelSpec {
  name: string;
  slug: string;
  displayField: string;
  fields: readonly Record<string, unknown>[];
  product?: Record<string, unknown>;
}

export interface StoredRecord {
  id: string;
  data: RecordData;
}

export interface UpsertStats {
  created: number;
  patched: number;
  unchanged: number;
  failed: number;
  importCalls: number;
  patchCalls: number;
  listCalls: number;
}

const PAGE = 100;
const IMPORT_BATCH = 1000;

export async function ensureModel(client: CmssyClient, spec: ModelSpec): Promise<string> {
  const { model } = await client.request<{ model: { list: Array<{ id: string; slug: string }> } }>(
    "query { model { list { id slug } } }",
  );
  const existing = model.list.find((m) => m.slug === spec.slug);
  if (existing) return existing.id;

  const created = await client.request<{ model: { create: { id: string } } }>(
    "mutation ($input: CreateModelDefinitionInput!) { model { create(input: $input) { id } } }",
    { input: { ...spec, deliveryAccess: "public" } },
  );
  return created.model.create.id;
}

export async function listAll(
  client: CmssyClient,
  modelId: string,
  stats?: UpsertStats,
): Promise<StoredRecord[]> {
  const records: StoredRecord[] = [];
  for (let offset = 0; ; offset += PAGE) {
    if (stats) stats.listCalls += 1;
    const { record } = await client.request<{
      record: { list: { items: StoredRecord[]; hasMore: boolean } };
    }>(
      "query ($modelId: ID!, $limit: Int, $offset: Int) { record { list(modelId: $modelId, limit: $limit, offset: $offset, sort: \"createdAt_asc\") { items { id data } hasMore } } }",
      { modelId, limit: PAGE, offset },
    );
    records.push(...record.list.items);
    if (!record.list.hasMore) return records;
  }
}

export function indexBy(records: StoredRecord[], key: string): Map<string, StoredRecord> {
  const index = new Map<string, StoredRecord>();
  for (const stored of records) {
    const value = stored.data[key];
    if (value !== undefined && value !== null) index.set(String(value), stored);
  }
  return index;
}

export async function upsert(
  client: CmssyClient,
  modelId: string,
  key: string,
  rows: RecordData[],
  owned: readonly string[],
): Promise<{ stats: UpsertStats; index: Map<string, StoredRecord> }> {
  const stats: UpsertStats = {
    created: 0,
    patched: 0,
    unchanged: 0,
    failed: 0,
    importCalls: 0,
    patchCalls: 0,
    listCalls: 0,
  };
  const index = indexBy(await listAll(client, modelId, stats), key);

  const missing = rows.filter((row) => !index.has(String(row[key])));
  for (let start = 0; start < missing.length; start += IMPORT_BATCH) {
    stats.importCalls += 1;
    const { record } = await client.request<{
      record: { import: { importedCount: number; errors: Array<{ row: number; message: string }> } };
    }>(
      "mutation ($input: ImportModelRecordsInput!) { record { import(input: $input) { importedCount errors { row message } } } }",
      { input: { modelId, rows: missing.slice(start, start + IMPORT_BATCH) } },
    );
    stats.created += record.import.importedCount;
    stats.failed += record.import.errors.length;
    for (const error of record.import.errors) {
      console.error(`import row ${start + error.row}: ${error.message}`);
    }
  }

  for (const row of rows) {
    const stored = index.get(String(row[key]));
    if (!stored) continue;
    const patch = recordPatch(stored.data, row, owned);
    if (Object.keys(patch).length === 0) {
      stats.unchanged += 1;
      continue;
    }
    await patchRecord(client, stored.id, patch);
    stats.patchCalls += 1;
    stats.patched += 1;
  }

  const fresh = missing.length > 0 ? indexBy(await listAll(client, modelId, stats), key) : index;
  return { stats, index: fresh };
}

export async function patchRecord(
  client: CmssyClient,
  id: string,
  data: RecordData,
): Promise<void> {
  await client.request(
    "mutation ($input: PatchModelRecordInput!) { record { patch(input: $input) { id } } }",
    { input: { id, data } },
  );
}
