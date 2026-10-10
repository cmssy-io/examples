import { createCmssyClient } from "@cmssy/core";
import type { TypedDocumentString } from "../../graphql/generated/graphql";
import { cmssy } from "../../../cmssy.config";

const client = createCmssyClient(cmssy);

export interface ShopAuth {
  cartToken: string;
  accessToken?: string;
}

export async function cartRequest<R, V>(
  auth: ShopAuth,
  document: TypedDocumentString<R, V>,
  buildVariables: (workspaceId: string) => V,
): Promise<R> {
  const workspaceId = await client.resolveWorkspaceId();
  return client.query<R, V>(document, buildVariables(workspaceId), {
    public: true,
    retry: "interactive",
    headers: {
      "x-workspace-id": workspaceId,
      "x-cart-session": auth.cartToken,
      ...(auth.accessToken
        ? { authorization: `Bearer ${auth.accessToken}` }
        : {}),
    },
  });
}
