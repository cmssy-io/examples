import { defineBlock } from "@cmssy/react";
import StatsBand, { statsBandProps } from "./StatsBand";

export const statsBandBlock = defineBlock({
  type: "stats-band",
  label: "Stats band",
  component: StatsBand,
  props: statsBandProps,
});
