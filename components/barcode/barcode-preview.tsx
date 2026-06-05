"use client";

import React, { useRef } from "react";
import { Trash2, QrCode } from "lucide-react";
import { useBarcodeStore } from "@/lib/store/barcode-store";
import { BarcodeLabel } from "./label";
import { PrintButton } from "./print-button";

export const BarcodePreview = () => {
  const { items, clearAll } = useBarcodeStore();
  const printRef = useRef<HTMLDivElement>(null);

  const totalLabels = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header Row */}
      <div
        className="h-14 px-6 flex items-center justify-between shrink-0"
        style={{
          background: "rgba(255,255,255,0.05)",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <div className="flex flex-col">
          <h2 className="text-sm font-semibold text-white/90">Live Preview</h2>
          <p className="text-[10px] text-white/40 font-mono mt-0.5">
            Layout: 50mm × 30mm (2 Columns)
          </p>
        </div>

        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <button
              onClick={clearAll}
              className="h-9 px-3 rounded-lg text-xs font-medium flex items-center gap-1.5 text-red-400 transition-all duration-200 hover:bg-red-500/15"
              style={{
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.2)",
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear All
            </button>
          )}
          <PrintButton contentRef={printRef} />
        </div>
      </div>

      {/* Preview Area */}
      <div className="flex-1 overflow-y-auto p-6 flex justify-center scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/20">
        {items.length > 0 ? (
          <div className="h-fit">
            {/* Glass card wrapper */}
            <div
              className="p-8 rounded-2xl"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {/* Print container */}
              <div ref={printRef} style={{ width: "102mm" }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, 50mm)",
                    width: "105mm",
                    margin: "0 auto",
                    gap: "3.5mm",
                  }}
                >
                  {items.flatMap((item) =>
                    Array.from({ length: item.quantity }, (_, i) => (
                      <div
                        key={`${item.id}-${item.variantId || "base"}-${i}`}
                        className="w-[50mm] h-[30mm] overflow-hidden"
                      >
                        <BarcodeLabel
                          name={item.variantName || item.productName}
                          sku={item.sku}
                          price={item.price}
                        />
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Footer: total labels */}
              <p className="text-center text-[10px] text-white/30 mt-4 font-mono">
                Total Labels: {totalLabels}
              </p>
            </div>
          </div>
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center h-full text-center">
            <QrCode className="h-16 w-16 text-white/5 mb-4" />
            <p className="text-sm text-white/20 uppercase tracking-widest max-w-[200px]">
              Preview area empty
            </p>
            <p className="text-xs text-white/10 mt-1">
              Add products from the sidebar
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
