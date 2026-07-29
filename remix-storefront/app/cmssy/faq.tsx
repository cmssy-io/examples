import { fields, type BlockProps } from "@cmssy/react";

export const faqProps = {
  heading: fields.text({ label: "Heading", defaultValue: "Questions" }),
  items: fields.repeater({
    label: "Questions",
    itemLabel: "Question",
    addButtonLabel: "Add question",
    maxItems: 10,
    itemSchema: {
      question: fields.text({ label: "Question", required: true }),
      answer: fields.textarea({ label: "Answer" }),
    },
  }),
};

export function Faq({ content }: BlockProps<typeof faqProps>) {
  const items = content.items ?? [];
  if (items.length === 0) return null;

  return (
    <section>
      {content.heading ? <h2>{content.heading}</h2> : null}
      <dl>
        {items.map((item, index) => (
          <div key={index}>
            <dt>{item.question}</dt>
            {item.answer ? <dd>{item.answer}</dd> : null}
          </div>
        ))}
      </dl>
    </section>
  );
}
