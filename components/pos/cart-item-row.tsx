import React from "react";
import { Trash2, Minus, Plus } from "lucide-react";
import type { CartItem } from "@/types/pos";
import { CURRENCY } from "@/lib/constants";

interface CartItemRowProps {
  item: CartItem;
  onQtyChange: (productId: string, qty: number, variantId?: string) => void;
  onRemove: (productId: string, variantId?: string) => void;
}

export const CartItemRow = ({ item, onQtyChange, onRemove }: CartItemRowProps) => {
  const maxStock = item.stock;

  const formattedLineTotal = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: CURRENCY,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(item.price * item.quantity).replace("Rp", "Rp ");

  return (
    <div 
      style={{
        background: 'rgba(255, 255, 255, 0.84)',
        border: '1px solid rgba(123, 123, 123, 0.8)',
      }}
      className="flex flex-col gap-2 p-3.5 mb-2 rounded-xl hover:bg-white/[0.1] hover:border-white/15 transition-all duration-200"
    >
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-black line-clamp-1 leading-tight">
            {item.name}
          </h4>
          {item.variantName && (
            <p className="text-[11px] text-black mt-0.5">{item.variantName}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => onRemove(item.id, item.variantId)}
          className="text-black hover:text-red-400 transition-colors"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onQtyChange(item.id, item.quantity - 1, item.variantId)}
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(0, 0, 0, 1)' }}
            className="flex h-7 w-7 items-center justify-center rounded-md text-black hover:bg-white/20 transition-colors"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <input
            type="number"
            min="1"
            max={maxStock}
            value={item.quantity}
            onChange={(e) => onQtyChange(item.id, parseInt(e.target.value) || 1, item.variantId)}
            className="w-10 bg-transparent text-center font-mono text-sm font-medium text-black focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [font-feature-settings:'tnum']"
          />
          <button
            type="button"
            onClick={() => onQtyChange(item.id, item.quantity + 1, item.variantId)}
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(0, 0, 0, 1)' }}
            className="flex h-7 w-7 items-center justify-center rounded-md text-black hover:bg-white/20 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        <span className="font-mono text-sm font-semibold text-black [font-feature-settings:'tnum']">
          {formattedLineTotal}
        </span>
      </div>
    </div>
  );
};

