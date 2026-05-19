"use client";

import React from "react";
import { Printer } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import { useBarcodeStore } from "@/lib/store/barcode-store";

interface PrintButtonProps {
  contentRef: React.RefObject<HTMLDivElement | null>;
}

export const PrintButton = ({ contentRef }: PrintButtonProps) => {
  const { items } = useBarcodeStore();
  const handlePrint = useReactToPrint({
    contentRef: contentRef,
    documentTitle: "Barcode Labels",
  });

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%;
            height: auto;
          }
          @page { 
            size: auto; 
            margin: 0mm; 
          }
          /* Ensure grid prints correctly */
          .print-area {
            display: grid !important;
            grid-template-columns: repeat(2, 50mm) !important;
            gap: 3.5mm !important;
            padding: 10mm !important;
          }
        }
      `}</style>
      <button
        onClick={() => handlePrint()}
        disabled={items.length === 0}
        className="h-10 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all shadow-sm shadow-blue-600/10 disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none disabled:cursor-not-allowed"
      >
        <Printer className="h-4 w-4" />
        Print Label
      </button>
    </>
  );
};
