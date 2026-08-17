import { createCmssyClient, type CmssyTypedDocument } from "@cmssy/core";
import { nextRetryMode } from "@cmssy/next";
import { cmssy } from "@/cmssy.config";

export const client = createCmssyClient(cmssy);

export function publicRequest<Result, Variables>(
  document: CmssyTypedDocument<Result, Variables>,
  variables: Variables,
): Promise<Result> {
  return client.query(document, variables, {
    public: true,
    retry: nextRetryMode(),
  });
}

export function scopedRequest<
  Result,
  Variables extends { workspaceId: string },
>(
  document: CmssyTypedDocument<Result, Variables>,
  variables: Omit<Variables, "workspaceId">,
): Promise<Result> {
  return client.queryScoped(document, variables);
}
