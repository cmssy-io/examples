"use client";

import {
  CmssyLazyLayout,
  type CmssyLazyLayoutProps,
} from "@cmssy/react/client";

// The header and the footer are cmssy layout blocks. Rendered server-side they
// are just markup - the editor can select them but has no fields to show. This
// mounts them through the edit bridge instead, so they are editable like any
// other block.
export function EditableLayout(props: Omit<CmssyLazyLayoutProps, "load">) {
  return <CmssyLazyLayout {...props} load={() => import("./blocks")} />;
}
