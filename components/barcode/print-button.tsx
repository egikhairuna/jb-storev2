"use client";

import React from "react";
import { Printer } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import { useBarcodeStore } from "@/lib/store/barcode-store";

interface PrintButtonProps {
  contentRef: React.RefObject<HTMLDivElement | null>;
}

const pageStyle = `
@page {
  size: 100mm 30mm;
  margin: 0;
}
body { margin: 0; padding: 0; }
@media print {
  html, body {
    height: auto;
    margin: 0 !important;
    padding: 0 !important;
    overflow: visible;
  }
  .print-page { page-break-after: always; }
  .print-page:last-child { page-break-after: auto; }
}
`;

export const PrintButton = ({ contentRef }: PrintButtonProps) => {
  const { items } = useBarcodeStore();

  const handlePrint = useReactToPrint({
    contentRef,
    documentTitle: "Barcode Labels",
    pageStyle,
  });

  return (
    <button
      onClick={() => handlePrint()}
      disabled={items.length === 0}
      style={{
        background: items.length === 0
          ? "rgba(255,255,255,0.05)"
          : "rgba(59,130,246,0.2)",
        border: items.length === 0
          ? "1px solid rgba(255,255,255,0.08)"
          : "1px solid rgba(59,130,246,0.3)",
      }}
      className="h-9 px-4 rounded-lg text-xs font-medium flex items-center gap-2 transition-all duration-200 disabled:text-white/20 disabled:cursor-not-allowed text-blue-400 hover:bg-blue-500/30"
    >
      <Printer className="h-3.5 w-3.5" />
      Print Labels
    </button>
  );
};
