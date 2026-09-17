import type { CmssyRouteConfig } from "@cmssy/react";

const env = import.meta.env;

if (!env.VITE_CMSSY_ORG_SLUG || !env.VITE_CMSSY_WORKSPACE_SLUG) {
  throw new Error(
    "Set VITE_CMSSY_ORG_SLUG and VITE_CMSSY_WORKSPACE_SLUG before building.",
  );
}

export const cmssy = {
  org: env.VITE_CMSSY_ORG_SLUG,
  workspaceSlug: env.VITE_CMSSY_WORKSPACE_SLUG,
  ...(env.VITE_CMSSY_API_URL ? { apiUrl: env.VITE_CMSSY_API_URL } : {}),
  layout: {
    regions: [
      { id: "header", label: "Header" },
      { id: "footer", label: "Footer" },
    ],
  },
} satisfies CmssyRouteConfig;
