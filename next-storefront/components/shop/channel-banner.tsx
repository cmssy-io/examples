"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { leaveChannelAction } from "@/lib/actions/channel";
import { CHANNEL_EXIT_PATH, type ShopChannel } from "@/lib/channel";
import { useCart } from "./cart-provider";
import { useLocalePath, useShopCopy } from "./locale-ui";
import { useCmssyUser } from "./user-provider";
import styles from "./channel-banner.module.css";

function ChannelGone() {
  const copy = useShopCopy();
  const router = useRouter();

  useEffect(() => {
    void leaveChannelAction().then(() => router.refresh());
  }, [router]);

  return (
    <div className={styles.banner} role="status">
      {copy.channelUnavailable}
    </div>
  );
}

export function ChannelBanner({
  channel,
  gone,
}: {
  channel: Pick<ShopChannel, "name" | "priceAccess"> | null;
  gone: boolean;
}) {
  const copy = useShopCopy();
  const localePath = useLocalePath();
  const { user } = useCmssyUser();
  const { signInRequired } = useCart();

  if (gone) return <ChannelGone />;
  if (!channel) return null;

  const restricted = channel.priceAccess !== "PUBLIC";
  const signInHint =
    signInRequired || (restricted && !user)
      ? channel.priceAccess === "COMPANY_MEMBERS"
        ? copy.channelCompanyOnly
        : copy.channelSignInToBuy
      : null;

  return (
    <div className={styles.banner} role="region" aria-label={copy.salesChannel}>
      <span>
        {copy.channelShoppingOn}{" "}
        <span className={styles.name}>{channel.name}</span>
      </span>
      {signInHint ? (
        <span>
          {signInHint}{" "}
          <Link className={styles.link} href={localePath("/account")}>
            {copy.signIn}
          </Link>
        </span>
      ) : null}
      <a className={styles.link} href={localePath(CHANNEL_EXIT_PATH)}>
        {copy.channelExit}
      </a>
    </div>
  );
}
