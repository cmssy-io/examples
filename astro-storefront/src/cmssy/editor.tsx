"use client";
import {
  CmssyLazyEditor,
  type CmssyLazyEditorProps,
} from "@cmssy/react/client";

// The edit bridge is a client island: the editor talks to the page over
// postMessage, and that protocol lives in @cmssy/core - not in React and not in
// Next. That is why the same bridge works here.
export default function CmssyEditor(props: Omit<CmssyLazyEditorProps, "load">) {
  return <CmssyLazyEditor {...props} load={() => import("./blocks")} />;
}
