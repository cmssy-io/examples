import Link from "next/link";
import { fetchOrderByToken, getMyOrder } from "@/services/orders";
import { currentUser } from "@/lib/cmssy/session";
import { AccountOrder } from "@/components/shop/account-order";
import { OrderReceipt, paymentLabel } from "@/components/shop/order-receipt";
import { localePath, shopLocale } from "@/lib/locale";
import { copyFor } from "@/lib/shop-copy";
import styles from "@/components/shop/order.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const { locale } = await shopLocale();
  return { title: `${copyFor(locale).orderConfirmation} - MACHTEC` };
}

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { id } = await params;
  const { token } = await searchParams;
  const { locale, defaultLocale } = await shopLocale();
  const href = (path: string) => localePath(path, locale, defaultLocale);
  const copy = copyFor(locale);

  if (!token) {
    const user = await currentUser();
    const order = user ? await getMyOrder(id) : null;
    if (!order) {
      return (
        <div className={`shop-card ${styles.notFound}`}>
          <h1>{copy.orderNotAvailable}</h1>
          <p className="shop-muted">{copy.orderNotAvailableHint}</p>
          <Link className="shop-btn" href={href("/account")}>
            {copy.goToAccount}
          </Link>
        </div>
      );
    }
    return <AccountOrder order={order} />;
  }

  const order = await fetchOrderByToken(id, token);

  if (!order) {
    return (
      <div className={`shop-card ${styles.notFound}`}>
        <h1>{copy.orderNotFound}</h1>
        <p className="shop-muted">{copy.orderLinkExpired}</p>
        <Link className="shop-btn" href={href("/account")}>
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
        <Link className="shop-btn shop-btn-primary" href={href("/c/all")}>
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
