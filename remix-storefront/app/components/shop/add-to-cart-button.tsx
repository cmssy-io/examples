import { useState } from "react";
import { useCart } from "./cart-provider";
import { useCartUi } from "./cart-ui";
import { useShopCopy } from "./locale-ui";
import { Button } from "./ui/button";

export function AddToCartButton({
  recordId,
  name,
  label,
}: {
  recordId: string;
  name: string;
  label?: string;
}) {
  const copy = useShopCopy();
  const { addToCart } = useCart();
  const { announceAdded } = useCartUi();
  const [adding, setAdding] = useState(false);

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={adding}
      onClick={async () => {
        setAdding(true);
        try {
          await addToCart(recordId, 1);
          announceAdded(name);
        } finally {
          setAdding(false);
        }
      }}
    >
      {adding ? copy.adding : (label ?? copy.add)}
    </Button>
  );
}
