import type { ShopmemberData } from "@/graphql/models";

const MEMBER_DATA_FIELDS: Record<keyof ShopmemberData, true> = {
  email: true,
  name: true,
  contactName: true,
  company: true,
  vatId: true,
};

export interface AccountProfileShape {
  login: string;
  data: unknown;
  editableFields: readonly string[];
}

export interface AccountFieldPlan {
  profileKeys: string[];
  loginKey: string | null;
  passwordKey: string | null;
}

export function planAccountFields(
  profile: AccountProfileShape,
  dataFields: readonly string[] = Object.keys(MEMBER_DATA_FIELDS),
): AccountFieldPlan {
  const data = (profile.data ?? {}) as Record<string, unknown>;
  const known = new Set(dataFields);
  let loginKey: string | null = null;
  let passwordKey: string | null = null;
  const profileKeys: string[] = [];

  for (const key of profile.editableFields) {
    if (loginKey === null && profile.login && data[key] === profile.login) {
      loginKey = key;
    } else if (passwordKey === null && !known.has(key) && !(key in data)) {
      passwordKey = key;
    } else {
      profileKeys.push(key);
    }
  }

  return { profileKeys, loginKey, passwordKey };
}

export function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
