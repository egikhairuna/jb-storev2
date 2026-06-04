"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ReportRow, ReportSummary } from "@/types/pos";

interface ReportsResponse {
  success: boolean;
  data: ReportRow[];
  summary: ReportSummary;
  period: { start: string; end: string };
}

export function useReports() {
  const [period, setPeriod] = useState<"7d" | "30d" | "month" | "custom">(
    "7d"
  );
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [source, setSource] = useState<"all" | "pos" | "website">("all");
  const [enabled, setEnabled] = useState(false);

  const query = useQuery<ReportsResponse>({
    queryKey: ["reports", period, customStart, customEnd],
    queryFn: async () => {
      const params = new URLSearchParams({ period });
      if (period === "custom") {
        if (customStart) params.set("start", customStart);
        if (customEnd) params.set("end", customEnd);
      }
      const res = await fetch("/api/reports?" + params.toString());
      if (!res.ok) throw new Error("Failed to fetch reports");
      return res.json();
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  // Client-side source filtering
  const filteredRows = useMemo(() => {
    if (!query.data?.data) return [];
    if (source === "all") return query.data.data;
    return query.data.data.filter((r) =>
      source === "pos" ? r.sumber === "POS" : r.sumber === "Website"
    );
  }, [query.data, source]);

  // Recompute summary based on filtered rows
  const filteredSummary = useMemo((): ReportSummary | undefined => {
    if (!query.data?.summary) return undefined;
    if (source === "all") return query.data.summary;

    const rows = filteredRows;
    const uniqueOrderIds = new Set(rows.map((r) => r.orderId));
    const totalCash = rows.reduce((sum, r) => sum + (r.cash || 0), 0);
    const totalTransfer = rows.reduce((sum, r) => sum + (r.transfer || 0), 0);

    return {
      totalOrders: uniqueOrderIds.size,
      totalItems: rows.length,
      totalCash: Math.round(totalCash),
      totalTransfer: Math.round(totalTransfer),
      totalRevenue: Math.round(totalCash + totalTransfer),
      posOrders:
        source === "pos"
          ? uniqueOrderIds.size
          : 0,
      wcOrders:
        source === "website"
          ? uniqueOrderIds.size
          : 0,
    };
  }, [filteredRows, query.data?.summary, source]);

  return {
    rows: filteredRows,
    summary: filteredSummary,
    rawPeriod: query.data?.period,
    period,
    setPeriod,
    customStart,
    setCustomStart,
    customEnd,
    setCustomEnd,
    source,
    setSource,
    load: () => {
      setEnabled(true);
      // Force refetch even if already enabled
      setTimeout(() => query.refetch(), 0);
    },
    isLoading: query.isFetching,
    isError: query.isError,
  };
}
