import type { ProductMedia } from "../../services/catalog";
import styles from "./product-detail.module.css";

function fileName(url: string): string {
  try {
    const last = new URL(url).pathname.split("/").pop() ?? "";
    return decodeURIComponent(last) || url;
  } catch {
    return url;
  }
}

function FileIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
    </svg>
  );
}

export function ProductDocuments({
  documents,
  title,
}: {
  documents: ProductMedia[];
  title: string;
}) {
  if (documents.length === 0) return null;

  return (
    <section className={styles.documentsSection} data-product-documents>
      <h2 className={styles.sectionTitle}>{title}</h2>
      <ul className={styles.documents}>
        {documents.map((document, index) => (
          <li key={`${document.url}#${index}`}>
            <a
              href={document.url}
              target="_blank"
              rel="noreferrer"
              className={styles.document}
            >
              <FileIcon />
              <span>{document.alt ?? fileName(document.url)}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
