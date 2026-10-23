import { cmssy } from "@/cmssy.config";

export async function previewSecret(): Promise<string | undefined> {
  const { draftMode } = await import("next/headers");
  const { isEnabled } = await draftMode();
  return isEnabled ? cmssy.draftSecret : undefined;
}
