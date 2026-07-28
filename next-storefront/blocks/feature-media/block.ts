import { defineBlock } from "@cmssy/react";
import FeatureMedia, { featureMediaProps } from "./FeatureMedia";

export const featureMediaBlock = defineBlock({
  type: "feature-media",
  label: "Feature with media",
  component: FeatureMedia,
  props: featureMediaProps,
});
