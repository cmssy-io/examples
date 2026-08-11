import { createCmssyClient } from "@cmssy/core";
import { cmssy } from "@/cmssy.config";
import type { Order, MyOrders, PublicOrder } from "@/graphql/types";
import { memberRequest } from "@/lib/cmssy/member-request";
import {
  MyOrderDocument,
  MyOrdersDocument,
  PublicOrderDocument,
} from "@/graphql/generated/graphql";

const EMPTY_ORDERS: MyOrders = { total: 0, hasMore: false, items: [] };

const client = createCmssyClient(cmssy);

export async function listMyOrders(
  options: { skip?: number; limit?: number } = {},
): Promise<MyOrders> {
  const data = await memberRequest(
    MyOrdersDocument,
    (workspaceId) => ({
      workspaceId,
      skip: options.skip ?? 0,
      limit: options.limit ?? 20,
    }),
  );
  return data?.account.orders ?? EMPTY_ORDERS;
}

export async function getMyOrder(id: string): Promise<Order | null> {
  const data = await memberRequest(
    MyOrderDocument,
    (workspaceId) => ({ workspaceId, id }),
  );
  return data?.account.order ?? null;
}

export async function fetchOrderByToken(
  orderId: string,
  accessToken: string,
): Promise<PublicOrder | null> {
  const workspaceId = await client.resolveWorkspaceId();
  const data = await client.query(
    PublicOrderDocument,
    { workspaceId, orderId, accessToken },
    { public: true, headers: { "x-workspace-id": workspaceId } },
  );
  return data.public.order.byToken;
}
