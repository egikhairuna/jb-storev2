import React from "react";

interface StockBadgeProps {
  stock: number;
}

export const StockBadge = React.memo(({ stock }: StockBadgeProps) => {
  const isOutOfStock = stock <= 0;
  const isLowStock = stock > 0 && stock <= 5;

  if (isOutOfStock) {
    return (
      <span className="text-red-400 text-[11px] font-semibold uppercase">
        Sold Out
      </span>
    );
  }

  if (isLowStock) {
    return (
      <span className="text-amber-400 text-[11px] font-semibold uppercase">
        Low Stock: {stock}
      </span>
    );
  }

  return (
    <span className="text-green-400 text-[11px] font-semibold uppercase">
      In Stock: {stock}
    </span>
  );
});


StockBadge.displayName = "StockBadge";
