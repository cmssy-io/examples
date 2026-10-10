import { createCmssyClient, type CmssyTypedDocument } from "@cmssy/core";
import { cmssy } from "../../cmssy.config";

export const client = createCmssyClient(cmssy);

export function publicRequest<Result, Variables>(
  document: CmssyTypedDocument<Result, Variables>,
  variables: Variables,
): Promise<Result> {
  return client.query(document, variables, {
    public: true,
    retry: "interactive",
  });
}
