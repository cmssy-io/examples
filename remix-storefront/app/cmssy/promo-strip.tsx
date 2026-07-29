import { fields, type BlockProps } from "@cmssy/react";

export const promoStripProps = {
  text: fields.text({ label: "Text", required: true }),
  linkText: fields.text({ label: "Link text" }),
  linkUrl: fields.link({ label: "Link URL" }),
};

export function PromoStrip({ content }: BlockProps<typeof promoStripProps>) {
  return (
    <aside>
      <span>{content.text}</span>
      {content.linkText && content.linkUrl ? (
        <a href={content.linkUrl}>{content.linkText}</a>
      ) : null}
    </aside>
  );
}
