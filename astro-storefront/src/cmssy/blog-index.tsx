import { fields, type BlockProps } from "@cmssy/react";
import type { Post } from "../services/posts";
import styles from "./blog-index.module.css";

export const blogIndexProps = {
  parentPage: fields.pageSelector({
    label: "Parent page",
    multiple: false,
    helperText: "Posts are the children of this page.",
    localized: false,
  }),
  postsPerPage: fields.number({ label: "Posts per page", defaultValue: 9 }),
};

export function BlogIndex({
  data,
  context,
}: BlockProps<typeof blogIndexProps, { items: Post[] }>) {
  const items = data?.items ?? [];
  if (items.length === 0) return null;

  return (
    <section className={styles.grid}>
      {items.map((post) => (
        <a
          key={post.id}
          href={post.fullSlug}
          className={`shop-card ${styles.card}`}
        >
          {post.publishedAt ? (
            <time dateTime={post.publishedAt} className={styles.date}>
              {new Date(post.publishedAt).toLocaleDateString(
                context?.locale.current,
              )}
            </time>
          ) : null}
          <h3 className={styles.title}>{post.title}</h3>
          {post.summary ? <p className={styles.excerpt}>{post.summary}</p> : null}
        </a>
      ))}
    </section>
  );
}
