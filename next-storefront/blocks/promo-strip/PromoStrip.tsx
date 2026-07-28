import { CmssyLink } from "@/components/cmssy-link";
import { fields, type BlockProps } from "@cmssy/react";
import styles from "./PromoStrip.module.css";

export const promoStripProps = {
  text: fields.text({ label: "Text", required: true }),
  linkText: fields.text({ label: "Link text" }),
  linkUrl: fields.link({ label: "Link URL" }),
};

export default function PromoStrip({
  content,
}: BlockProps<typeof promoStripProps>) {
  const { text, linkText, linkUrl = "#" } = content;
  if (!text) return null;

  return (
    <aside className={styles.strip}>
      <span>{text}</span>
      {linkText ? (
        <CmssyLink href={linkUrl} className={styles.link}>
          {linkText}
        </CmssyLink>
      ) : null}
    </aside>
  );
}
