import { defineBlock } from "@cmssy/react";
import BlogIndex, { blogIndexProps } from "./BlogIndex";

export const blogIndexBlock = defineBlock({
  type: "blog-index",
  label: "Blog index",
  component: BlogIndex,
  props: blogIndexProps,
  loader: async ({ content }) => {
    const parentSlug = content.parentSlug ?? "";
    if (!parentSlug) return null;
    const { loadPosts } = await import("./load-posts");
    return loadPosts({ parentSlug, limit: content.postsPerPage ?? 9 });
  },
});
