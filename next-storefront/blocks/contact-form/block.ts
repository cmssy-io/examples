import { defineBlock } from "@cmssy/react";
import ContactForm, { contactFormProps } from "./ContactForm";

export const contactFormBlock = defineBlock({
  type: "contact-form",
  label: "Contact form",
  component: ContactForm,
  props: contactFormProps,
});
