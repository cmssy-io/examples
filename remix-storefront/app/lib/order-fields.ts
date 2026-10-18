import type { OrderField } from "../graphql/types";
import { localizedText } from "./localized";
import type { ShopCopy } from "./shop-copy";

export const ORDER_FIELD_PREFIX = "customFields.";

export interface OrderFieldLocale {
  locale: string;
  defaultLocale: string;
}

export interface OrderFieldRow {
  key: string;
  label: string;
  value: string;
}

export function orderFieldLabel(
  field: Pick<OrderField, "key" | "label">,
  { locale, defaultLocale }: OrderFieldLocale,
): string {
  return localizedText(field.label, {
    locale,
    defaultLocale,
    fallback: field.key,
  });
}

export function readOrderFieldValues(
  form: FormData,
  fields: OrderField[],
): Record<string, unknown> | null {
  const values: Record<string, unknown> = {};
  for (const field of fields) {
    const raw = String(
      form.get(`${ORDER_FIELD_PREFIX}${field.key}`) ?? "",
    ).trim();
    if (!raw) continue;
    if (field.type === "boolean") values[field.key] = true;
    else if (field.type === "number") values[field.key] = Number(raw);
    else values[field.key] = raw;
  }
  return Object.keys(values).length > 0 ? values : null;
}

function displayValue(
  value: unknown,
  field: OrderField | undefined,
  locale: OrderFieldLocale,
  copy: ShopCopy,
): string {
  if (typeof value === "boolean") return value ? copy.yes : copy.no;
  if (field?.type === "select") {
    const option = field.options.find((candidate) => candidate.value === value);
    if (option) {
      return localizedText(option.label, { ...locale, fallback: option.value });
    }
  }
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

export function orderFieldRows(
  values: unknown,
  fields: OrderField[],
  locale: OrderFieldLocale,
  copy: ShopCopy,
): OrderFieldRow[] {
  if (!values || typeof values !== "object" || Array.isArray(values)) {
    return [];
  }
  return Object.entries(values as Record<string, unknown>)
    .filter(
      ([, value]) => value !== null && value !== undefined && value !== "",
    )
    .map(([key, value]) => {
      const field = fields.find((candidate) => candidate.key === key);
      return {
        key,
        label: field ? orderFieldLabel(field, locale) : key,
        value: displayValue(value, field, locale, copy),
      };
    });
}
