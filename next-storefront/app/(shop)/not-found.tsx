import Link from "next/link";
import { buttonClass } from "@/components/shop/ui/button";
import { localePath, shopLocale } from "@/lib/locale";
import { copyFor } from "@/lib/shop-copy";

export default async function ShopNotFound() {
  const { locale, defaultLocale } = await shopLocale();
  const copy = copyFor(locale);
  const href = (path: string) => localePath(path, locale, defaultLocale);

  return (
    <div
      className="shop-card"
      style={{
        maxWidth: 520,
        margin: "48px auto",
        padding: "56px 32px",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div
        aria-hidden
        style={{
          fontSize: 44,
          fontWeight: 700,
          letterSpacing: "-0.03em",
          color: "var(--muted-foreground)",
        }}
      >
        404
      </div>
      <h1 style={{ fontSize: "var(--text-xl)", margin: 0 }}>
        {copy.notFoundTitle}
      </h1>
      <p className="shop-muted" style={{ maxWidth: "42ch", margin: 0 }}>
        {copy.notFoundBody}
      </p>
      <Link
        href={href("/c/all")}
        className={buttonClass("default", "md")}
        style={{ marginTop: 12 }}
      >
        {copy.backToCatalog}
      </Link>
    </div>
  );
}
