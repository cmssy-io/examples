"use client";

import {
  isFormFieldRequired,
  visibleFormFields,
  type CmssyFormDefinition,
  type CmssyFormField,
} from "@cmssy/core";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { submitFormAction } from "@/lib/actions/forms";
import { useShopCopy } from "@/components/shop/locale-ui";
import { formValues, renderableFields } from "@/lib/form-values";
import { localizedText } from "@/lib/localized";
import styles from "./ContactForm.module.css";

type Locale = { locale: string; defaultLocale: string };

const INPUT_TYPES: Record<string, string> = {
  email: "email",
  phone: "tel",
  url: "url",
  number: "number",
  date: "date",
  datetime: "datetime-local",
};

function FieldInput({
  field,
  required,
  locale,
}: {
  field: CmssyFormField;
  required: boolean;
  locale: Locale;
}) {
  const id = `form-${field.id}`;
  const text = (value: unknown) => localizedText(value, locale);
  const placeholder = text(field.placeholder) || undefined;
  const label = (
    <>
      {text(field.label) || field.name}
      {required ? <span aria-hidden> *</span> : null}
    </>
  );
  const { minLength, maxLength, minValue, maxValue, pattern } =
    field.validation;

  if (field.fieldType === "hidden") {
    return (
      <input type="hidden" name={field.name} value={field.defaultValue ?? ""} />
    );
  }

  if (field.fieldType === "boolean") {
    return (
      <label className="shop-label" htmlFor={id}>
        <input
          id={id}
          name={field.name}
          type="checkbox"
          value="true"
          required={required}
          defaultChecked={field.defaultValue === "true"}
        />{" "}
        {label}
      </label>
    );
  }

  if (field.fieldType === "radio") {
    return (
      <fieldset className={styles.choices}>
        <legend className="shop-label">{label}</legend>
        {field.options.map((option) => (
          <label key={option.value}>
            <input
              type="radio"
              name={field.name}
              value={option.value}
              required={required}
              disabled={option.disabled}
              defaultChecked={field.defaultValue === option.value}
            />{" "}
            {text(option.label) || option.value}
          </label>
        ))}
      </fieldset>
    );
  }

  const control =
    field.fieldType === "textarea" ? (
      <textarea
        id={id}
        name={field.name}
        required={required}
        placeholder={placeholder}
        minLength={minLength ?? undefined}
        maxLength={maxLength ?? undefined}
        defaultValue={field.defaultValue ?? ""}
        rows={5}
        className="shop-input"
      />
    ) : field.fieldType === "select" || field.fieldType === "multiselect" ? (
      <select
        id={id}
        name={field.name}
        required={required}
        multiple={field.fieldType === "multiselect"}
        defaultValue={
          field.fieldType === "multiselect" ? [] : (field.defaultValue ?? "")
        }
        className="shop-input"
      >
        {field.fieldType === "select" ? <option value="" /> : null}
        {field.options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {text(option.label) || option.value}
          </option>
        ))}
      </select>
    ) : (
      <input
        id={id}
        name={field.name}
        type={INPUT_TYPES[field.fieldType] ?? "text"}
        required={required}
        placeholder={placeholder}
        minLength={minLength ?? undefined}
        maxLength={maxLength ?? undefined}
        min={minValue ?? undefined}
        max={maxValue ?? undefined}
        pattern={pattern ?? undefined}
        step={field.fieldType === "number" ? "any" : undefined}
        defaultValue={field.defaultValue ?? ""}
        className="shop-input"
      />
    );

  const help = text(field.helpText);
  return (
    <>
      <label className="shop-label" htmlFor={id}>
        {label}
      </label>
      {control}
      {help ? <small className="shop-muted">{help}</small> : null}
    </>
  );
}

export function ContactFormFields({
  form,
  locale,
}: {
  form: CmssyFormDefinition;
  locale: Locale;
}) {
  const router = useRouter();
  const copy = useShopCopy();
  const formRef = useRef<HTMLFormElement>(null);
  const fields = renderableFields(form.fields);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [outcome, setOutcome] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();
  const text = (value: unknown) => localizedText(value, locale);

  const readValues = () =>
    formRef.current ? formValues(fields, new FormData(formRef.current)) : {};

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const entries = new FormData(event.currentTarget);
    const data = formValues(fields, entries);
    const website = String(entries.get("website") ?? "");
    startTransition(async () => {
      const result = await submitFormAction(form.id, data, website);
      if (result.ok && result.redirectUrl) {
        router.push(result.redirectUrl);
        return;
      }
      setOutcome({
        ok: result.ok,
        message: result.ok
          ? text(form.settings.successMessage) || result.message || ""
          : result.message || text(form.settings.errorMessage),
      });
      if (result.ok) formRef.current?.reset();
    });
  }

  if (outcome?.ok) {
    return (
      <p className={`shop-card ${styles.success}`} role="status">
        {outcome.message}
      </p>
    );
  }

  return (
    <form
      ref={formRef}
      className={`shop-card ${styles.form}`}
      onSubmit={submit}
      onChange={() => setValues(readValues())}
    >
      {visibleFormFields(fields, values).map((field) => (
        <div
          key={field.id}
          className={field.width === "half" ? styles.half : styles.full}
        >
          <FieldInput
            field={field}
            required={isFormFieldRequired(field, values)}
            locale={locale}
          />
        </div>
      ))}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className={styles.trap}
      />
      {outcome ? (
        <p className={styles.error} role="alert">
          {outcome.message}
        </p>
      ) : null}
      <div className={styles.full}>
        <button
          type="submit"
          className="shop-btn shop-btn-primary"
          disabled={pending}
        >
          {text(form.settings.submitButtonLabel) || copy.formSend}
        </button>
      </div>
    </form>
  );
}
