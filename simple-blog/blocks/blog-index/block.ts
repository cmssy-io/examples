import { defineBlock } from "@cmssy/react";
import BlogIndex, { blogIndexProps } from "./BlogIndex";

export const blogIndexBlock = defineBlock({
  type: "blog-index",
  label: "Blog index",
  component: BlogIndex,
  props: blogIndexProps,
  loader: async ({ content, context }) => {
    const parentSlug = content.parentPage?.slug;
    if (!parentSlug) return null;
    const { loadPosts } = await import("./load-posts");
    return loadPosts({
      parentSlug,
      limit: content.postsPerPage ?? 9,
      // The language this page renders in, so media alt text in the posts'
      // custom fields comes back in it rather than in the default language.
      locale: context?.locale?.current,
    });
  },
});
