"use client";

import { unstable_isUnrecognizedActionError } from "next/navigation";

/**
 * Server Action ids are minted per build. A tab left open across a deployment
 * keeps posting the ids of the bundle it loaded, and the deployment answering
 * now does not know them - the call rejects before it ever reaches our code.
 * Nothing in the running document can recover from that, only a fresh one can.
 */
export const STALE_DEPLOYMENT_MESSAGE =
  "The site was updated in the background. Refresh the page and try again.";

/**
 * Reloads the document when `error` is a call against a retired build, and
 * reports whether it handled the error. Safe only where the page holds no
 * user input - a reload throws away anything typed but not yet submitted.
 */
export function handledStaleDeployment(error: unknown): boolean {
  if (!unstable_isUnrecognizedActionError(error)) return false;
  window.location.reload();
  return true;
}

export function isStaleDeployment(error: unknown): boolean {
  return unstable_isUnrecognizedActionError(error);
}

export function actionErrorMessage(error: unknown, fallback: string): string {
  if (isStaleDeployment(error)) return STALE_DEPLOYMENT_MESSAGE;
  return error instanceof Error && error.message ? error.message : fallback;
}
