import { fields, type BlockProps } from "@cmssy/react";
import styles from "./Faq.module.css";

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

export default function Faq({ content }: BlockProps<typeof faqProps>) {
  const items = (content.items ?? []).filter((item) => item.question);
  if (items.length === 0) return null;

  return (
    <section className={styles.section}>
      {content.heading ? (
        <h2 className={styles.heading}>{content.heading}</h2>
      ) : null}
      <div className={styles.list}>
        {items.map((item) => (
          <details key={item.question} className={`shop-card ${styles.item}`}>
            <summary className={styles.question}>{item.question}</summary>
            {item.answer ? (
              <p className={styles.answer}>{item.answer}</p>
            ) : null}
          </details>
        ))}
      </div>
    </section>
  );
}
