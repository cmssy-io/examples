import { draftMode } from "next/headers";
import { cmssy } from "@/cmssy.config";

export async function previewSecret(): Promise<string | undefined> {
  const { isEnabled } = await draftMode();
  return isEnabled ? cmssy.draftSecret : undefined;
}
