import { defineBlock } from "@cmssy/react";
import Testimonials, { testimonialsProps } from "./Testimonials";

export const testimonialsBlock = defineBlock({
  type: "testimonials",
  label: "Testimonials",
  component: Testimonials,
  props: testimonialsProps,
});
