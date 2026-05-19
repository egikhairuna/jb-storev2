import React from "react";
import { useCartStore } from "@/store/cart.store";
import { CURRENCY, UI_STRINGS } from "@/lib/constants";
import { CartItemRow } from "./cart-item-row";
import { ShoppingCart } from "lucide-react";

interface CartPanelProps {
  onCheckout: () => void;
}

export const CartPanel = ({ onCheckout }: CartPanelProps) => {
  const { items, updateQty, removeItem } = useCartStore();

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const total = subtotal;

  const isEmpty = items.length === 0;

  const formatRupiah = (value: number) => 
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: CURRENCY,
      maximumFractionDigits: 0,
    }).format(value).replace("Rp", "Rp ");

  return (
    <div 
      style={{
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(30px) saturate(160%)',
        WebkitBackdropFilter: 'blur(30px) saturate(160%)',
        borderRight: '1px solid rgba(255,255,255,0.15)',
      }}
      className="flex h-full w-[360px] flex-col"
    >
      <div className="text-white/80 font-semibold px-4 py-3 border-b border-white/10 flex items-center justify-between">
        <span>Cart</span>
        <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full text-white/60">{items.length} Items</span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/20">
        {isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <ShoppingCart className="mb-3 h-10 w-10 text-white/20" />
            <p className="text-sm text-white/40">Cart is empty</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {items.map((item) => (
              <CartItemRow
                key={`${item.id}-${item.variantId || "base"}`}
                item={item}
                onQtyChange={updateQty}
                onRemove={removeItem}
              />
            ))}
          </div>
        )}
      </div>

      <div 
        style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}
        className="px-4 py-3 sticky bottom-0"
      >
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm text-white/50">
            <span>{UI_STRINGS.SUBTOTAL}</span>
            <span className="font-mono text-white/80 [font-feature-settings:'tnum']">{formatRupiah(subtotal)}</span>
          </div>
          
          <div className="flex justify-between text-base font-semibold text-white pt-1">
            <span>Total</span>
            <span className="font-mono [font-feature-settings:'tnum']">{formatRupiah(total)}</span>
          </div>
        </div>

        <button
          type="button"
          disabled={isEmpty}
          onClick={onCheckout}
          style={{
            background: 'rgba(255, 255, 255, 0.2)',
            border: '1px solid rgba(255, 255, 255, 0.35)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.25)',
          }}
          className="w-full h-11 rounded-xl text-white font-semibold relative overflow-hidden transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {/* Shimmer line */}
          <div
            className="absolute top-0 left-0 right-0 h-[1px]"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
            }}
          />
          {UI_STRINGS.PAY}
        </button>
      </div>
    </div>
  );
};

