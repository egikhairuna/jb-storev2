"use client";

import React from "react";
import { BarcodeItem } from "@/types/pos";
import { BarcodeSvg } from "./barcode-svg";

interface BarcodeLabelProps {
  item: BarcodeItem;
}

export const BarcodeLabel = ({ item }: BarcodeLabelProps) => {
  const formattedPrice = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(item.price);

  const displayName = item.variantName 
    ? `${item.productName} · ${item.variantName}`
    : item.productName;

  return (
    <div 
      className="bg-white text-black overflow-hidden flex flex-col border border-gray-200 rounded-sm p-1 print:border-none print:break-inside-avoid print:shadow-none"
      style={{ width: "50mm", height: "30mm" }}
    >
      {/* Row 1: Product Name */}
      <div className="text-[9px] font-medium leading-tight line-clamp-1">
        {displayName}
      </div>

      {/* Row 2: Barcode */}
      <div className="flex-1 w-full flex items-center justify-center overflow-hidden py-0.5">
        <BarcodeSvg value={item.sku} />
      </div>

      {/* Row 3: Footer */}
      <div className="flex justify-between items-center mt-auto">
        <span className="text-[8px] font-mono text-gray-500 uppercase">
          {item.sku || "NO SKU"}
        </span>
        <span className="text-[10px] font-mono font-bold">
          {formattedPrice}
        </span>
      </div>
    </div>
  );
};
