import { isRouteErrorResponse, Link } from "react-router";
import { useLocalePath, useShopCopy } from "./locale-ui";
import { buttonClass } from "./ui/button";

export function ShopNotFound() {
  const copy = useShopCopy();
  const localePath = useLocalePath();
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
        to={localePath("/c/all")}
        className={buttonClass("default", "md")}
        style={{ marginTop: 12 }}
      >
        {copy.backToCatalog}
      </Link>
    </div>
  );
}

export function ShopErrorBoundary({ error }: { error: unknown }) {
  if (isRouteErrorResponse(error) && error.status === 404) {
    return <ShopNotFound />;
  }
  const message =
    error instanceof Error ? error.message : "Something went wrong.";
  return (
    <div className="shop-card" style={{ maxWidth: 640, margin: "48px auto" }}>
      <h1 style={{ marginTop: 0 }}>Error</h1>
      <p className="shop-muted">{message}</p>
    </div>
  );
}
