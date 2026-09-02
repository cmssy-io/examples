import { fields, type BlockProps } from "@cmssy/react";

export const siteFooterProps = {
  brandName: fields.text({ label: "Brand name", defaultValue: "MACHTEC" }),
  brandText: fields.textarea({ label: "Brand text" }),
  columns: fields.repeater({
    label: "Columns",
    itemLabel: "Column",
    addButtonLabel: "Add column",
    maxItems: 4,
    itemSchema: {
      title: fields.text({ label: "Title", required: true }),
      links: fields.repeater({
        label: "Links",
        itemLabel: "Link",
        addButtonLabel: "Add link",
        itemSchema: {
          label: fields.text({ label: "Label", required: true }),
          url: fields.link({ label: "URL", required: true }),
        },
      }),
    },
  }),
  note: fields.text({ label: "Bottom note" }),
  credit: fields.text({ label: "Bottom credit" }),
};

export function SiteFooter({ content }: BlockProps<typeof siteFooterProps>) {
  const columns = (content.columns ?? []).filter(
    (column) => column.links?.length,
  );

  return (
    <footer>
      <div>
        {content.brandName ? <strong>{content.brandName}</strong> : null}
        {content.brandText ? <p>{content.brandText}</p> : null}
      </div>

      {columns.map((column, index) => (
        <nav key={column.title ?? index}>
          {column.title ? <p>{column.title}</p> : null}
          <ul>
            {(column.links ?? [])
              .filter((link) => link.label && link.url)
              .map((link) => (
                <li key={`${link.url}${link.label}`}>
                  <a href={link.url}>{link.label}</a>
                </li>
              ))}
          </ul>
        </nav>
      ))}

      {content.note ? <p>{content.note}</p> : null}
      {content.credit ? <p>{content.credit}</p> : null}
    </footer>
  );
}
