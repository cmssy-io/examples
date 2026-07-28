import { fields, type BlockProps } from "@cmssy/react";
import styles from "./ValueProps.module.css";

export const valuePropsProps = {
  heading: fields.text({ label: "Heading" }),
  items: fields.repeater({
    label: "Props",
    itemLabel: "Prop",
    addButtonLabel: "Add prop",
    maxItems: 6,
    itemSchema: {
      title: fields.text({ label: "Title", required: true }),
      text: fields.textarea({ label: "Text" }),
    },
  }),
};

export default function ValueProps({
  content,
}: BlockProps<typeof valuePropsProps>) {
  const items = (content.items ?? []).filter((item) => item.title);
  if (items.length === 0) return null;

  return (
    <section className={styles.section}>
      {content.heading ? (
        <h2 className={styles.heading}>{content.heading}</h2>
      ) : null}
      <div className={styles.grid}>
        {items.map((item) => (
          <div key={item.title} className={`shop-card ${styles.card}`}>
            <strong>{item.title}</strong>
            {item.text ? <span className="shop-muted">{item.text}</span> : null}
          </div>
        ))}
      </div>
    </section>
  );
}
