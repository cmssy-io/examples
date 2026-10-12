import { data, Link } from "react-router";
import styles from "../components/shop/order.module.css";
import { OrderReceipt, paymentLabel } from "../components/shop/order-receipt";
import { ShopErrorBoundary } from "../components/shop/shop-error";
import { localePath } from "../lib/locale-path";
import { shopRouteLocale } from "../lib/locale";
import { copyFor } from "../lib/shop-copy";
import { visitorAddress } from "../lib/cmssy/visitor-headers";
import { fetchOrderByToken } from "../services/orders";
import type { Route } from "./+types/order";

export async function loader({ request, params }: Route.LoaderArgs) {
  const { locale, defaultLocale } = await shopRouteLocale(request, params);
  const token = new URL(request.url).searchParams.get("token");
  const order = token
    ? await fetchOrderByToken(params.id, token, visitorAddress(request.headers))
    : null;
  return data({ locale, defaultLocale, order }, { status: order ? 200 : 404 });
}

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData) return [];
  return [
    { title: `${copyFor(loaderData.locale).orderConfirmation} - MACHTEC` },
    { name: "robots", content: "noindex" },
  ];
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return <ShopErrorBoundary error={error} />;
}

export default function OrderPage({ loaderData }: Route.ComponentProps) {
  const { locale, defaultLocale, order } = loaderData;
  const href = (path: string) => localePath(path, locale, defaultLocale);
  const copy = copyFor(locale);

  if (!order) {
    return (
      <div className={`shop-card ${styles.notFound}`}>
        <h1>{copy.orderNotFound}</h1>
        <p className="shop-muted">{copy.orderLinkExpired}</p>
        <Link className="shop-btn" to={href("/c/all")}>
          {copy.continueShopping}
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <span className={styles.mark} aria-hidden>
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </span>
        <h1 className={styles.title}>{copy.orderPlaced}</h1>
        <p className={styles.subtitle}>
          {order.orderNumber ? (
            <>
              {copy.order}{" "}
              <span className={styles.strong}>#{order.orderNumber}</span>
              {" · "}
            </>
          ) : null}
          {order.poNumber ? (
            <>
              {copy.po} <span className={styles.strong}>{order.poNumber}</span>
              {" · "}
            </>
          ) : null}
          {copy.confirmationSentTo}{" "}
          <span className={styles.strong}>{order.customerEmail}</span>
        </p>
        <span className={styles.badge}>{paymentLabel(order, copy)}</span>
      </div>

      <OrderReceipt order={order} copy={copy} />

      {order.customerNote ? (
        <div className={styles.meta}>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>{copy.note}</span>
            <span>{order.customerNote}</span>
          </div>
        </div>
      ) : null}

      <div className={styles.actions}>
        <Link className="shop-btn shop-btn-primary" to={href("/c/all")}>
          {copy.continueShopping}
        </Link>
        {order.invoiceUrl ? (
          <a className="shop-btn" href={order.invoiceUrl}>
            {copy.downloadInvoice}
          </a>
        ) : null}
      </div>

      <p className="shop-muted" style={{ textAlign: "center", marginTop: 16 }}>
        {copy.keepThisLink}
      </p>
    </div>
  );
}
