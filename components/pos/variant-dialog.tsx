import React from "react";
import { X } from "lucide-react";
import type { Product } from "@/types/pos";
import { CURRENCY } from "@/lib/constants";
import { StockBadge } from "./stock-badge";

interface VariantDialogProps {
  product: Product | null;
  onClose: () => void;
  onSelect: (productId: string, variantId: string) => void;
}

export const VariantDialog = ({ product, onClose, onSelect }: VariantDialogProps) => {
  if (!product) return null;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: CURRENCY,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price).replace("Rp", "Rp ");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-[480px] rounded-2xl bg-white shadow-2xl flex flex-col max-h-[80vh] overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{product.name}</h2>
            <p className="text-xs text-gray-400">Select Variant</p>
          </div>
          <button 
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Variant List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 gap-3">
            {[...(product.variants ?? [])]
              .sort((a, b) => {
                if (a.stock === 0 && b.stock > 0) return 1;
                if (a.stock > 0 && b.stock === 0) return -1;
                return 0;
              })
              .map((variant) => {
                const isOutOfStock = variant.stock <= 0;
                return (
                  <button
                    key={variant.id}
                    disabled={isOutOfStock}
                    onClick={() => onSelect(product.id, variant.id)}
                    className={`relative flex flex-col gap-2 rounded-xl border p-3 text-left transition-all duration-150 ${
                      isOutOfStock 
                        ? "opacity-100 bg-gray-50 border-gray-100 cursor-not-allowed pointer-events-none" 
                        : "bg-gray-500 border-gray-100 hover:bg-black hover:border-blue-300 cursor-pointer"
                    }`}
                  >
                    {isOutOfStock && (
                      <span className="absolute top-2 right-2 bg-[#FF2C2C] text-white text-[10px] font-semibold px-1.5 py-0.5 rounded">
                        Sold Out
                      </span>
                    )}
                    <span className={`text-sm font-medium line-clamp-1 ${isOutOfStock ? "text-gray-400" : "text-white"}`}>
                      {variant.name.replace(product.name, "").replace(/^[\s—-]+/, "") || variant.name}
                    </span>
                    <div className="mt-auto flex flex-col gap-1.5">
                      <span className={`font-mono text-sm font-semibold [font-feature-settings:'tnum'] ${isOutOfStock ? "text-gray-400" : "text-white"}`}>
                        {formatPrice(variant.price)}
                      </span>
                      {!isOutOfStock && <StockBadge stock={variant.stock} />}
                    </div>
                  </button>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
};
