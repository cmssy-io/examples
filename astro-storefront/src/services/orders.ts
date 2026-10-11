import { CmssyGraphqlError, createCmssyClient } from "@cmssy/core";
import { cmssy } from "../cmssy.config";
import type { PublicOrder } from "../graphql/types";
import { PublicOrderDocument } from "../graphql/generated/graphql";
import { retryMode } from "../lib/cmssy/retry-mode";

const client = createCmssyClient(cmssy);

export async function fetchOrderByToken(
  orderId: string,
  accessToken: string,
): Promise<PublicOrder | null> {
  const workspaceId = await client.resolveWorkspaceId({ retry: retryMode() });
  try {
    const data = await client.query(
      PublicOrderDocument,
      { workspaceId, orderId, accessToken },
      {
        public: true,
        retry: retryMode(),
        headers: { "x-workspace-id": workspaceId },
      },
    );
    return data.public.order.byToken;
  } catch (error) {
    if (error instanceof CmssyGraphqlError && error.code === "NOT_FOUND") {
      return null;
    }
    throw error;
  }
}
