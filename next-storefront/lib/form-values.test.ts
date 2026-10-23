import type { CmssyFormField } from "@cmssy/core";
import { describe, expect, it } from "vitest";
import {
  defaultFormValues,
  formValues,
  renderableFields,
} from "./form-values";

function field(
  name: string,
  fieldType: string,
  order: number,
): CmssyFormField {
  return {
    id: name,
    name,
    fieldType: fieldType as CmssyFormField["fieldType"],
    label: name,
    placeholder: "",
    helpText: "",
    defaultValue: null,
    options: [],
    validation: {
      required: false,
      minLength: null,
      maxLength: null,
      minValue: null,
      maxValue: null,
      pattern: null,
      customMessage: null,
    },
    width: "full",
    order,
    showWhen: null,
    requiredWhen: null,
  };
}

const FIELDS = [
  field("message", "textarea", 3),
  field("name", "text", 1),
  field("newsletter", "boolean", 4),
  field("topics", "multiselect", 5),
  field("quantity", "number", 6),
  field("attachment", "file", 2),
];

describe("contact form values", () => {
  it("renders fields in their form order and leaves out a file upload", () => {
    expect(renderableFields(FIELDS).map((item) => item.name)).toEqual([
      "name",
      "message",
      "newsletter",
      "topics",
      "quantity",
    ]);
  });

  it("sends each field in the shape its type stores", () => {
    const entries = new FormData();
    entries.set("name", "  Ola Nordmann ");
    entries.set("message", "Need 40 bearings");
    entries.set("newsletter", "true");
    entries.append("topics", "pricing");
    entries.append("topics", "delivery");
    entries.set("quantity", "40");
    entries.set("attachment", "x");

    expect(
      formValues(FIELDS, entries),
      "A checkbox is a boolean, a multiselect a list, a number a number - the submission validates them by type",
    ).toEqual({
      name: "Ola Nordmann",
      message: "Need 40 bearings",
      newsletter: true,
      topics: ["pricing", "delivery"],
      quantity: 40,
    });
  });

  it("sends an unticked box as false and an empty number as null", () => {
    const values = formValues(FIELDS, new FormData());
    expect(values.newsletter).toBe(false);
    expect(values.quantity).toBeNull();
    expect(values.topics).toEqual([]);
  });

  it("starts the visibility rules from each field's default, as the inputs render it", () => {
    const defaults = FIELDS.map((item) =>
      item.name === "newsletter"
        ? { ...item, defaultValue: "true" }
        : item.name === "quantity"
          ? { ...item, defaultValue: "5" }
          : item.name === "name"
            ? { ...item, defaultValue: "Guest" }
            : item,
    );

    expect(
      defaultFormValues(defaults),
      "A field shown by a default selection must be visible before the visitor touches the form",
    ).toEqual({
      name: "Guest",
      message: "",
      newsletter: true,
      topics: [],
      quantity: 5,
    });
  });
});
