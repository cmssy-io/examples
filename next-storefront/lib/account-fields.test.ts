import { describe, expect, it } from "vitest";
import { looksLikeEmail, planAccountFields } from "./account-fields";

function plan(editableFields: string[], loginField = "email") {
  return planAccountFields({
    editableFields,
    loginField,
    passwordField: "secret",
  });
}

describe("planAccountFields", () => {
  it("gives the login and the password their own forms", () => {
    expect(plan(["email", "company", "secret"])).toEqual({
      profileKeys: ["company"],
      loginKey: "email",
      passwordKey: "secret",
    });
  });

  it("offers neither form when only ordinary fields are editable", () => {
    expect(plan(["name", "company"])).toEqual({
      profileKeys: ["name", "company"],
      loginKey: null,
      passwordKey: null,
    });
  });

  it("follows the login field the model names, not one called email", () => {
    expect(plan(["email", "username"], "username")).toEqual({
      profileKeys: ["email"],
      loginKey: "username",
      passwordKey: null,
    });
  });
});

describe("looksLikeEmail", () => {
  it("tells an email login from a username", () => {
    expect(looksLikeEmail("buyer@shop.example")).toBe(true);
    expect(looksLikeEmail("ann")).toBe(false);
  });
});
