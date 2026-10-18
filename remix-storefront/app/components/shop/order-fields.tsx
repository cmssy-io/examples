import type { OrderField } from "../../graphql/types";
import { localizedText } from "../../lib/localized";
import {
  ORDER_FIELD_PREFIX,
  orderFieldLabel,
  orderFieldRows,
  type OrderFieldLocale,
} from "../../lib/order-fields";
import type { ShopCopy } from "../../lib/shop-copy";
import cartStyles from "./cart.module.css";
import styles from "./order.module.css";

const INPUT_TYPES: Record<string, string> = {
  number: "number",
  date: "date",
  email: "email",
  phone: "tel",
  url: "url",
  text: "text",
};

function OrderFieldInput({
  field,
  locale,
}: {
  field: OrderField;
  locale: OrderFieldLocale;
}) {
  const id = `${ORDER_FIELD_PREFIX}${field.key}`;
  const label = (
    <>
      {orderFieldLabel(field, locale)}
      {field.required ? <span aria-hidden> *</span> : null}
    </>
  );

  if (field.type === "boolean") {
    return (
      <label className="shop-label" htmlFor={id}>
        <input
          id={id}
          name={id}
          type="checkbox"
          value="true"
          required={field.required}
        />{" "}
        {label}
      </label>
    );
  }

  return (
    <>
      <label className="shop-label" htmlFor={id}>
        {label}
      </label>
      {field.type === "select" ? (
        <select
          id={id}
          name={id}
          required={field.required}
          className="shop-input"
          defaultValue=""
        >
          <option value="" />
          {field.options.map((option) => (
            <option key={option.value} value={option.value}>
              {localizedText(option.label, {
                ...locale,
                fallback: option.value,
              })}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          name={id}
          type={INPUT_TYPES[field.type] ?? "text"}
          required={field.required}
          minLength={field.minLength ?? undefined}
          maxLength={field.maxLength ?? undefined}
          min={field.minValue ?? undefined}
          max={field.maxValue ?? undefined}
          step={field.type === "number" ? "any" : undefined}
          className="shop-input"
        />
      )}
    </>
  );
}

export function OrderFieldInputs({
  fields,
  locale,
}: {
  fields: OrderField[];
  locale: OrderFieldLocale;
}) {
  return fields.map((field) => (
    <div key={field.key} className={cartStyles.formFull}>
      <OrderFieldInput field={field} locale={locale} />
    </div>
  ));
}

export function OrderCustomFields({
  values,
  fields,
  locale,
  copy,
}: {
  values: unknown;
  fields: OrderField[];
  locale: OrderFieldLocale;
  copy: ShopCopy;
}) {
  const rows = orderFieldRows(values, fields, locale, copy);
  if (rows.length === 0) return null;
  return (
    <div className={styles.meta}>
      {rows.map((row) => (
        <div key={row.key} className={styles.metaRow}>
          <span className={styles.metaLabel}>{row.label}</span>
          <span>{row.value}</span>
        </div>
      ))}
    </div>
  );
}
