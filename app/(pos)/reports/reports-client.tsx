"use client";

import { BarChart2, RefreshCw, Search } from "lucide-react";
import { SidebarNav } from "@/components/pos/sidebar-nav";
import { ExportButtons } from "@/components/reports/export-buttons";
import { useReports } from "@/hooks/use-reports";

function formatRp(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  })
    .format(amount)
    .replace("Rp", "Rp ");
}

const PERIOD_TABS = [
  { key: "7d" as const, label: "7 Hari" },
  { key: "30d" as const, label: "30 Hari" },
  { key: "month" as const, label: "Bulan Ini" },
  { key: "custom" as const, label: "Custom" },
];

const SOURCE_TABS = [
  { key: "all" as const, label: "Semua" },
  { key: "pos" as const, label: "POS" },
  { key: "website" as const, label: "Website" },
];

export default function ReportsPage() {
  const {
    rows,
    summary,
    rawPeriod,
    period,
    setPeriod,
    customStart,
    setCustomStart,
    customEnd,
    setCustomEnd,
    source,
    setSource,
    load,
    isLoading,
  } = useReports();

  const periodLabel =
    period === "7d"
      ? "7 hari terakhir"
      : period === "30d"
        ? "30 hari terakhir"
        : period === "month"
          ? "bulan ini"
          : "custom";

  return (
    <div className="flex h-screen w-full overflow-hidden bg-neutral-950 text-white">
      <SidebarNav />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header Bar */}
        <header
          style={{
            background: "rgba(255,255,255,0.05)",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
          }}
          className="h-14 px-6 flex items-center justify-between shrink-0"
        >
          <div className="flex items-center gap-3">
            <BarChart2 className="w-5 h-5 text-white/40" />
            <div>
              <h1 className="text-sm font-bold tracking-tight">
                Laporan Penjualan
              </h1>
              <div className="text-white/40 text-[10px] font-mono mt-0.5">
                {summary
                  ? `${summary.totalItems} transaksi · ${periodLabel}`
                  : `Pilih periode · ${periodLabel}`}
              </div>
            </div>
          </div>

          <ExportButtons
            rows={rows}
            summary={summary}
            period={rawPeriod}
            disabled={!rows.length}
          />
        </header>

        {/* Filter Bar */}
        <div
          style={{
            background: "rgba(255,255,255,0.02)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
          className="px-6 py-3 flex items-center gap-4 shrink-0 flex-wrap"
        >
          {/* Period Tabs */}
          <div className="flex items-center rounded-lg overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
            {PERIOD_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setPeriod(tab.key)}
                className={`px-3 py-1.5 text-xs font-medium transition-all duration-150 ${
                  period === tab.key
                    ? "bg-white/15 text-white"
                    : "text-white/40 hover:text-white/70 hover:bg-white/5"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Custom Date Range */}
          {period === "custom" && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  colorScheme: "dark",
                }}
                className="px-2.5 py-1.5 rounded-lg text-xs text-white/70 outline-none focus:border-white/25 transition-all"
              />
              <span className="text-white/20 text-xs">—</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  colorScheme: "dark",
                }}
                className="px-2.5 py-1.5 rounded-lg text-xs text-white/70 outline-none focus:border-white/25 transition-all"
              />
            </div>
          )}

          {/* Source Filter */}
          <div className="flex items-center rounded-lg overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
            {SOURCE_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setSource(tab.key)}
                className={`px-3 py-1.5 text-xs font-medium transition-all duration-150 ${
                  source === tab.key
                    ? "bg-white/15 text-white"
                    : "text-white/40 hover:text-white/70 hover:bg-white/5"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Load Button */}
          <button
            onClick={load}
            disabled={isLoading}
            style={{
              background: isLoading
                ? "rgba(59,130,246,0.1)"
                : "rgba(59,130,246,0.2)",
              border: "1px solid rgba(59,130,246,0.3)",
            }}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium text-blue-400 hover:bg-blue-500/30 transition-all duration-200 disabled:opacity-60 ml-auto"
          >
            {isLoading ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Search className="w-3.5 h-3.5" />
            )}
            {isLoading ? "Memuat..." : "Muat Data"}
          </button>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="px-6 py-3 grid grid-cols-4 gap-3 shrink-0">
            {/* Total Transaksi */}
            <div
              style={{
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
              className="rounded-xl p-4"
            >
              <div className="text-[10px] text-white/40 uppercase tracking-wider font-medium mb-1">
                Total Transaksi
              </div>
              <div className="text-xl font-bold font-mono text-white">
                {summary.totalOrders}
              </div>
              <div className="text-[10px] text-white/30 mt-1 font-mono">
                POS: {summary.posOrders} · Web: {summary.wcOrders}
              </div>
            </div>

            {/* Total Cash */}
            <div
              style={{
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
              className="rounded-xl p-4"
            >
              <div className="text-[10px] text-white/40 uppercase tracking-wider font-medium mb-1">
                Total Cash
              </div>
              <div className="text-xl font-bold font-mono text-green-400">
                {formatRp(summary.totalCash)}
              </div>
            </div>

            {/* Total Transfer */}
            <div
              style={{
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
              className="rounded-xl p-4"
            >
              <div className="text-[10px] text-white/40 uppercase tracking-wider font-medium mb-1">
                Total Transfer
              </div>
              <div className="text-xl font-bold font-mono text-blue-400">
                {formatRp(summary.totalTransfer)}
              </div>
            </div>

            {/* Total Pendapatan */}
            <div
              style={{
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
              className="rounded-xl p-4"
            >
              <div className="text-[10px] text-white/40 uppercase tracking-wider font-medium mb-1">
                Total Pendapatan
              </div>
              <div className="text-xl font-bold font-mono text-white">
                {formatRp(summary.totalRevenue)}
              </div>
            </div>
          </div>
        )}

        {/* Data Table */}
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            /* Loading Skeleton */
            <div className="px-6">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-neutral-900/95 backdrop-blur-md z-10">
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    {[
                      "NO",
                      "TANGGAL",
                      "SUMBER",
                      "ORDER ID",
                      "SKU",
                      "NAMA PRODUK",
                      "QTY",
                      "HARGA BARANG",
                      "TRANSFER",
                      "CASH",
                      "OTHERS",
                      "DISKON",
                      "ONGKIR",
                      "KODE UNIK",
                      "CUSTOMER",
                      "NO HP",
                      "ALAMAT",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-3 py-3 text-[10px] font-bold text-white/30 uppercase tracking-[0.15em]"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <tr
                      key={i}
                      style={{
                        borderBottom: "1px solid rgba(255,255,255,0.04)",
                      }}
                    >
                      {Array.from({ length: 17 }).map((_, j) => (
                        <td key={j} className="px-3 py-3">
                          <div
                            className="h-4 rounded animate-pulse"
                            style={{
                              background: "rgba(255,255,255,0.06)",
                              width: j === 5 ? "120px" : j === 0 ? "20px" : "60px",
                            }}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : rows.length === 0 ? (
            /* Empty State */
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <BarChart2 className="w-12 h-12 text-white/10 mb-4" />
              <p className="text-white/30 font-medium text-sm">
                Pilih periode dan klik Muat Data
              </p>
              <p className="text-white/20 text-xs mt-1">
                untuk menampilkan laporan penjualan
              </p>
            </div>
          ) : (
            /* Data Table */
            <div className="px-6 min-w-[1600px]">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-neutral-900/95 backdrop-blur-md z-10">
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <th className="px-3 py-3 text-[10px] font-bold text-white/30 uppercase tracking-[0.15em] w-10">
                      NO
                    </th>
                    <th className="px-3 py-3 text-[10px] font-bold text-white/30 uppercase tracking-[0.15em] w-36">
                      TANGGAL
                    </th>
                    <th className="px-3 py-3 text-[10px] font-bold text-white/30 uppercase tracking-[0.15em] w-20">
                      SUMBER
                    </th>
                    <th className="px-3 py-3 text-[10px] font-bold text-white/30 uppercase tracking-[0.15em] w-24">
                      ORDER ID
                    </th>
                    <th className="px-3 py-3 text-[10px] font-bold text-white/30 uppercase tracking-[0.15em] w-28">
                      SKU
                    </th>
                    <th className="px-3 py-3 text-[10px] font-bold text-white/30 uppercase tracking-[0.15em]">
                      NAMA PRODUK
                    </th>
                    <th className="px-3 py-3 text-[10px] font-bold text-white/30 uppercase tracking-[0.15em] w-12">
                      QTY
                    </th>
                    <th className="px-3 py-3 text-[10px] font-bold text-white/30 uppercase tracking-[0.15em] w-28">
                      HARGA BARANG
                    </th>
                    <th className="px-3 py-3 text-[10px] font-bold text-white/30 uppercase tracking-[0.15em] w-28">
                      TRANSFER
                    </th>
                    <th className="px-3 py-3 text-[10px] font-bold text-white/30 uppercase tracking-[0.15em] w-28">
                      CASH
                    </th>
                    <th className="px-3 py-3 text-[10px] font-bold text-white/30 uppercase tracking-[0.15em] w-28">
                      OTHERS
                    </th>
                    <th className="px-3 py-3 text-[10px] font-bold text-white/30 uppercase tracking-[0.15em] w-24">
                      DISKON
                    </th>
                    <th className="px-3 py-3 text-[10px] font-bold text-white/30 uppercase tracking-[0.15em] w-24">
                      ONGKIR
                    </th>
                    <th className="px-3 py-3 text-[10px] font-bold text-white/30 uppercase tracking-[0.15em] w-24">
                      KODE UNIK
                    </th>
                    <th className="px-3 py-3 text-[10px] font-bold text-white/30 uppercase tracking-[0.15em] w-32">
                      CUSTOMER
                    </th>
                    <th className="px-3 py-3 text-[10px] font-bold text-white/30 uppercase tracking-[0.15em] w-28">
                      NO HP
                    </th>
                    <th className="px-3 py-3 text-[10px] font-bold text-white/30 uppercase tracking-[0.15em] w-48">
                      ALAMAT
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={`${row.orderId}-${row.no}`}
                      className="group hover:bg-white/5 transition-colors"
                      style={{
                        borderBottom: "1px solid rgba(255,255,255,0.04)",
                        background:
                          row.sumber === "Website"
                            ? "rgba(139,92,246,0.05)"
                            : undefined,
                      }}
                    >
                      <td className="px-3 py-2.5 text-xs text-white/40 font-mono">
                        {row.no}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-white/60 font-mono whitespace-nowrap">
                        {row.tanggal}
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`text-xs px-2 py-0.5 rounded font-medium ${
                            row.sumber === "POS"
                              ? "bg-blue-500/20 text-blue-400"
                              : "bg-purple-500/20 text-purple-400"
                          }`}
                        >
                          {row.sumber}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-white/60 font-mono">
                        {row.orderId}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-white/50 font-mono">
                        {row.sku}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-white/70 truncate max-w-[200px]">
                        {row.productName}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-white/60 font-mono text-center">
                        {row.qty}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-white/80 font-mono">
                        {formatRp(row.hargaBarang)}
                      </td>
                      <td className="px-3 py-2.5 text-xs font-mono">
                        {row.transfer != null ? (
                          <span className="text-blue-400">
                            {formatRp(row.transfer)}
                          </span>
                        ) : (
                          <span className="text-white/20">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-xs font-mono">
                        {row.cash != null ? (
                          <span className="text-green-400">
                            {formatRp(row.cash)}
                          </span>
                        ) : (
                          <span className="text-white/20">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-xs font-mono">
                        {row.others != null ? (
                          <span className="text-purple-400 font-mono">
                            {formatRp(row.others)}
                          </span>
                        ) : (
                          <span className="text-white/20">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-xs font-mono">
                        {row.diskon != null && row.diskon > 0 ? (
                          <span className="text-orange-400">
                            {formatRp(row.diskon)}
                          </span>
                        ) : (
                          <span className="text-white/20">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-xs font-mono">
                        {row.ongkosKirim != null ? (
                          <span className="text-amber-400">
                            {formatRp(row.ongkosKirim)}
                          </span>
                        ) : (
                          <span className="text-white/20">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-xs font-mono text-white/50">
                        {row.kodeUnik || (
                          <span className="text-white/20">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-white/50 truncate max-w-[120px]">
                        {row.customerName || (
                          <span className="text-white/20">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-white/50 font-mono">
                        {row.noHp || (
                          <span className="text-white/20">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-white/40 truncate max-w-[180px]">
                        {row.alamat || (
                          <span className="text-white/20">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer
          style={{
            background: "rgba(0,0,0,0.3)",
            backdropFilter: "blur(10px)",
            borderTop: "1px solid rgba(255,255,255,0.1)",
          }}
          className="h-12 px-6 flex items-center justify-between shrink-0"
        >
          <div className="text-white/40 text-xs font-mono">
            {rows.length > 0
              ? `${rows.length} baris · ${summary?.totalOrders || 0} order`
              : "Belum ada data"}
          </div>
          <div className="text-white/30 text-[10px] font-mono">
            {rawPeriod
              ? `${new Date(rawPeriod.start).toLocaleDateString("id-ID")} — ${new Date(rawPeriod.end).toLocaleDateString("id-ID")}`
              : ""}
          </div>
        </footer>
      </main>
    </div>
  );
}
