import { createCmssyClient } from "@cmssy/core";
import type { TypedDocumentString } from "@/graphql/generated/graphql";
import { cmssy } from "@/cmssy.config";

import { retryMode } from "@/lib/cmssy/retry-mode";
import { visitorHeaders } from "@/lib/cmssy/visitor-headers";

const client = createCmssyClient(cmssy);

export async function authRequest<R, V>(
  document: TypedDocumentString<R, V>,
  variables: V,
): Promise<R> {
  const workspaceId = await client.resolveWorkspaceId({ retry: retryMode() });
  return client.query<R, V>(document, variables, {
    public: true,
    retry: retryMode(),
    headers: { ...(await visitorHeaders()), "x-workspace-id": workspaceId },
  });
}
