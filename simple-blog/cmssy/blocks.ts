import { heroBlock } from "@/blocks/hero/block";
import { proseBlock } from "@/blocks/prose/block";
import { blogIndexBlock } from "@/blocks/blog-index/block";
import { testimonialsBlock } from "@/blocks/testimonials/block";

// The single source of truth for which blocks this site can render. The editor
// reads each block's schema over the SDK bridge, so they appear in the picker.
export const blocks = [
  heroBlock,
  proseBlock,
  blogIndexBlock,
  testimonialsBlock,
];
