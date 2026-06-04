"use client";

import { useState } from "react";
import { FileText, Table, Download, Loader2 } from "lucide-react";
import { exportCSV, exportExcel, exportPDF } from "@/lib/reports/export";
import type { ReportRow, ReportSummary } from "@/types/pos";

interface ExportButtonsProps {
  rows: ReportRow[];
  summary: ReportSummary | undefined;
  period: { start: string; end: string } | undefined;
  disabled: boolean;
}

export function ExportButtons({
  rows,
  summary,
  period,
  disabled,
}: ExportButtonsProps) {
  const [loadingType, setLoadingType] = useState<string | null>(null);

  const filename = `laporan-jamesboogie-${new Date().toISOString().slice(0, 10)}`;

  const handleExport = async (
    type: "pdf" | "excel" | "csv"
  ) => {
    if (!rows.length || !summary || !period) return;
    setLoadingType(type);

    try {
      // Small delay to show loading state
      await new Promise((r) => setTimeout(r, 100));

      if (type === "pdf") {
        exportPDF(rows, filename, summary, period);
      } else if (type === "excel") {
        exportExcel(rows, filename);
      } else {
        exportCSV(rows, filename);
      }
    } finally {
      setLoadingType(null);
    }
  };

  const isDisabled = disabled || rows.length === 0;

  return (
    <div className="flex items-center gap-2">
      {/* PDF Button */}
      <button
        onClick={() => handleExport("pdf")}
        disabled={isDisabled || loadingType !== null}
        style={{
          background: isDisabled
            ? "rgba(255,255,255,0.03)"
            : "rgba(239,68,68,0.15)",
          border: `1px solid ${isDisabled ? "rgba(255,255,255,0.05)" : "rgba(239,68,68,0.3)"}`,
        }}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
          isDisabled
            ? "text-white/20 cursor-not-allowed"
            : "text-red-400 hover:bg-red-500/25 hover:border-red-500/40"
        }`}
      >
        {loadingType === "pdf" ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <FileText className="w-3.5 h-3.5" />
        )}
        PDF
      </button>

      {/* Excel Button */}
      <button
        onClick={() => handleExport("excel")}
        disabled={isDisabled || loadingType !== null}
        style={{
          background: isDisabled
            ? "rgba(255,255,255,0.03)"
            : "rgba(34,197,94,0.15)",
          border: `1px solid ${isDisabled ? "rgba(255,255,255,0.05)" : "rgba(34,197,94,0.3)"}`,
        }}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
          isDisabled
            ? "text-white/20 cursor-not-allowed"
            : "text-green-400 hover:bg-green-500/25 hover:border-green-500/40"
        }`}
      >
        {loadingType === "excel" ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Table className="w-3.5 h-3.5" />
        )}
        Excel
      </button>

      {/* CSV Button */}
      <button
        onClick={() => handleExport("csv")}
        disabled={isDisabled || loadingType !== null}
        style={{
          background: isDisabled
            ? "rgba(255,255,255,0.03)"
            : "rgba(255,255,255,0.08)",
          border: `1px solid ${isDisabled ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.15)"}`,
        }}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
          isDisabled
            ? "text-white/20 cursor-not-allowed"
            : "text-white/60 hover:bg-white/12 hover:text-white/80"
        }`}
      >
        {loadingType === "csv" ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Download className="w-3.5 h-3.5" />
        )}
        CSV
      </button>
    </div>
  );
}
