import { fields, type BlockProps } from "@cmssy/react";
import styles from "./promo-strip.module.css";

export const promoStripProps = {
  text: fields.text({ label: "Text", required: true }),
  linkText: fields.text({ label: "Link text" }),
  linkUrl: fields.link({ label: "Link URL" }),
};

export function PromoStrip({ content }: BlockProps<typeof promoStripProps>) {
  const { text, linkText, linkUrl } = content;
  if (!text) return null;

  return (
    <aside className={styles.strip}>
      <span>{text}</span>
      {linkText && linkUrl ? (
        <a href={linkUrl} className={styles.link}>
          {linkText}
        </a>
      ) : null}
    </aside>
  );
}
