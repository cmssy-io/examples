import { defineBlock } from "@cmssy/react";
import Prose, { proseProps } from "./Prose";

export const proseBlock = defineBlock({
  type: "prose",
  label: "Prose",
  component: Prose,
  props: proseProps,
  loader: async ({ content }) => {
    const html = content.body ?? "";
    if (!html) return { html: "" };
    const { default: sanitizeHtml } = await import("sanitize-html");
    const clean = sanitizeHtml(html, {
      allowedTags: [
        "p",
        "strong",
        "em",
        "ul",
        "ol",
        "li",
        "a",
        "h2",
        "h3",
        "br",
      ],
      allowedAttributes: { a: ["href", "target", "rel"] },
      allowedSchemes: ["http", "https", "mailto", "tel"],
    });
    return { html: clean };
  },
});
