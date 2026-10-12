import { API_TOKEN_HEADER_NAME, CLIENT_IP_HEADER_NAME } from "@cmssy/core";
import { headers } from "next/headers";

export function visitorAddress(incoming: Headers): string | null {
  return (
    incoming.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    incoming.get("x-real-ip")?.trim() ||
    null
  );
}

export async function visitorHeaders(
  incoming?: Headers,
): Promise<Record<string, string>> {
  const token = process.env.CMSSY_API_TOKEN;
  if (!token) return {};
  const address = visitorAddress(incoming ?? (await headers()));
  if (!address) return {};
  return { [CLIENT_IP_HEADER_NAME]: address, [API_TOKEN_HEADER_NAME]: token };
}
