import { LocaleLink } from "@/components/locale-link";
import { fields, type BlockProps, type CmssyBlockContext } from "@cmssy/react";
import type { Localized, Post, PostsResult } from "./load-posts";
import styles from "./BlogIndex.module.css";

export const blogIndexProps = {
  parentSlug: fields.text({ label: "Parent slug", placeholder: "/blog" }),
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
}: BlockProps<typeof blogIndexProps, PostsResult | null>) {
  const items = data?.items ?? [];
  const locale = context?.locale;

  if (items.length === 0) {
    return <div className={styles.empty}>No posts yet.</div>;
  }

  return (
    <div className={styles.grid}>
      {items.map((post: Post) => {
        const title =
          pickLocale(post.displayName, locale) ||
          pickLocale(post.seoTitle, locale) ||
          post.slug;
        const excerpt = pickLocale(post.seoDescription, locale);
        return (
          <LocaleLink
            key={post.id}
            locale={locale}
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
          </LocaleLink>
        );
      })}
    </div>
  );
}
