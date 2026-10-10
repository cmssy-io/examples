import { Link } from "react-router";
import { AccountOrder } from "../components/shop/account-order";
import styles from "../components/shop/order.module.css";
import { OrderReceipt, paymentLabel } from "../components/shop/order-receipt";
import { PayOrderButton } from "../components/shop/pay-order-button";
import { ShopErrorBoundary } from "../components/shop/shop-error";
import { localePath } from "../lib/locale-path";
import { shopRouteLocale } from "../lib/locale";
import { copyFor } from "../lib/shop-copy";
import { payOnline } from "../lib/stripe";
import { fetchOrderByToken, getMyOrder } from "../services/orders";
import { currentUser, memberAccessToken, shopContext } from "../shop/context";
import type { Route } from "./+types/order";

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const shop = context.get(shopContext);
  const { locale, defaultLocale } = await shopRouteLocale(request, params);
  const search = new URL(request.url).searchParams;
  const token = search.get("token");
  const paid = Boolean(search.get("paid"));
  const common = { locale, defaultLocale, paid, payOnline: payOnline() };

  if (!token) {
    const order = currentUser(shop)
      ? await getMyOrder(memberAccessToken(shop), params.id)
      : null;
    return { ...common, mode: "account" as const, token: null, order };
  }

  const order = await fetchOrderByToken(params.id, token);
  return { ...common, mode: "public" as const, token, order };
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
  const { locale, defaultLocale, paid, payOnline } = loaderData;
  const href = (path: string) => localePath(path, locale, defaultLocale);
  const copy = copyFor(locale);

  if (loaderData.mode === "account") {
    const order = loaderData.order;
    if (!order) {
      return (
        <div className={`shop-card ${styles.notFound}`}>
          <h1>{copy.orderNotAvailable}</h1>
          <p className="shop-muted">{copy.orderNotAvailableHint}</p>
          <Link className="shop-btn" to={href("/account")}>
            {copy.goToAccount}
          </Link>
        </div>
      );
    }
    return <AccountOrder order={order} payOnline={payOnline} paid={paid} />;
  }

  const { order, token } = loaderData;
  if (!order) {
    return (
      <div className={`shop-card ${styles.notFound}`}>
        <h1>{copy.orderNotFound}</h1>
        <p className="shop-muted">{copy.orderLinkExpired}</p>
        <Link className="shop-btn" to={href("/account")}>
          {copy.goToAccount}
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
        <span className={styles.badge}>
          {paymentLabel(order, copy, payOnline)}
        </span>
        {paid && order.balanceDue > 0 ? (
          <p className={styles.subtitle}>
            {copy.paymentConfirming}{" "}
            <Link
              className={styles.strong}
              to={href(`/order/${order.id}?token=${encodeURIComponent(token)}`)}
            >
              {copy.checkOrderStatus}
            </Link>
          </p>
        ) : null}
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
        {payOnline &&
        order.balanceDue > 0 &&
        order.status !== "canceled" &&
        !paid ? (
          <PayOrderButton orderId={order.id} token={token} />
        ) : null}
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
