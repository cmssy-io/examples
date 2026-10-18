import { DEFAULT_CMSSY_API_URL, createCmssyClient } from "@cmssy/core";
import { cmssy } from "@/cmssy.config";
import { retryMode } from "@/lib/cmssy/retry-mode";

const client = createCmssyClient(cmssy);

export interface GraphqlError {
  message?: string;
  extensions?: { code?: string };
}

export interface AdminResult<T> {
  data?: T;
  errors: GraphqlError[];
}

export const REFUSAL_CODES = new Set(["BAD_USER_INPUT", "NOT_FOUND"]);

function adminEndpoint(): string {
  return process.env.CMSSY_API_URL?.trim() || DEFAULT_CMSSY_API_URL;
}

export function adminToken(): string | null {
  return process.env.CMSSY_API_TOKEN || null;
}

export function errorText(errors: GraphqlError[]): string {
  return errors.map((error) => error.message ?? "GraphQL error").join("; ");
}

export function isRefusal(errors: GraphqlError[]): boolean {
  return (
    errors.length > 0 &&
    errors.every((error) => REFUSAL_CODES.has(error.extensions?.code ?? ""))
  );
}

export async function adminRequest<T>(
  query: string,
  variables: Record<string, unknown>,
  purpose: string,
): Promise<AdminResult<T>> {
  const token = adminToken();
  if (!token) {
    throw new Error(`CMSSY_API_TOKEN is not set: cannot ${purpose}`);
  }
  const workspaceId = await client.resolveWorkspaceId({ retry: retryMode() });

  const response = await fetch(adminEndpoint(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
      "x-workspace-id": workspaceId,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!response.ok) {
    throw new Error(`cmssy: ${purpose} failed (${response.status})`);
  }
  const json = (await response.json()) as {
    data?: T;
    errors?: GraphqlError[];
  };
  return { data: json.data, errors: json.errors ?? [] };
}
