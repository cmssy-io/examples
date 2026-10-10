import { fields, mediaUrl, type BlockProps } from "@cmssy/react";
import { CmssyLink } from "../components/cmssy-link";
import styles from "./hero.module.css";

export const heroProps = {
  badgeText: fields.text({ label: "Badge" }),
  heading: fields.text({ label: "Heading", required: true }),
  headingHighlight: fields.text({ label: "Heading highlight" }),
  subheading: fields.textarea({ label: "Subheading" }),
  primaryButtonText: fields.text({ label: "Primary button text" }),
  primaryButtonUrl: fields.link({ label: "Primary button URL" }),
  secondaryButtonText: fields.text({ label: "Secondary button text" }),
  secondaryButtonUrl: fields.link({ label: "Secondary button URL" }),
  media: fields.media({ label: "Media (image or video)" }),
};

const isVideo = (src: string) => /\.(mp4|webm|ogg)$/i.test(src);

export function Hero({ content }: BlockProps<typeof heroProps>) {
  const {
    badgeText,
    heading,
    headingHighlight,
    subheading,
    primaryButtonText,
    primaryButtonUrl,
    secondaryButtonText,
    secondaryButtonUrl,
  } = content;
  const mediaSrc = mediaUrl(content.media);

  if (!heading && !headingHighlight) return null;

  return (
    <section className={styles.hero}>
      <div className={styles.inner}>
        {badgeText ? <span className={styles.badge}>{badgeText}</span> : null}

        <h1 className={styles.title}>
          {heading}
          {headingHighlight ? (
            <>
              {heading ? " " : ""}
              <span className={styles.highlight}>{headingHighlight}</span>
            </>
          ) : null}
        </h1>

        {subheading ? <p className={styles.subheading}>{subheading}</p> : null}

        {(primaryButtonText && primaryButtonUrl) ||
        (secondaryButtonText && secondaryButtonUrl) ? (
          <div className={styles.actions}>
            {primaryButtonText && primaryButtonUrl ? (
              <CmssyLink href={primaryButtonUrl} className="shop-btn shop-btn-primary">
                {primaryButtonText}
              </CmssyLink>
            ) : null}
            {secondaryButtonText && secondaryButtonUrl ? (
              <CmssyLink href={secondaryButtonUrl} className="shop-btn">
                {secondaryButtonText}
              </CmssyLink>
            ) : null}
          </div>
        ) : null}

        {mediaSrc ? (
          <div className={styles.media}>
            <div className={styles.mediaFrame}>
              {isVideo(mediaSrc) ? (
                <video
                  src={mediaSrc}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className={styles.video}
                />
              ) : (
                <img
                  src={mediaSrc}
                  alt={heading ?? ""}
                  className={styles.image}
                />
              )}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
