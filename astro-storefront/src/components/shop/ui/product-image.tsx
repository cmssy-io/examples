import type { CSSProperties } from "react";
import { ImagePlaceholder } from "./image-placeholder";
import styles from "./image-placeholder.module.css";

export function ProductImage({
  src,
  code,
  alt,
  className,
  codeSize,
  style,
}: {
  src: string | null | undefined;
  code: string;
  alt?: string;
  className?: string;
  codeSize?: number;
  style?: CSSProperties;
}) {
  if (!src) {
    return (
      <ImagePlaceholder
        code={code}
        className={className}
        codeSize={codeSize}
        style={style}
      />
    );
  }
  return (
    <img
      src={src}
      alt={alt ?? ""}
      loading="lazy"
      className={[styles.img, className].filter(Boolean).join(" ")}
      style={style}
    />
  );
}
