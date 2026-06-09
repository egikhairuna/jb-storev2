"use client";

import type { ReportRow, ReportSummary } from "@/types/pos";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

const HEADERS = [
  "No",
  "Tanggal",
  "Sumber",
  "Order ID",
  "SKU",
  "Nama Produk",
  "Qty",
  "Harga Barang",
  "Transfer",
  "Cash",
  "Others",
  "Diskon",
  "Ongkos Kirim",
  "Kode Unik",
  "Customer",
  "No HP",
  "Alamat",
];

function rowToArray(row: ReportRow): (string | number)[] {
  return [
    row.no,
    row.tanggal,
    row.sumber,
    row.orderId,
    row.sku,
    row.productName,
    row.qty,
    row.hargaBarang,
    row.transfer ?? "",
    row.cash ?? "",
    row.others ?? "",
    row.diskon ?? "",
    row.ongkosKirim ?? "",
    row.kodeUnik ?? "",
    row.customerName ?? "",
    row.noHp ?? "",
    row.alamat ?? "",
  ];
}

export function exportCSV(rows: ReportRow[], filename: string) {
  const csv = [
    HEADERS.join(","),
    ...rows.map((r) =>
      rowToArray(r)
        .map((v) =>
          typeof v === "string" && v.includes(",")
            ? `"${v.replace(/"/g, '""')}"`
            : v
        )
        .join(",")
    ),
  ].join("\n");

  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename + ".csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function exportExcel(rows: ReportRow[], filename: string) {
  const ws = XLSX.utils.aoa_to_sheet([HEADERS, ...rows.map(rowToArray)]);
  ws["!cols"] = [
    { wch: 5 },   // No
    { wch: 20 },  // Tanggal
    { wch: 10 },  // Sumber
    { wch: 12 },  // Order ID
    { wch: 15 },  // SKU
    { wch: 35 },  // Nama Produk
    { wch: 6 },   // Qty
    { wch: 18 },  // Harga Barang
    { wch: 15 },  // Transfer
    { wch: 15 },  // Cash
    { wch: 15 },  // Others
    { wch: 12 },  // Diskon
    { wch: 15 },  // Ongkos Kirim
    { wch: 12 },  // Kode Unik
    { wch: 20 },  // Customer
    { wch: 15 },  // No HP
    { wch: 40 },  // Alamat
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Laporan");
  XLSX.writeFile(wb, filename + ".xlsx");
}

export function exportPDF(
  rows: ReportRow[],
  filename: string,
  summary: ReportSummary,
  period: { start: string; end: string }
) {
  const doc = new jsPDF({ orientation: "landscape", format: "a4" });

  // Header
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Laporan Penjualan — James Boogie", 14, 15);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");

  const startStr = new Date(period.start).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const endStr = new Date(period.end).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  doc.text(`Periode: ${startStr} s/d ${endStr}`, 14, 22);
  doc.text(
    `Total Transaksi: ${summary.totalOrders} | Total Pendapatan: Rp ${summary.totalRevenue.toLocaleString("id-ID")}`,
    14,
    28
  );

  // Table
  autoTable(doc, {
    head: [HEADERS],
    body: rows.map(rowToArray),
    startY: 33,
    styles: {
      fontSize: 7,
      cellPadding: 2,
      font: "helvetica",
    },
    headStyles: {
      fillColor: [30, 30, 40],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 7,
    },
    alternateRowStyles: { fillColor: [248, 248, 252] },
    columnStyles: {
      0: { cellWidth: 8 },      // No
      1: { cellWidth: 25 },     // Tanggal
      2: { cellWidth: 15 },     // Sumber
      3: { cellWidth: 18 },     // Order ID
      4: { cellWidth: 20 },     // SKU
      5: { cellWidth: 38 },     // Nama Produk
      6: { cellWidth: 8 },      // Qty
      7: { cellWidth: 22 },     // Harga Barang
      8: { cellWidth: 20 },     // Transfer
      9: { cellWidth: 20 },     // Cash
      10: { cellWidth: 20 },    // Others
      11: { cellWidth: 18 },    // Diskon
      12: { cellWidth: 18 },    // Ongkos Kirim
      13: { cellWidth: 15 },    // Kode Unik
      14: { cellWidth: 22 },    // Customer
      15: { cellWidth: 20 },    // No HP
      16: { cellWidth: "auto" }, // Alamat
    },
    didParseCell: (data) => {
      // Color SUMBER column
      if (data.column.index === 2 && data.section === "body") {
        data.cell.styles.textColor =
          data.cell.raw === "POS" ? [59, 130, 246] : [139, 92, 246];
      }
      // Color TRANSFER column blue
      if (
        data.column.index === 8 &&
        data.section === "body" &&
        data.cell.raw
      ) {
        data.cell.styles.textColor = [59, 130, 246];
      }
      // Color CASH column green
      if (
        data.column.index === 9 &&
        data.section === "body" &&
        data.cell.raw
      ) {
        data.cell.styles.textColor = [34, 197, 94];
      }
      // Color OTHERS column purple
      if (
        data.column.index === 10 &&
        data.section === "body" &&
        data.cell.raw
      ) {
        data.cell.styles.textColor = [168, 85, 247];
      }
      // Color DISKON column orange
      if (
        data.column.index === 11 &&
        data.section === "body" &&
        data.cell.raw
      ) {
        data.cell.styles.textColor = [249, 115, 22];
      }
    },
  });

  doc.save(filename + ".pdf");
}
