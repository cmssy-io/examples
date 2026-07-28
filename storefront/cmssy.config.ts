import { defineCmssyConfig } from "@cmssy/next";

export const cmssy = defineCmssyConfig({
  org: process.env.CMSSY_ORG_SLUG,
  workspaceSlug: process.env.CMSSY_WORKSPACE_SLUG,
  draftSecret: process.env.CMSSY_DRAFT_SECRET,

  resolveLocale: async () => {
    const [{ headers }, { CMSSY_LOCALE_HEADER }] = await Promise.all([
      import("next/headers"),
      import("@/lib/locale-path"),
    ]);
    return (await headers()).get(CMSSY_LOCALE_HEADER) ?? "";
  },
});

export const MEMBER_MODEL_SLUG = "shopmember";
