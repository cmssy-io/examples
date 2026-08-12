"use client";

import { unstable_isUnrecognizedActionError } from "next/navigation";

export const STALE_DEPLOYMENT_MESSAGE =
  "The site was updated in the background. Refresh the page and try again.";

export function isStaleDeployment(error: unknown): boolean {
  return unstable_isUnrecognizedActionError(error);
}

export function reloadIfStaleDeployment(error: unknown): boolean {
  if (!isStaleDeployment(error)) return false;
  window.location.reload();
  return true;
}

export function actionErrorMessage(error: unknown, fallback: string): string {
  if (isStaleDeployment(error)) return STALE_DEPLOYMENT_MESSAGE;
  return error instanceof Error && error.message ? error.message : fallback;
}
