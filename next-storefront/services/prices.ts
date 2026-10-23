import {
  CMSSY_BUYER_PRICES_MAX_ITEMS,
  CMSSY_PUBLIC_PRICES_MAX_ITEMS,
  channelRefusal,
  createCmssyClient,
  getBuyerCatalogPrices,
  getBuyerPrices,
  getPublicCatalogPrices,
  getPublicPrices,
  type CmssyPriceQueryItem,
  type CmssyPriceWithheldReason,
} from "@cmssy/core";
import { cmssy } from "@/cmssy.config";
import {
  PRODUCT_MODEL,
  loadProducts,
  productFilter,
  type ProductPage,
  type Product,
  type ProductQuery,
} from "@/lib/catalog";
import { memberAccessToken } from "@/lib/cmssy/member-token";
import { previewSecret } from "@/lib/cmssy/preview-secret";
import { retryMode } from "@/lib/cmssy/retry-mode";
import {
  badgeFor,
  indexRows,
  repriceProduct,
  soldOnChannel,
  type OverlayPriceRow,
  type PriceBadge,
  type PriceOverlay,
} from "@/lib/price-overlay";
import { activeChannel } from "@/services/channel";

const client = createCmssyClient(cmssy);

const CATALOG_PAGE_SIZE = 50;
const CATALOG_MAX_PAGES = 40;

export interface Viewer {
  workspaceId: string;
  accessToken: string | undefined;
  channel: string | null;
  channelCurrency: string | null;
  nextChangeAt: string | null;
}

// Who the prices are for. Null when nobody but the catalogue prices this
// visitor: a guest outside any channel sees the cached catalogue as it is.
async function priceViewer(): Promise<Viewer | null> {
  const [{ channel, probe }, accessToken] = await Promise.all([
    activeChannel(),
    memberAccessToken(),
  ]);
  if (!channel && !accessToken) return null;
  const workspaceId = await client.resolveWorkspaceId({ retry: retryMode() });
  return {
    workspaceId,
    accessToken,
    channel: channel?.key ?? null,
    channelCurrency: probe?.known ? probe.currency : null,
    nextChangeAt: probe?.known ? probe.nextChangeAt : null,
  };
}

function chunks<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    out.push(items.slice(index, index + size));
  }
  return out;
}

function withheldBy(error: unknown): CmssyPriceWithheldReason | null {
  const reason = channelRefusal(error)?.reason;
  return reason === "MEMBERS_ONLY" || reason === "COMPANY_MEMBERS_ONLY"
    ? reason
    : null;
}

// A failed price read never breaks the page: the catalogue price stays, and a
// channel that refuses this member reads as withheld. On a channel in another
// currency the catalogue price is in the wrong currency, so a failed read
// prices nothing and the products read as not sold rather than show it.
export async function settleOverlay(
  viewer: Viewer,
  read: () => Promise<PriceOverlay>,
): Promise<PriceOverlay | null> {
  try {
    return await read();
  } catch (error) {
    const withheld = withheldBy(error);
    if (withheld) {
      return {
        rows: new Map(),
        withheld,
        nextChangeAt: viewer.nextChangeAt,
        channelCurrency: viewer.channelCurrency,
      };
    }
    console.error("prices: overlay read failed", error);
    if (!viewer.channelCurrency) return null;
    return {
      rows: new Map(),
      withheld: null,
      nextChangeAt: viewer.nextChangeAt,
      channelCurrency: viewer.channelCurrency,
    };
  }
}

export async function loadPriceOverlay(
  items: readonly CmssyPriceQueryItem[],
  locale?: string,
): Promise<PriceOverlay | null> {
  const viewer = await priceViewer();
  if (!viewer || items.length === 0) return null;
  const { workspaceId, accessToken, channel } = viewer;
  const retry = retryMode();
  const secret = await previewSecret();

  return settleOverlay(viewer, async () => {
    if (accessToken) {
      const pages = await Promise.all(
        chunks(items, CMSSY_BUYER_PRICES_MAX_ITEMS).map((batch) =>
          getBuyerPrices(cmssy, batch, {
            workspaceId,
            accessToken,
            channel,
            retry,
          }),
        ),
      );
      return {
        rows: indexRows(pages.flat()),
        withheld: null,
        nextChangeAt: viewer.nextChangeAt,
        channelCurrency: viewer.channelCurrency,
      };
    }
    const pages = await Promise.all(
      chunks(items, CMSSY_PUBLIC_PRICES_MAX_ITEMS).map((batch) =>
        getPublicPrices(cmssy, batch, {
          workspaceId,
          channel: channel ?? undefined,
          locale,
          previewSecret: secret,
          retry,
        }),
      ),
    );
    const rows = pages.flatMap((page) =>
      page.items.flatMap((item) => (item.price ? [item.price] : [])),
    );
    return {
      rows: indexRows(rows),
      withheld: pages.find((page) => page.priceWithheld)?.priceWithheld ?? null,
      nextChangeAt: pages[0]?.nextChangeAt ?? viewer.nextChangeAt,
      channelCurrency: viewer.channelCurrency,
    };
  });
}

function priceItems(product: Product): CmssyPriceQueryItem[] {
  return [
    { recordId: product.id },
    ...product.variants.map((variant) => ({
      recordId: product.id,
      variantKey: variant.id,
    })),
  ];
}

export async function priceProduct(
  product: Product,
  locale?: string,
): Promise<{ product: Product; overlay: PriceOverlay | null; sold: boolean }> {
  const overlay = await loadPriceOverlay(priceItems(product), locale);
  return {
    product: repriceProduct(product, overlay),
    overlay,
    sold: soldOnChannel(product, overlay),
  };
}

// A handful of products picked by a block, priced in one overlay read.
export async function priceProducts(
  products: readonly Product[],
  locale?: string,
): Promise<Product[]> {
  const overlay = await loadPriceOverlay(products.flatMap(priceItems), locale);
  return products
    .filter((product) => soldOnChannel(product, overlay))
    .map((product) => repriceProduct(product, overlay));
}

type CatalogQuery = Pick<
  ProductQuery,
  "categoryId" | "brandId" | "stockState"
> & {
  locale?: string;
};

interface CatalogPage {
  rows: OverlayPriceRow[];
  total: number;
  withheld: CmssyPriceWithheldReason | null;
  nextChangeAt: string | null;
}

// The category listing reads its prices through the catalogue variants, one
// page per 50 products of the same filter the cached catalogue scan used.
export async function loadCatalogOverlay(
  query: CatalogQuery,
): Promise<PriceOverlay | null> {
  const viewer = await priceViewer();
  if (!viewer) return null;
  const { workspaceId, accessToken, channel } = viewer;
  const retry = retryMode();
  const secret = await previewSecret();
  const listing = {
    modelSlug: PRODUCT_MODEL,
    filter: productFilter(query),
    stockState: query.stockState ?? null,
    locale: query.locale ?? null,
    limit: CATALOG_PAGE_SIZE,
  };

  const readPage = async (offset: number): Promise<CatalogPage> => {
    if (accessToken) {
      const page = await getBuyerCatalogPrices(
        cmssy,
        { ...listing, offset },
        { workspaceId, accessToken, channel, retry },
      );
      return {
        rows: page.items,
        total: page.total,
        withheld: null,
        nextChangeAt: viewer.nextChangeAt,
      };
    }
    const page = await getPublicCatalogPrices(
      cmssy,
      { ...listing, offset },
      {
        workspaceId,
        channel: channel ?? undefined,
        previewSecret: secret,
        retry,
      },
    );
    return {
      rows: page.items.flatMap((item) => (item.price ? [item.price] : [])),
      total: page.total,
      withheld: page.priceWithheld,
      nextChangeAt: page.nextChangeAt,
    };
  };

  return settleOverlay(viewer, async () => {
    const first = await readPage(0);
    const pageCount = Math.min(
      Math.ceil(first.total / CATALOG_PAGE_SIZE),
      CATALOG_MAX_PAGES,
    );
    const rest = await Promise.all(
      Array.from({ length: Math.max(pageCount - 1, 0) }, (_, index) =>
        readPage((index + 1) * CATALOG_PAGE_SIZE),
      ),
    );
    return {
      rows: indexRows([first, ...rest].flatMap((page) => page.rows)),
      withheld: first.withheld,
      nextChangeAt: first.nextChangeAt,
      channelCurrency: viewer.channelCurrency,
    };
  });
}

export async function loadPricedProducts(
  query: ProductQuery,
): Promise<ProductPage & { nextChangeAt: string | null }> {
  let nextChangeAt: string | null = null;
  const page = await loadProducts(query, async (products) => {
    const overlay = await loadCatalogOverlay(query);
    nextChangeAt = overlay?.nextChangeAt ?? null;
    return products
      .filter((product) => soldOnChannel(product, overlay))
      .map((product) => repriceProduct(product, overlay));
  });
  return { ...page, nextChangeAt };
}

// The cart prices its own lines; this only names whose list priced each one.
export async function loadCartPriceBadges(
  recordIds: readonly string[],
): Promise<Record<string, PriceBadge>> {
  const overlay = await loadPriceOverlay(
    [...new Set(recordIds)].map((recordId) => ({ recordId })),
  );
  const badges: Record<string, PriceBadge> = {};
  for (const [key, row] of overlay?.rows ?? []) {
    const badge = badgeFor(row.listSource);
    if (badge && !row.variantKey) badges[key] = badge;
  }
  return badges;
}
