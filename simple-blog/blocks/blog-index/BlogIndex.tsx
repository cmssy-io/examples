import Image from "next/image";
import { LocaleLink } from "@/components/locale-link";
import {
  fields,
  mediaAlt,
  mediaUrl,
  type BlockProps,
  type CmssyBlockContext,
  type MediaLike,
} from "@cmssy/react";
import type { Localized, Post, PostsResult } from "./load-posts";
import styles from "./BlogIndex.module.css";

export const blogIndexProps = {
  parentPage: fields.pageSelector({
    label: "Parent page",
    multiple: false,
    helperText: "Posts are the children of this page.",
    localized: false,
  }),
  postsPerPage: fields.number({ label: "Posts per page", defaultValue: 9 }),
};

function pickLocale(
  value: Localized,
  locale?: CmssyBlockContext["locale"],
): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (!locale) return "";
  return value[locale.current] ?? value[locale.default] ?? "";
}

// The key of the media field on the posts' page type (Settings -> Page types).
// A workspace without that field simply renders cards with no image.
const COVER_FIELD = "cover_image";

// A resolved media field arrives as `{ url, alt, width, height, ... }`. Narrow
// the JSON here, once, and let `mediaUrl` / `mediaAlt` read it.
function coverOf(post: Post): MediaLike {
  const value = post.customFields?.find(
    (field) => field.fieldKey === COVER_FIELD,
  )?.value;
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as MediaLike;
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
        const cover = coverOf(post);
        const coverUrl = mediaUrl(cover);
        return (
          <LocaleLink
            key={post.id}
            locale={locale}
            href={`/${post.fullSlug.replace(/^\/+/, "")}`}
            className={styles.card}
          >
            {coverUrl && (
              <div className={styles.cover}>
                {/* The loader asked for alt text in this page's language; the
                    title stands in when the image has none. */}
                <Image
                  src={coverUrl}
                  alt={mediaAlt(cover) || title}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className={styles.coverImage}
                />
              </div>
            )}
            <div className={styles.body}>
              {post.publishedAt && (
                <time dateTime={post.publishedAt} className={styles.date}>
                  {new Date(post.publishedAt).toLocaleDateString()}
                </time>
              )}
              <h3 className={styles.title}>{title}</h3>
              {excerpt && <p className={styles.excerpt}>{excerpt}</p>}
            </div>
          </LocaleLink>
        );
      })}
    </div>
  );
}
