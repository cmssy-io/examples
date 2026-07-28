"use client";

import { useState } from "react";
import { Badge } from "./ui/badge";
import { ProductImage } from "./ui/product-image";
import styles from "./product-detail.module.css";

export function ProductGallery({
  images,
  code,
  alt,
  outOfStock,
  outOfStockLabel,
}: {
  images: string[];
  code: string;
  alt: string;
  outOfStock?: boolean;
  outOfStockLabel?: string;
}) {
  const [active, setActive] = useState(0);
  const current = images[active];

  return (
    <div className={styles.gallery}>
      <div className={styles.galleryMain}>
        {outOfStock ? (
          <span className={styles.heroBadge}>
            <Badge variant="destructive">{outOfStockLabel}</Badge>
          </span>
        ) : null}
        <ProductImage
          src={current}
          code={code}
          alt={alt}
          className={styles.heroImg}
          codeSize={72}
        />
      </div>
      {images.length > 1 ? (
        <div className={styles.thumbs}>
          {images.map((src, index) => (
            <button
              key={src}
              type="button"
              className={`${styles.thumb} ${
                index === active ? styles.thumbActive : ""
              }`}
              onClick={() => setActive(index)}
              aria-label={`${alt} - view ${index + 1}`}
            >
              <ProductImage src={src} code={code} className={styles.thumbImg} />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
