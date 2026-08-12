import { CmssyLink } from "@/components/cmssy-link";
import { fields, type CmssyBlockContext } from "@cmssy/react";
import type { Localized, Post } from "./load-posts";
import styles from "./BlogIndex.module.css";

export const blogIndexProps = {
  parentPage: fields.pageSelector({
    label: "Parent page",
    multiple: false,
    helperText: "Posts are the children of this page.",
  }),
  postsPerPage: fields.number({ label: "Posts per page", defaultValue: 9 }),
};

function pickLocale(
  value: Localized,
  locale?: CmssyBlockContext["locale"],
): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  const keys = locale ? [locale.current, locale.default] : ["en"];
  for (const key of keys) {
    if (value[key]) return value[key];
  }
  return Object.values(value)[0] ?? "";
}

export default function BlogIndex({
  data,
  context,
}: {
  data?: { items?: Post[]; hasMore?: boolean } | null;
  context?: CmssyBlockContext;
}) {
  const items = data?.items ?? [];
  const locale = context?.locale;

  if (items.length === 0) {
    return <div className={styles.empty}>No posts yet.</div>;
  }

  return (
    <div className={styles.grid}>
      {items.map((post) => {
        const title =
          pickLocale(post.displayName, locale) ||
          pickLocale(post.seoTitle, locale) ||
          post.slug;
        const excerpt = pickLocale(post.seoDescription, locale);
        return (
          <CmssyLink
            key={post.id}
            href={`/${post.fullSlug.replace(/^\/+/, "")}`}
            className={styles.card}
          >
            {post.publishedAt && (
              <time dateTime={post.publishedAt} className={styles.date}>
                {new Date(post.publishedAt).toLocaleDateString()}
              </time>
            )}
            <h3 className={styles.title}>{title}</h3>
            {excerpt && <p className={styles.excerpt}>{excerpt}</p>}
          </CmssyLink>
        );
      })}
    </div>
  );
}
