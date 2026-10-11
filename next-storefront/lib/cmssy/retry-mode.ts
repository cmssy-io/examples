import { CMSSY_RETRY_MODES, type CmssyRetryMode } from "@cmssy/core";
import { nextRetryMode } from "@cmssy/next";

const RETRY_MODE_ENV = "CMSSY_RETRY_MODE";

export function retryMode(): CmssyRetryMode {
  const requested = process.env[RETRY_MODE_ENV];
  if (requested === undefined || requested === "") return nextRetryMode();
  if (Object.hasOwn(CMSSY_RETRY_MODES, requested)) {
    return requested as CmssyRetryMode;
  }
  throw new Error(
    `${RETRY_MODE_ENV}=${requested} is not a retry mode (${Object.keys(CMSSY_RETRY_MODES).join(", ")})`,
  );
}
