"use client";

import React from "react";
import { BarcodeSvg } from "./barcode-svg";

interface BarcodeLabelProps {
  name: string;
  sku: string;
  price: number;
}

export const BarcodeLabel = ({ name, sku, price }: BarcodeLabelProps) => {
  const formattedPrice = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  })
    .format(price)
    .replace("Rp", "Rp");

  return (
    <div
      className="flex flex-col items-center justify-center p-1 w-[50mm] h-[30mm] bg-white text-black overflow-hidden box-border mx-auto border border-gray-200 print:border-none print:break-inside-avoid"
    >
      {/* Product Name */}
      <div className="text-[10px] font-medium leading-tight line-clamp-2 text-center w-full px-1">
        {name}
      </div>

      {/* Barcode SVG */}
      <div className="flex-1 w-full flex items-center justify-center overflow-hidden">
        <BarcodeSvg value={sku} width={1.1} height={70} className="w-full" />
      </div>

      {/* Bottom Row: SKU left, Price right */}
      <div className="flex justify-between items-center w-full">
        <span className="text-[10px] font-normal text-gray-600">
          {sku || "NO SKU"}
        </span>
        <span className="text-[12px] font-bold">
          {formattedPrice}
        </span>
      </div>
    </div>
  );
};
