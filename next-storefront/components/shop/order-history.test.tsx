import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { AccountOrderScope } from "@/graphql/generated/graphql";
import { LocaleProvider } from "./locale-ui";
import { OrderHistory } from "./order-history";

vi.mock("next/navigation", () => ({ usePathname: () => "/account" }));

function render(page: number, lastPage: number, scope?: AccountOrderScope) {
  return renderToStaticMarkup(
    <LocaleProvider
      value={{ locale: "en", defaultLocale: "en", locales: ["en", "no"] }}
    >
      <OrderHistory
        orders={[]}
        page={page}
        lastPage={lastPage}
        payOnline={false}
        scope={scope}
      />
    </LocaleProvider>,
  );
}

function pagerLinks(html: string): string[] {
  const nav = html.match(
    /<nav[^>]*aria-label="Pagination"[\s\S]*?<\/nav>/,
  )?.[0];
  return [...(nav ?? "").matchAll(/href="([^"]+)"/g)].map((m) =>
    m[1].replaceAll("&amp;", "&"),
  );
}

describe("OrderHistory pager", () => {
  it("renders no pager when every order fits on one page", () => {
    expect(render(1, 1)).not.toContain('aria-label="Pagination"');
  });

  it("links the neighbouring pages and names the current one", () => {
    const html = render(2, 3);
    expect(pagerLinks(html)).toEqual(["/account", "/account?page=3"]);
    expect(html).toContain("Page 2 of 3");
  });

  it("offers no next page on the last one", () => {
    expect(pagerLinks(render(3, 3))).toEqual(["/account?page=2"]);
  });

  it("keeps the company orders tab while paging", () => {
    expect(pagerLinks(render(1, 2, "COMPANY"))).toEqual([
      "/account?orders=company&page=2",
    ]);
  });
});
