import { fields, type BlockProps } from "@cmssy/react";
import styles from "./cta-banner.module.css";

export const ctaBannerProps = {
  heading: fields.text({ label: "Heading", required: true }),
  text: fields.textarea({ label: "Text" }),
  primaryButtonText: fields.text({ label: "Primary button text" }),
  primaryButtonUrl: fields.link({ label: "Primary button URL" }),
  secondaryButtonText: fields.text({ label: "Secondary button text" }),
  secondaryButtonUrl: fields.link({ label: "Secondary button URL" }),
};

export function CtaBanner({ content }: BlockProps<typeof ctaBannerProps>) {
  const {
    heading,
    text,
    primaryButtonText,
    primaryButtonUrl,
    secondaryButtonText,
    secondaryButtonUrl,
  } = content;

  if (!heading) return null;

  return (
    <section className={styles.banner}>
      <div>
        <h2 className={styles.heading}>{heading}</h2>
        {text ? <p className={styles.text}>{text}</p> : null}
      </div>
      {(primaryButtonText && primaryButtonUrl) ||
      (secondaryButtonText && secondaryButtonUrl) ? (
        <div className={styles.actions}>
          {primaryButtonText && primaryButtonUrl ? (
            <a href={primaryButtonUrl} className="shop-btn shop-btn-primary">
              {primaryButtonText}
            </a>
          ) : null}
          {secondaryButtonText && secondaryButtonUrl ? (
            <a href={secondaryButtonUrl} className="shop-btn">
              {secondaryButtonText}
            </a>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
