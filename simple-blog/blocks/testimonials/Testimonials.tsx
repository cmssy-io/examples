import { fields, type BlockProps } from "@cmssy/react";
import styles from "./Testimonials.module.css";

export const testimonialsProps = {
  heading: fields.text({ label: "Heading", required: true }),
  testimonials: fields.relation({
    label: "Testimonials",
    model: "testimonial",
    mode: "all",
    sort: "order_asc",
  }),
};

const text = (value: unknown) => (typeof value === "string" ? value : "");

export default function Testimonials({
  content,
}: BlockProps<typeof testimonialsProps>) {
  const items = (content.testimonials ?? [])
    .map((item) => ({
      id: item.id,
      quote: text(item.data.quote),
      author: text(item.data.author),
      role: text(item.data.role),
    }))
    .filter((item) => item.quote);
  if (items.length === 0) return null;

  return (
    <section className={styles.testimonials}>
      <div className={styles.inner}>
        <h2 className={styles.heading}>{content.heading}</h2>
        <ul className={styles.grid}>
          {items.map((item) => (
            <li key={item.id} className={styles.card}>
              <blockquote className={styles.quote}>{item.quote}</blockquote>
              {(item.author || item.role) && (
                <footer className={styles.attribution}>
                  {item.author && (
                    <cite className={styles.author}>{item.author}</cite>
                  )}
                  {item.role && (
                    <span className={styles.role}>{item.role}</span>
                  )}
                </footer>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
