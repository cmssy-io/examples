import type { CmssyFormField } from "@cmssy/core";

const UNSUPPORTED_TYPES = new Set(["file", "password"]);

export function renderableFields(fields: readonly CmssyFormField[]) {
  return [...fields]
    .filter((field) => !UNSUPPORTED_TYPES.has(field.fieldType))
    .sort((a, b) => a.order - b.order);
}

function valueOf(field: CmssyFormField, entries: FormData): unknown {
  switch (field.fieldType) {
    case "boolean":
      return entries.get(field.name) === "true";
    case "multiselect":
      return entries.getAll(field.name).map(String);
    case "number": {
      const raw = String(entries.get(field.name) ?? "").trim();
      return raw === "" ? null : Number(raw);
    }
    default: {
      const raw = entries.get(field.name);
      return typeof raw === "string" ? raw.trim() : "";
    }
  }
}

export function formValues(
  fields: readonly CmssyFormField[],
  entries: FormData,
): Record<string, unknown> {
  return Object.fromEntries(
    renderableFields(fields).map((field) => [
      field.name,
      valueOf(field, entries),
    ]),
  );
}

function defaultOf(field: CmssyFormField): unknown {
  const raw = field.defaultValue ?? "";
  switch (field.fieldType) {
    case "boolean":
      return raw === "true";
    case "multiselect":
      return [];
    case "number":
      return raw === "" ? null : Number(raw);
    default:
      return raw;
  }
}

export function defaultFormValues(
  fields: readonly CmssyFormField[],
): Record<string, unknown> {
  return Object.fromEntries(
    renderableFields(fields).map((field) => [field.name, defaultOf(field)]),
  );
}
