import { createCmssyClient } from "@cmssy/core";
import type { TypedDocumentString } from "@/graphql/generated/graphql";
import { cmssy } from "@/cmssy.config";
import { readCartToken } from "@/lib/cmssy/cart-cookie";
import { memberAccessToken } from "@/lib/cmssy/member-token";

const client = createCmssyClient(cmssy);

export async function cartRequest<R, V>(
  document: TypedDocumentString<R, V>,
  buildVariables: (workspaceId: string) => V,
): Promise<R> {
  const workspaceId = await client.resolveWorkspaceId();
  const accessToken = await memberAccessToken();
  const cartToken = await readCartToken();
  return client.query<R, V>(
    document,
    buildVariables(workspaceId),
    {
      public: true,
      headers: {
        "x-workspace-id": workspaceId,
        "x-cart-session": cartToken,
        ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
      },
    },
      );
}
