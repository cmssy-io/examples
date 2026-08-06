import Image from "next/image";
import { CmssyLink } from "@/components/cmssy-link";
import { fields, mediaUrl, type BlockProps } from "@cmssy/react";
import styles from "./FeatureMedia.module.css";

export const featureMediaProps = {
  heading: fields.text({ label: "Heading", required: true }),
  text: fields.textarea({ label: "Text" }),
  bullets: fields.repeater({
    label: "Bullets",
    itemLabel: "Bullet",
    addButtonLabel: "Add bullet",
    maxItems: 5,
    itemSchema: {
      text: fields.text({ label: "Text", required: true }),
    },
  }),
  buttonText: fields.text({ label: "Button text" }),
  buttonUrl: fields.link({ label: "Button URL" }),
  media: fields.media({ label: "Image" }),
  mediaSide: fields.select({
    label: "Image side",
    options: ["right", "left"],
    defaultValue: "right",
  }),
};

export default function FeatureMedia({
  content,
}: BlockProps<typeof featureMediaProps>) {
  const { heading, text, buttonText, buttonUrl = "#", media } = content;
  const mediaSrc = mediaUrl(media);
  if (!heading) return null;

  const bullets = (content.bullets ?? []).filter((bullet) => bullet.text);
  const mediaFirst = content.mediaSide === "left";

  return (
    <section
      className={`${styles.section} ${mediaFirst ? styles.mediaFirst : ""}`}
    >
      <div className={styles.body}>
        <h2 className={styles.heading}>{heading}</h2>
        {text ? <p className={styles.text}>{text}</p> : null}
        {bullets.length > 0 ? (
          <ul className={styles.bullets}>
            {bullets.map((bullet) => (
              <li key={bullet.text}>{bullet.text}</li>
            ))}
          </ul>
        ) : null}
        {buttonText ? (
          <CmssyLink href={buttonUrl} className="shop-btn shop-btn-primary">
            {buttonText}
          </CmssyLink>
        ) : null}
      </div>

      {mediaSrc ? (
        <div className={styles.media}>
          <Image
            src={mediaSrc}
            alt={heading}
            fill
            sizes="(max-width: 860px) 100vw, 50vw"
            style={{ objectFit: "cover" }}
          />
        </div>
      ) : null}
    </section>
  );
}
