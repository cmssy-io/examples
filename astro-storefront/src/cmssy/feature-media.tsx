import { fields, mediaUrl, type BlockProps } from "@cmssy/react";
import styles from "./feature-media.module.css";

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

export function FeatureMedia({ content }: BlockProps<typeof featureMediaProps>) {
  const { heading, text, buttonText, buttonUrl } = content;
  const mediaSrc = mediaUrl(content.media);
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
            {bullets.map((bullet, index) => (
              <li key={index}>{bullet.text}</li>
            ))}
          </ul>
        ) : null}
        {buttonText && buttonUrl ? (
          <a href={buttonUrl} className="shop-btn shop-btn-primary">
            {buttonText}
          </a>
        ) : null}
      </div>

      {mediaSrc ? (
        <div className={styles.media}>
          <img src={mediaSrc} alt={heading} className={styles.image} />
        </div>
      ) : null}
    </section>
  );
}
