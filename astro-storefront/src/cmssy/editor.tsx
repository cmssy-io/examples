"use client";
import {
  CmssyLazyEditor,
  type CmssyLazyEditorProps,
} from "@cmssy/react/client";
import { ShopIsland, type ShopState } from "../components/shop/island";

type EditorProps = Omit<CmssyLazyEditorProps, "load"> & { shop: ShopState };

export default function CmssyEditor({ shop, ...props }: EditorProps) {
  return (
    <ShopIsland state={shop}>
      <CmssyLazyEditor {...props} load={() => import("./blocks")} />
    </ShopIsland>
  );
}
