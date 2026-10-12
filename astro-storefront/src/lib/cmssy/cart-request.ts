import { createCmssyClient } from "@cmssy/core";
import type { TypedDocumentString } from "../../graphql/generated/graphql";
import { cmssy } from "../../cmssy.config";
import { retryMode } from "./retry-mode";
import { visitorHeaders } from "./visitor-headers";

const client = createCmssyClient(cmssy);

export interface ShopAuth {
  cartToken: string;
  visitorAddress: string | null;
}

export async function cartRequest<R, V>(
  auth: ShopAuth,
  document: TypedDocumentString<R, V>,
  buildVariables: (workspaceId: string) => V,
): Promise<R> {
  const workspaceId = await client.resolveWorkspaceId({ retry: retryMode() });
  return client.query<R, V>(document, buildVariables(workspaceId), {
    public: true,
    retry: retryMode(),
    headers: {
      ...visitorHeaders(auth.visitorAddress),
      "x-workspace-id": workspaceId,
      "x-cart-session": auth.cartToken,
    },
  });
}
