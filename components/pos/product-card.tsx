import React from "react";
import Image from "next/image";
import { Package } from "lucide-react";
import type { Product } from "@/types/pos";
import { CURRENCY } from "@/lib/constants";
import { StockBadge } from "./stock-badge";

interface ProductCardProps {
  product: Product;
  onAdd: (variantId?: string) => void;
  onOpenVariants: (product: Product) => void;
}

export const ProductCard = React.memo(({ product, onAdd, onOpenVariants }: ProductCardProps) => {
  const isVariable = product.type === 'variable';
  const isSimpleOutOfStock = product.type === 'simple' && product.stock <= 0;
  const allVariantsOutOfStock = isVariable && product.variants?.every(v => v.stock === 0);
  const isFullySoldOut = isSimpleOutOfStock || allVariantsOutOfStock;

  const totalVariants = product.variants?.length || 0;
  const availableVariants = product.variants?.filter(v => v.stock > 0).length || 0;
  const isPartiallyAvailable = isVariable && availableVariants > 0 && availableVariants < totalVariants;

  const handleAction = () => {
    if (isVariable) {
      onOpenVariants(product);
    } else if (!isSimpleOutOfStock) {
      onAdd();
    }
  };

  const formattedPrice = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: CURRENCY,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(product.price).replace("Rp", "Rp ");

  return (
    <button
      type="button"
      onClick={handleAction}
      disabled={isFullySoldOut}
      style={isFullySoldOut ? {
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.08)',
      } : {
        background: 'rgba(255,255,255,0.07)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.12)',
      }}
      className={`group relative flex flex-col overflow-hidden rounded-xl p-0 text-left transition-all duration-150 ${
        isFullySoldOut 
          ? "opacity-60 cursor-not-allowed" 
          : "hover:border-white/30 hover:bg-white/15 hover:shadow-lg cursor-pointer"
      }`}
    >
      <div className="relative aspect-[1/1] w-full overflow-hidden bg-white/5">
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-110"
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-white/10">
            <Package className="h-10 w-10" />
          </div>
        )}

        {isFullySoldOut && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="text-white text-[10px] font-bold tracking-[0.2em] uppercase bg-red-600/80 px-2 py-1 rounded">SOLD OUT</span>
          </div>
        )}
        
        {isVariable && !isFullySoldOut && (
          <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-md text-[9px] font-bold shadow-lg backdrop-blur-md ${
            isPartiallyAvailable
              ? "bg-amber-500/80 text-white"
              : "bg-blue-600/80 text-white"
          }`}>
            {isPartiallyAvailable ? `${availableVariants}/${totalVariants} VARIANTS` : `${totalVariants} VARIANTS`}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <h3 className="text-white/90 text-sm font-medium line-clamp-2 leading-snug">
          {product.name}
        </h3>
        
        <div className="mt-auto flex flex-col gap-1">
          <span className="text-white font-semibold text-sm font-mono [font-feature-settings:'tnum']">
            {formattedPrice}
          </span>
          <div className="flex items-center justify-between mt-1">
            {!isVariable && <StockBadge stock={product.stock} />}
            {isVariable && !allVariantsOutOfStock && (
              <span className="text-[10px] text-white/40 font-semibold uppercase tracking-wider">
                Variant
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
});

ProductCard.displayName = "ProductCard";
