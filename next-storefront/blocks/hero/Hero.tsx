import Image from "next/image";
import { CmssyLink } from "@/components/cmssy-link";
import { fields, type BlockProps } from "@cmssy/react";
import styles from "./Hero.module.css";

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

export default function Hero({ content }: BlockProps<typeof heroProps>) {
  const {
    badgeText,
    heading,
    headingHighlight,
    subheading,
    primaryButtonText,
    primaryButtonUrl = "#",
    secondaryButtonText,
    secondaryButtonUrl = "#",
    media,
  } = content;

  if (!heading && !headingHighlight) return null;

  return (
    <section className={styles.hero}>
      <div className={styles.inner}>
        {badgeText && <span className={styles.badge}>{badgeText}</span>}

        <h1 className={styles.title}>
          {heading}
          {headingHighlight && (
            <>
              {heading ? " " : ""}
              <span className={styles.highlight}>{headingHighlight}</span>
            </>
          )}
        </h1>

        {subheading && <p className={styles.subheading}>{subheading}</p>}

        {(primaryButtonText || secondaryButtonText) && (
          <div className={styles.actions}>
            {primaryButtonText && (
              <CmssyLink
                href={primaryButtonUrl}
                className={styles.buttonPrimary}
              >
                {primaryButtonText}
              </CmssyLink>
            )}
            {secondaryButtonText && (
              <CmssyLink
                href={secondaryButtonUrl}
                className={styles.buttonSecondary}
              >
                {secondaryButtonText}
              </CmssyLink>
            )}
          </div>
        )}

        {media && (
          <div className={styles.media}>
            <div className={styles.mediaFrame}>
              {isVideo(media) ? (
                <video
                  src={media}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className={styles.video}
                />
              ) : (
                <Image
                  src={media}
                  alt={heading ?? ""}
                  fill
                  sizes="(max-width: 768px) 100vw, 768px"
                  style={{ objectFit: "cover" }}
                  priority
                />
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
