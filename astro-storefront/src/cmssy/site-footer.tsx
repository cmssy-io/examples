import { fields, type BlockProps } from "@cmssy/react";
import styles from "./site-footer.module.css";

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
          url: fields.link({
            label: "URL",
            required: true,
            localized: false,
          }),
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
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.columns}>
          <div className={styles.brand}>
            {content.brandName ? (
              <span className={styles.brandName}>{content.brandName}</span>
            ) : null}
            {content.brandText ? (
              <span className={styles.brandText}>{content.brandText}</span>
            ) : null}
          </div>

          {columns.map((column, index) => (
            <nav key={index} className={styles.col}>
              {column.title ? (
                <p className={styles.columnTitle}>{column.title}</p>
              ) : null}
              <ul className={styles.links}>
                {(column.links ?? [])
                  .filter((link) => link.label && link.url)
                  .map((link, linkIndex) => (
                    <li key={linkIndex}>
                      <a href={link.url} className={styles.link}>
                        {link.label}
                      </a>
                    </li>
                  ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className={styles.bottom}>
          {content.note ? <span>{content.note}</span> : null}
          {content.credit ? <span>{content.credit}</span> : null}
        </div>
      </div>
    </footer>
  );
}
