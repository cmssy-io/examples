import { defineBlock } from "@cmssy/react";
import ValueProps, { valuePropsProps } from "./ValueProps";

export const valuePropsBlock = defineBlock({
  type: "value-props",
  label: "Value props",
  component: ValueProps,
  props: valuePropsProps,
});
