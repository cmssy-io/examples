import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DraftBanner } from "./draft-banner";
import { LocaleProvider } from "./locale-ui";

const pathname = vi.hoisted(() => ({ current: "/" }));

vi.mock("next/navigation", () => ({
  usePathname: () => pathname.current,
}));

function render(locale: string) {
  return renderToStaticMarkup(
    <LocaleProvider value={{ locale, defaultLocale: "en", locales: ["en", "no"] }}>
      <DraftBanner />
    </LocaleProvider>,
  );
}

describe("DraftBanner", () => {
  it("links to the draft route's exit and back to the current page", () => {
    pathname.current = "/no/products/valve-52-g14";

    const html = render("no");

    expect(
      html,
      "The exit link must hit /api/draft?disable=1, otherwise the shopper stays in draft mode with no way out.",
    ).toContain(
      'href="/api/draft?disable=1&amp;redirect=%2Fno%2Fproducts%2Fvalve-52-g14"',
    );
    expect(html).toContain("Avslutt forhåndsvisning");
  });

  it("says the page shows unpublished content", () => {
    pathname.current = "/";

    expect(render("en")).toContain(
      "Preview - you are seeing unpublished content",
    );
  });
});
