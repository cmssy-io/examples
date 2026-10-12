import { API_TOKEN_HEADER_NAME, CLIENT_IP_HEADER_NAME } from "@cmssy/core";

export function visitorAddress(headers: Headers): string | null {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip")?.trim() ||
    null
  );
}

export function visitorHeaders(address: string | null): Record<string, string> {
  const token = process.env.CMSSY_API_TOKEN;
  if (!token || !address) return {};
  return { [CLIENT_IP_HEADER_NAME]: address, [API_TOKEN_HEADER_NAME]: token };
}
