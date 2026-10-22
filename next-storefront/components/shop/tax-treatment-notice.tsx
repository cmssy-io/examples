import type { ShopCopy } from "@/lib/shop-copy";
import { taxTreatmentNote, type TaxTreatmentView } from "@/lib/tax-treatment";
import styles from "./order.module.css";

export function TaxTreatmentNotice({
  treatment,
  copy,
}: {
  treatment: TaxTreatmentView | null | undefined;
  copy: ShopCopy;
}) {
  const notice = taxTreatmentNote(treatment, copy);
  if (!notice) return null;
  return (
    <div className={styles.taxTreatment} role="note">
      <strong>{notice.title}</strong>
      <span>{notice.note}</span>
      {notice.buyerVatId ? (
        <span>
          {copy.buyerVatId}: {notice.buyerVatId}
        </span>
      ) : null}
    </div>
  );
}
