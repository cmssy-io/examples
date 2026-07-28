import { CmssyLink } from "@/components/cmssy-link";
import { fields, type BlockProps } from "@cmssy/react";
import styles from "./ShopHero.module.css";

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

export default function ShopHero({
  content,
}: BlockProps<typeof shopHeroProps>) {
  const {
    heading,
    text,
    primaryButtonText,
    primaryButtonUrl = "#",
    secondaryButtonText,
    secondaryButtonUrl = "#",
  } = content;

  if (!heading) return null;

  const valueProps = (content.props ?? []).filter((prop) => prop.title);

  return (
    <section className={styles.hero}>
      <div>
        <h1 className={styles.title}>{heading}</h1>
        {text ? <p className={styles.text}>{text}</p> : null}
        {primaryButtonText || secondaryButtonText ? (
          <div className={styles.actions}>
            {primaryButtonText ? (
              <CmssyLink
                href={primaryButtonUrl}
                className="shop-btn shop-btn-primary"
              >
                {primaryButtonText}
              </CmssyLink>
            ) : null}
            {secondaryButtonText ? (
              <CmssyLink href={secondaryButtonUrl} className="shop-btn">
                {secondaryButtonText}
              </CmssyLink>
            ) : null}
          </div>
        ) : null}
      </div>

      {valueProps.length > 0 ? (
        <ul className={styles.props}>
          {valueProps.map((prop) => (
            <li key={prop.title}>
              <strong>{prop.title}</strong>
              {prop.text ? <span>{prop.text}</span> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
