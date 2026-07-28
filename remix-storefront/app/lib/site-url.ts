import type { CmssyConfig } from "@cmssy/remix";

function stripTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, "");
}

export function siteUrlFor(config: CmssyConfig, request: Request): string {
  if (config.siteUrl) return stripTrailingSlashes(config.siteUrl);

  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    new URL(request.url).host;

  const isLoopback =
    host.startsWith("localhost") || host.startsWith("127.0.0.1");
  const protocol =
    request.headers.get("x-forwarded-proto") ?? (isLoopback ? "http" : "https");

  return stripTrailingSlashes(`${protocol}://${host}`);
}
