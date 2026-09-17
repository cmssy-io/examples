import { fields, type BlockProps } from "@cmssy/react";

export const ctaBannerProps = {
  heading: fields.text({ label: "Heading", required: true }),
  text: fields.textarea({ label: "Text" }),
  primaryButtonText: fields.text({ label: "Primary button text" }),
  primaryButtonUrl: fields.link({ label: "Primary button URL" }),
  secondaryButtonText: fields.text({ label: "Secondary button text" }),
  secondaryButtonUrl: fields.link({ label: "Secondary button URL" }),
};

export function CtaBanner({ content }: BlockProps<typeof ctaBannerProps>) {
  return (
    <section>
      <h2>{content.heading}</h2>
      {content.text ? <p>{content.text}</p> : null}
      {content.primaryButtonText && content.primaryButtonUrl ? (
        <a href={content.primaryButtonUrl}>{content.primaryButtonText}</a>
      ) : null}
      {content.secondaryButtonText && content.secondaryButtonUrl ? (
        <a href={content.secondaryButtonUrl}>{content.secondaryButtonText}</a>
      ) : null}
    </section>
  );
}
