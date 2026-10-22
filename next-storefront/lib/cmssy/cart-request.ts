import { createCmssyClient } from "@cmssy/core";
import type { TypedDocumentString } from "@/graphql/generated/graphql";
import { cmssy } from "@/cmssy.config";
import { ensureCartToken, readCartToken } from "@/lib/cmssy/cart-cookie";
import { memberAccessToken } from "@/lib/cmssy/member-token";
import { retryMode } from "@/lib/cmssy/retry-mode";
import { visitorHeaders } from "@/lib/cmssy/visitor-headers";
import { activeChannelKey } from "@/services/channel";

const client = createCmssyClient(cmssy);

function isMutation(document: { toString(): string }): boolean {
  return /^\s*mutation\b/.test(String(document));
}

export async function cartRequest<R, V>(
  document: TypedDocumentString<R, V>,
  buildVariables: (workspaceId: string, channel: string | null) => V,
): Promise<R> {
  const workspaceId = await client.resolveWorkspaceId({ retry: retryMode() });
  const channel = await activeChannelKey();
  const accessToken = await memberAccessToken();
  const cartToken = isMutation(document)
    ? await ensureCartToken()
    : await readCartToken();
  return client.query<R, V>(document, buildVariables(workspaceId, channel), {
    public: true,
    retry: retryMode(),
    headers: {
      ...(await visitorHeaders()),
      "x-workspace-id": workspaceId,
      "x-cart-session": cartToken,
      ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
    },
  });
}
