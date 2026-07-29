import { fields, type BlockProps } from "@cmssy/react";

export const shopHeroProps = {
  heading: fields.text({ label: "Heading", required: true }),
  text: fields.textarea({ label: "Text" }),
  primaryButtonText: fields.text({ label: "Primary button text" }),
  primaryButtonUrl: fields.link({ label: "Primary button URL" }),
  secondaryButtonText: fields.text({ label: "Secondary button text" }),
  secondaryButtonUrl: fields.link({ label: "Secondary button URL" }),
  props: fields.repeater({
    label: "Value props",
    itemLabel: "Value prop",
    addButtonLabel: "Add value prop",
    maxItems: 4,
    itemSchema: {
      title: fields.text({ label: "Title", required: true }),
      text: fields.text({ label: "Text" }),
    },
  }),
};

export function ShopHero({ content }: BlockProps<typeof shopHeroProps>) {
  const valueProps = content.props ?? [];

  return (
    <section>
      <h1>{content.heading}</h1>
      {content.text ? <p>{content.text}</p> : null}
      {content.primaryButtonText && content.primaryButtonUrl ? (
        <a href={content.primaryButtonUrl}>{content.primaryButtonText}</a>
      ) : null}
      {content.secondaryButtonText && content.secondaryButtonUrl ? (
        <a href={content.secondaryButtonUrl}>{content.secondaryButtonText}</a>
      ) : null}
      {valueProps.length > 0 ? (
        <ul>
          {valueProps.map((item, index) => (
            <li key={index}>
              <strong>{item.title}</strong>
              {item.text ? <span>{item.text}</span> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
