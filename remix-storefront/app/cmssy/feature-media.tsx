import { fields, mediaUrl, type BlockProps } from "@cmssy/react";

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
  const bullets = content.bullets ?? [];

  const mediaSrc = mediaUrl(content.media);

  return (
    <section>
      <h2>{content.heading}</h2>
      {content.text ? <p>{content.text}</p> : null}
      {bullets.length > 0 ? (
        <ul>
          {bullets.map((bullet, index) => (
            <li key={index}>{bullet.text}</li>
          ))}
        </ul>
      ) : null}
      {content.buttonText && content.buttonUrl ? (
        <a href={content.buttonUrl}>{content.buttonText}</a>
      ) : null}
      {mediaSrc ? <img src={mediaSrc} alt="" /> : null}
    </section>
  );
}
