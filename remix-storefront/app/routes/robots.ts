import { cmssy } from "../../cmssy.config";
import { siteUrlFor } from "../lib/site-url";
import type { Route } from "./+types/robots";

export function loader({ request }: Route.LoaderArgs) {
  const siteUrl = siteUrlFor(cmssy, request);
  const body = [
    "User-agent: *",
    "Allow: /",
    `Sitemap: ${siteUrl}/sitemap.xml`,
    "",
  ].join("\n");

  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
