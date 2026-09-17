import { fields, type BlockProps } from "@cmssy/react";

export const proseProps = {
  body: fields.richText({ label: "Body" }),
};

export function Prose({
  data,
}: BlockProps<typeof proseProps, { html: string }>) {
  if (!data?.html) return null;
  return <div dangerouslySetInnerHTML={{ __html: data.html }} />;
}
