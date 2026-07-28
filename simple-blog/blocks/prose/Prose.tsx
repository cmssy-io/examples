import { fields, type BlockProps } from "@cmssy/react";
import styles from "./Prose.module.css";

export const proseProps = {
  body: fields.richText({ label: "Body" }),
};

export default function Prose({
  data,
}: BlockProps<typeof proseProps, { html: string }>) {
  if (!data?.html) return null;
  return (
    <div
      className={styles.prose}
      dangerouslySetInnerHTML={{ __html: data.html }}
    />
  );
}
