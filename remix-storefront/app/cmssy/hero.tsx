import { fields, mediaUrl, type BlockProps } from "@cmssy/react";

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

export function Hero({ content }: BlockProps<typeof heroProps>) {
  const mediaSrc = mediaUrl(content.media);

  return (
    <section>
      {content.badgeText ? <p>{content.badgeText}</p> : null}
      <h1>
        {content.heading}
        {content.headingHighlight ? <em>{content.headingHighlight}</em> : null}
      </h1>
      {content.subheading ? <p>{content.subheading}</p> : null}
      {content.primaryButtonText && content.primaryButtonUrl ? (
        <a href={content.primaryButtonUrl}>{content.primaryButtonText}</a>
      ) : null}
      {content.secondaryButtonText && content.secondaryButtonUrl ? (
        <a href={content.secondaryButtonUrl}>{content.secondaryButtonText}</a>
      ) : null}
      {mediaSrc ? <img src={mediaSrc} alt="" /> : null}
    </section>
  );
}
