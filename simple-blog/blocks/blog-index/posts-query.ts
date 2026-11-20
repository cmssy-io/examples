// The delivery API exposes published pages under `public.page.byType`.
// `queryScoped` injects `$workspaceId` for you (see load-posts.ts).
//
// `customFields` carries what the page type adds to a page - here the post's
// cover image. Custom fields are not stored per language, so `locale` tells the
// API which language the cover's alt text should come back in; without it every
// translated page would get the alt of the workspace default language.
export const PUBLIC_PAGES_BY_TYPE = `query PublicPagesByType(
  $workspaceId: String!
  $parentSlug: String
  $limit: Int
  $offset: Int
  $locale: String
) {
  public {
    page {
      byType(
        workspaceId: $workspaceId
        parentSlug: $parentSlug
        limit: $limit
        offset: $offset
        locale: $locale
      ) {
        items {
          id
          slug
          fullSlug
          publishedAt
          displayName
          seoTitle
          seoDescription
          customFields
        }
        hasMore
      }
    }
  }
}`;
