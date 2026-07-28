import { CmssyLink } from "@/components/cmssy-link";
import { fields, type BlockProps } from "@cmssy/react";
import styles from "./CtaBanner.module.css";

export const ctaBannerProps = {
  heading: fields.text({ label: "Heading", required: true }),
  text: fields.textarea({ label: "Text" }),
  primaryButtonText: fields.text({ label: "Primary button text" }),
  primaryButtonUrl: fields.link({ label: "Primary button URL" }),
  secondaryButtonText: fields.text({ label: "Secondary button text" }),
  secondaryButtonUrl: fields.link({ label: "Secondary button URL" }),
};

export default function CtaBanner({
  content,
}: BlockProps<typeof ctaBannerProps>) {
  const {
    heading,
    text,
    primaryButtonText,
    primaryButtonUrl = "#",
    secondaryButtonText,
    secondaryButtonUrl = "#",
  } = content;

  if (!heading) return null;

  return (
    <section className={styles.banner}>
      <div>
        <h2 className={styles.heading}>{heading}</h2>
        {text ? <p className={styles.text}>{text}</p> : null}
      </div>
      {primaryButtonText || secondaryButtonText ? (
        <div className={styles.actions}>
          {primaryButtonText ? (
            <CmssyLink
              href={primaryButtonUrl}
              className="shop-btn shop-btn-primary"
            >
              {primaryButtonText}
            </CmssyLink>
          ) : null}
          {secondaryButtonText ? (
            <CmssyLink href={secondaryButtonUrl} className="shop-btn">
              {secondaryButtonText}
            </CmssyLink>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
