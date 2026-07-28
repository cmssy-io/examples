import { fields, type BlockProps } from "@cmssy/react";
import styles from "./StatsBand.module.css";

export const statsBandProps = {
  items: fields.repeater({
    label: "Stats",
    itemLabel: "Stat",
    addButtonLabel: "Add stat",
    maxItems: 4,
    itemSchema: {
      value: fields.text({ label: "Value", required: true }),
      label: fields.text({ label: "Label" }),
    },
  }),
};

export default function StatsBand({
  content,
}: BlockProps<typeof statsBandProps>) {
  const items = (content.items ?? []).filter((item) => item.value);
  if (items.length === 0) return null;

  return (
    <section className={styles.band}>
      {items.map((item) => (
        <div key={item.value} className={styles.stat}>
          <strong className={styles.value}>{item.value}</strong>
          {item.label ? (
            <span className={styles.label}>{item.label}</span>
          ) : null}
        </div>
      ))}
    </section>
  );
}
