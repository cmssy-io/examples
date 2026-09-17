import { fields, type BlockProps } from "@cmssy/react";

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

export function StatsBand({ content }: BlockProps<typeof statsBandProps>) {
  const items = content.items ?? [];
  if (items.length === 0) return null;

  return (
    <section>
      <dl>
        {items.map((item, index) => (
          <div key={index}>
            <dt>{item.value}</dt>
            {item.label ? <dd>{item.label}</dd> : null}
          </div>
        ))}
      </dl>
    </section>
  );
}
