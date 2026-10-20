import { describe, expect, it } from "vitest";
import { looksLikeEmail, planAccountFields } from "./account-fields";

const DATA_FIELDS = ["email", "name", "company", "vatId"];

function plan(editableFields: string[], data: Record<string, unknown>) {
  return planAccountFields(
    { login: "buyer@shop.example", data, editableFields },
    DATA_FIELDS,
  );
}

describe("planAccountFields", () => {
  it("offers the login form for the field that holds the login", () => {
    expect(
      plan(["email", "company"], {
        email: "buyer@shop.example",
        company: "Acme",
      }),
    ).toEqual({ profileKeys: ["company"], loginKey: "email", passwordKey: null });
  });

  it("offers the password form for an editable key the data never returns", () => {
    expect(
      plan(["company", "password"], { email: "buyer@shop.example" }),
    ).toEqual({
      profileKeys: ["company"],
      loginKey: null,
      passwordKey: "password",
    });
  });

  it("keeps an unset field of the member model a profile input", () => {
    expect(plan(["vatId"], { email: "buyer@shop.example" })).toEqual({
      profileKeys: ["vatId"],
      loginKey: null,
      passwordKey: null,
    });
  });

  it("offers neither form when only ordinary fields are editable", () => {
    expect(
      plan(["name", "company"], {
        email: "buyer@shop.example",
        name: "Ann",
        company: "Acme",
      }),
    ).toEqual({ profileKeys: ["name", "company"], loginKey: null, passwordKey: null });
  });

  it("finds a login that is not an email", () => {
    expect(
      planAccountFields(
        { login: "ann", data: { username: "ann" }, editableFields: ["username"] },
        ["username"],
      ),
    ).toEqual({ profileKeys: [], loginKey: "username", passwordKey: null });
  });
});

describe("looksLikeEmail", () => {
  it("tells an email login from a username", () => {
    expect(looksLikeEmail("buyer@shop.example")).toBe(true);
    expect(looksLikeEmail("ann")).toBe(false);
  });
});
