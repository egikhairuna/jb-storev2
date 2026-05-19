"use client";

import React, { useRef } from "react";
import { QrCode } from "lucide-react";
import { useBarcodeStore } from "@/lib/store/barcode-store";
import { BarcodeLabel } from "./label";
import { PrintButton } from "./print-button";

export const BarcodePreview = () => {
  const { items } = useBarcodeStore();
  const printRef = useRef<HTMLDivElement>(null);

  const totalLabelCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="flex-1 flex flex-col h-full bg-transparent min-w-0">
      {/* Header Bar */}
      <div 
        style={{
          background: 'rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        }}
        className="h-14 px-6 flex items-center justify-between shrink-0"
      >
        <div className="flex flex-col">
          <h2 className="text-sm font-semibold text-white/90">Preview Label</h2>
          <p className="text-[11px] text-white/40 uppercase tracking-widest">
            {totalLabelCount} Ready to Print
          </p>
        </div>
        <PrintButton contentRef={printRef} />
      </div>

      {/* Preview Area */}
      <div className="flex-1 overflow-y-auto p-8 flex justify-center scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/20">
        {items.length > 0 ? (
          <div 
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(30px)',
              WebkitBackdropFilter: 'blur(30px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            }}
            className="inline-block p-10 rounded-2xl h-fit"
          >
            <div 
              ref={printRef}
              className="print-area bg-white p-4 rounded-lg shadow-2xl"
              style={{ 
                display: "grid", 
                gridTemplateColumns: "repeat(2, 50mm)", 
                gap: "3.5mm", 
                width: "fit-content" 
              }}
            >
              {items.flatMap((item, itemIdx) => 
                Array.from({ length: item.quantity }, (_, i) => (
                  <BarcodeLabel key={`${item.id}-${item.variantId || "base"}-${itemIdx}-${i}`} item={item} />
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <QrCode className="h-16 w-16 text-white/5 mb-4" />
            <p className="text-sm text-white/20 uppercase tracking-widest max-w-[200px]">Choose product from sidebar to start</p>
          </div>
        )}
      </div>
    </div>
  );
};
