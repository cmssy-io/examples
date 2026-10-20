export interface AccountProfileShape {
  editableFields: readonly string[];
  loginField: string;
  passwordField: string;
}

export interface AccountFieldPlan {
  profileKeys: string[];
  loginKey: string | null;
  passwordKey: string | null;
}

export function planAccountFields(
  profile: AccountProfileShape,
): AccountFieldPlan {
  const editable = new Set(profile.editableFields);
  return {
    profileKeys: profile.editableFields.filter(
      (key) => key !== profile.loginField && key !== profile.passwordField,
    ),
    loginKey: editable.has(profile.loginField) ? profile.loginField : null,
    passwordKey: editable.has(profile.passwordField)
      ? profile.passwordField
      : null,
  };
}

export function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
