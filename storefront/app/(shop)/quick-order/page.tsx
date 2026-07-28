import { QuickOrder } from "@/components/shop/quick-order";
import { shopLocale } from "@/lib/locale";
import { copyFor } from "@/lib/shop-copy";

export async function generateMetadata() {
  const { locale } = await shopLocale();
  return { title: `${copyFor(locale).quickOrder} - MACHTEC` };
}

export default async function QuickOrderPage() {
  const { locale } = await shopLocale();
  const copy = copyFor(locale);

  return (
    <>
      <h1 style={{ marginTop: 0 }}>{copy.quickOrder}</h1>
      <p className="shop-muted">{copy.quickOrderIntro}</p>
      <QuickOrder />
    </>
  );
}
