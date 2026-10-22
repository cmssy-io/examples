import {
  SHOP_CHANNELS,
  channelEntryPath,
  type ShopChannel,
} from "@/lib/channel";
import type { ShopCopy } from "@/lib/shop-copy";
import styles from "./order.module.css";

function audience(channel: ShopChannel, copy: ShopCopy): string {
  if (channel.priceAccess === "MEMBERS") return copy.channelForMembers;
  if (channel.priceAccess === "COMPANY_MEMBERS")
    return copy.channelForCompanies;
  return copy.channelForEveryone;
}

// Plain anchors, not Link: the entry route sets a cookie and redirects, and
// the whole shop - cart included - has to render again for the new channel.
export function TradeChannels({
  copy,
  href,
}: {
  copy: ShopCopy;
  href: (path: string) => string;
}) {
  return (
    <section className={styles.accountSection}>
      <h2 className={styles.sectionTitle}>{copy.tradeChannels}</h2>
      <p className="shop-muted">{copy.tradeChannelsLead}</p>
      <ul className={styles.channelLinks}>
        {SHOP_CHANNELS.map((channel) => (
          <li key={channel.key}>
            <a href={href(channelEntryPath(channel))}>{channel.name}</a>{" "}
            <span className="shop-muted">- {audience(channel, copy)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
