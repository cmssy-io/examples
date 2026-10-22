import type { ShopCopy } from "@/lib/shop-copy";
import { reverseChargeNote, type TaxTreatmentView } from "@/lib/tax-treatment";
import styles from "./order.module.css";

export function ReverseChargeNotice({
  treatment,
  copy,
}: {
  treatment: TaxTreatmentView | null | undefined;
  copy: ShopCopy;
}) {
  const notice = reverseChargeNote(treatment, copy);
  if (!notice) return null;
  return (
    <div className={styles.reverseCharge} role="note">
      <strong>{copy.reverseCharge}</strong>
      <span>{notice.note}</span>
      {notice.buyerVatId ? (
        <span>
          {copy.buyerVatId}: {notice.buyerVatId}
        </span>
      ) : null}
    </div>
  );
}
