import { createCmssyClient } from "@cmssy/core";
import type { TypedDocumentString } from "@/graphql/generated/graphql";
import { cmssy } from "@/cmssy.config";
import { memberAccessToken } from "@/lib/cmssy/member-token";
import { retryMode } from "@/lib/cmssy/retry-mode";

const client = createCmssyClient(cmssy);

export async function memberRequest<R, V>(
  document: TypedDocumentString<R, V>,
  buildVariables: (workspaceId: string) => V,
): Promise<R | null> {
  const accessToken = await memberAccessToken();
  if (!accessToken) return null;
  const workspaceId = await client.resolveWorkspaceId({ retry: retryMode() });
  return client.query<R, V>(document, buildVariables(workspaceId), {
    public: true,
    retry: retryMode(),
    headers: {
      "x-workspace-id": workspaceId,
      authorization: `Bearer ${accessToken}`,
    },
  });
}
