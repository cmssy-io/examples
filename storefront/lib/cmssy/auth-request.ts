import { createCmssyClient } from "@cmssy/core";
import type { TypedDocumentString } from "@/graphql/generated/graphql";
import { cmssy } from "@/cmssy.config";

const client = createCmssyClient(cmssy);

export async function authRequest<R, V>(
  document: TypedDocumentString<R, V>,
  variables: V,
): Promise<R> {
  const workspaceId = await client.resolveWorkspaceId();
  return client.query<R, V>(
    document,
    variables,
    { headers: { "x-workspace-id": workspaceId } },
  );
}
