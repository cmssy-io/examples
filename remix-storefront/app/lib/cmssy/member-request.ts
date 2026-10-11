import { createCmssyClient } from "@cmssy/core";
import type { TypedDocumentString } from "../../graphql/generated/graphql";
import { cmssy } from "../../../cmssy.config";

import { retryMode } from "./retry-mode";

const client = createCmssyClient(cmssy);

export async function memberRequest<R, V>(
  accessToken: string | undefined,
  document: TypedDocumentString<R, V>,
  buildVariables: (workspaceId: string) => V,
): Promise<R | null> {
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
