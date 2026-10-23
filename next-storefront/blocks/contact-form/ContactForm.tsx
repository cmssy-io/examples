import { fields, type BlockProps } from "@cmssy/react";
import { ContactFormFields } from "./ContactFormFields";
import styles from "./ContactForm.module.css";

export const contactFormProps = {
  heading: fields.text({ label: "Heading" }),
  text: fields.textarea({ label: "Text" }),
  form: fields.form({ label: "Form", required: true }),
};

export default function ContactForm({
  content,
  context,
}: BlockProps<typeof contactFormProps>) {
  const form = content.form ? context?.forms?.[content.form] : undefined;
  if (!form || !context) return null;

  return (
    <section className={styles.section}>
      {content.heading ? (
        <h2 className={styles.heading}>{content.heading}</h2>
      ) : null}
      {content.text ? <p className="shop-muted">{content.text}</p> : null}
      <ContactFormFields
        form={form}
        locale={{
          locale: context.locale.current,
          defaultLocale: context.locale.default,
        }}
      />
    </section>
  );
}
