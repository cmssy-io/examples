import { fields, type BlockProps } from "@cmssy/react";
import type { Post } from "../services/posts";

export const blogIndexProps = {
  parentPage: fields.pageSelector({
    label: "Parent page",
    multiple: false,
    helperText: "Posts are the children of this page.",
  }),
  postsPerPage: fields.number({ label: "Posts per page", defaultValue: 9 }),
};

export function BlogIndex({
  data,
}: BlockProps<typeof blogIndexProps, { items: Post[] }>) {
  const items = data?.items ?? [];
  if (items.length === 0) return null;

  return (
    <section>
      <ul>
        {items.map((post) => (
          <li key={post.id}>
            <a href={post.fullSlug}>
              <strong>{post.title}</strong>
              {post.summary ? <span>{post.summary}</span> : null}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
