import {
  createCmssyClient,
  type CmssyTypedDocument,
  type ScopedVariables,
} from "@cmssy/core";
import { retryMode } from "@/lib/cmssy/retry-mode";
import { cmssy } from "@/cmssy.config";

export const client = createCmssyClient(cmssy);

export function publicRequest<Result, Variables>(
  document: CmssyTypedDocument<Result, Variables>,
  variables: Variables,
): Promise<Result> {
  return client.query(document, variables, {
    public: true,
    retry: retryMode(),
  });
}

export function scopedRequest<
  Result,
  Variables extends { workspaceId: string },
>(
  document: CmssyTypedDocument<Result, Variables>,
  variables: ScopedVariables<Variables>,
): Promise<Result> {
  return client.queryScoped(document, variables, { retry: retryMode() });
}
