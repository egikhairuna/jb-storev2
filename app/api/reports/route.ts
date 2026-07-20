import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrders } from "@/lib/woocommerce";
import type { ReportRow } from "@/types/pos";

/**
 * Extended WC order shape for report-specific fields that the shared
 * WCOrderResponse type intentionally omits (shipping_total, billing details).
 * We cast the raw API response to this interface inside the report route only.
 */
interface WCOrderForReport {
  id: number;
  number: string;
  status: string;
  total: string;
  shipping_total?: string;
  date_created: string;
  date_created_gmt: string;
  payment_method: string;
  billing: {
    first_name: string;
    last_name: string;
    phone?: string;
    address_1?: string;
    city?: string;
    state?: string;
    postcode?: string;
  };
  shipping_lines?: Array<{
    method_title: string;
    method_id: string;
    total: string;
  }>;
  line_items: Array<{
    product_id: number;
    variation_id: number | null;
    name: string;
    sku: string | null;
    quantity: number;
    price: string;
    total: string;
    meta_data: Array<{ key: string; value: unknown }>;
  }>;
  fee_lines?: Array<{
    name: string;
    total: string;
  }>;
  meta_data: Array<{ key: string; value: unknown }>;
}

function formatTanggal(date: Date): string {
  // Convert date to Asia/Jakarta timezone (UTC+7)
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const jakartaDate = new Date(utc + 3600000 * 7);

  const months = [
    "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
    "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
  ];
  const d = jakartaDate.getDate();
  const m = months[jakartaDate.getMonth()];
  const y = jakartaDate.getFullYear();
  const hh = jakartaDate.getHours().toString().padStart(2, "0");
  const mm = jakartaDate.getMinutes().toString().padStart(2, "0");
  return `${d} ${m} ${y}, ${hh}:${mm}`;
}

// Helper to get a Date object in UTC that corresponds to the given YYYY-MM-DD and HH:mm:ss.l in Jakarta (UTC+7)
function getJakartaDate(yyyy: number, mm: number, dd: number, hh: number, min: number, ss: number, ms: number): Date {
  return new Date(Date.UTC(yyyy, mm - 1, dd, hh - 7, min, ss, ms));
}

// Convert a Date object to a YYYY-MM-DDTHH:mm:ss string in Asia/Jakarta (UTC+7)
function toJakartaISOString(date: Date): string {
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const jakartaDate = new Date(utc + 3600000 * 7);
  
  const yyyy = jakartaDate.getFullYear();
  const mm = String(jakartaDate.getMonth() + 1).padStart(2, '0');
  const dd = String(jakartaDate.getDate()).padStart(2, '0');
  const hh = String(jakartaDate.getHours()).padStart(2, '0');
  const min = String(jakartaDate.getMinutes()).padStart(2, '0');
  const ss = String(jakartaDate.getSeconds()).padStart(2, '0');
  
  return `${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}`;
}

// Get the start and end Date objects in UTC for a given period in Jakarta timezone
function getPeriodBounds(
  period: string,
  customStart?: string | null,
  customEnd?: string | null
): { startDate: Date; endDate: Date } {
  const now = new Date();
  
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const jakartaNow = new Date(utc + 3600000 * 7);
  
  const nowYear = jakartaNow.getFullYear();
  const nowMonth = jakartaNow.getMonth() + 1;
  const nowDate = jakartaNow.getDate();
  const nowHours = jakartaNow.getHours();
  const nowMinutes = jakartaNow.getMinutes();
  const nowSeconds = jakartaNow.getSeconds();
  const nowMs = jakartaNow.getMilliseconds();

  let startDate: Date;
  let endDate = getJakartaDate(nowYear, nowMonth, nowDate, nowHours, nowMinutes, nowSeconds, nowMs);

  switch (period) {
    case "7d": {
      startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    }
    case "30d": {
      startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    }
    case "month": {
      startDate = getJakartaDate(nowYear, nowMonth, 1, 0, 0, 0, 0);
      const lastDay = new Date(nowYear, nowMonth, 0).getDate();
      endDate = getJakartaDate(nowYear, nowMonth, lastDay, 23, 59, 59, 999);
      break;
    }
    case "custom": {
      if (customStart) {
        const [y, m, d] = customStart.split('-').map(Number);
        startDate = getJakartaDate(y, m, d, 0, 0, 0, 0);
      } else {
        startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
      }
      
      if (customEnd) {
        const [y, m, d] = customEnd.split('-').map(Number);
        endDate = getJakartaDate(y, m, d, 23, 59, 59, 999);
      }
      break;
    }
    default: {
      startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
  }

  return { startDate, endDate };
}

async function fetchAllWCOrders(
  after: string,
  before: string
): Promise<WCOrderForReport[]> {
  const { totalPages, orders: firstPageOrders } = await getOrders({
    page: 1,
    per_page: 100,
    after,
    before,
    status: "any",
  });

  const allOrders = [...firstPageOrders] as unknown as WCOrderForReport[];

  if (totalPages > 1) {
    const remainingPages = Array.from(
      { length: totalPages - 1 },
      (_, i) => i + 2
    );

    for (let i = 0; i < remainingPages.length; i += 3) {
      const chunk = remainingPages.slice(i, i + 3);
      const results = await Promise.all(
        chunk.map((page) =>
          getOrders({ page, per_page: 100, after, before, status: "any" })
        )
      );
      for (const r of results) {
        allOrders.push(...(r.orders as unknown as WCOrderForReport[]));
      }
    }
  }

  return allOrders;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "7d";
    const customStart = searchParams.get("start");
    const customEnd = searchParams.get("end");

    const { startDate, endDate } = getPeriodBounds(period, customStart, customEnd);

    // --- Fetch ALL WC orders (both POS-synced and Website) ---
    const wcOrders = await fetchAllWCOrders(
      toJakartaISOString(startDate),
      toJakartaISOString(endDate)
    );

    // Only include completed + processing orders
    const validOrders = wcOrders.filter(
      (order) => order.status === "completed" || order.status === "processing"
    );

    console.info(
      `[reports] WC API returned ${wcOrders.length} total, ${validOrders.length} completed/processing`
    );

    // --- Debug: full breakdown ---
    const statusBreakdown: Record<string, number> = {};
    let posCount = 0;
    let websiteCount = 0;
    for (const o of wcOrders) {
      statusBreakdown[o.status] = (statusBreakdown[o.status] || 0) + 1;
      const isPOS = o.meta_data?.some(
        (m) => m.key === "_is_pos" && m.value === "Y"
      );
      if (isPOS) posCount++;
      else websiteCount++;
    }
    console.info(`[reports] Status breakdown:`, JSON.stringify(statusBreakdown));
    console.info(`[reports] Source breakdown: POS=${posCount}, Website=${websiteCount}`);
    console.info(
      `[reports] Valid orders: ${validOrders.filter((o) => o.meta_data?.some((m) => m.key === "_is_pos" && m.value === "Y")).length} POS + ${validOrders.filter((o) => !o.meta_data?.some((m) => m.key === "_is_pos" && m.value === "Y")).length} Website`
    );

    // Build set of WC order IDs to avoid duplicates with Prisma
    const wcOrderIdSet = new Set(validOrders.map((o) => String(o.id)));

    // --- Fetch unsynced POS orders from Prisma (not yet in WC) ---
    const posOrders = await prisma.order.findMany({
      where: {
        source: "pos",
        createdAt: { gte: startDate, lte: endDate },
        wcOrderId: null, // only unsynced orders
      },
      orderBy: { createdAt: "desc" },
    });

    console.info(
      `[reports] Prisma: ${posOrders.length} unsynced POS orders`
    );

    interface TempRow extends Omit<ReportRow, "no"> {
      rawDate: Date;
    }

    // --- Map unsynced POS orders to TempRow[] ---
    const posRows: TempRow[] = [];
    for (const order of posOrders) {
      // Skip if somehow this order IS in WC (safety check)
      if (order.wcOrderId && wcOrderIdSet.has(order.wcOrderId)) continue;

      let items: Array<{
        name?: string;
        sku?: string;
        quantity?: number;
        price?: number;
        variantName?: string;
      }> = [];
      try {
        items = JSON.parse(order.items || "[]");
      } catch {
        items = [];
      }

      const rawDate = new Date(order.createdAt);
      const tanggal = formatTanggal(rawDate);

      // Determine customer name: filter out "JB - Store" or null
      const customerName =
        order.customerName === "JB - Store" || !order.customerName
          ? null
          : order.customerName;

      const subtotal = order.subtotal > 0 ? order.subtotal : 1;
      const cashAmount = order.cashAmount ?? 0;
      const transferAmount = order.transferAmount ?? 0;
      const discountAmount = order.discountAmount ?? 0;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const itemPrice = item.price ?? 0;
        const itemQty = item.quantity ?? 1;
        const hargaBarang = itemPrice * itemQty;
        const itemProportion = hargaBarang / subtotal;

        // Proportional discount per line item
        const diskon = discountAmount > 0
          ? Math.round(discountAmount * itemProportion)
          : null;

        let cash: number | null = null;
        let transfer: number | null = null;
        let others: number | null = null;

        // Only assign payment amounts to the first line item of each order
        if (i === 0) {
          const pm = order.paymentMethod;

          if (pm === "cash" || pm === "pos_cash") {
            cash = cashAmount > 0 ? cashAmount : order.total;
            transfer = null;
            others = null;
          } else if (pm === "transfer" || pm === "pos_transfer") {
            cash = null;
            transfer = order.total;
            others = null;
          } else if (pm === "split" || pm === "pos_split") {
            cash = cashAmount;
            transfer = transferAmount;
            others = null;
          } else if (pm === "other" || pm === "pos_other") {
            cash = null;
            transfer = null;
            others = order.total;
          } else {
            cash = order.total;
            transfer = null;
            others = null;
          }
        }

        posRows.push({
          rawDate,
          tanggal,
          sumber: "POS",
          orderId: `#${order.posOrderId.slice(-6)}`,
          sku: item.sku || "-",
          productName: item.variantName
            ? `${item.name} - ${item.variantName}`
            : item.name || "-",
          qty: itemQty,
          hargaBarang,
          transfer,
          cash,
          others,
          diskon,
          ongkosKirim: null,
          kodeUnik: null,
          customerName,
          noHp: null,
          alamat: null,
          kodePos: null,
          metodePengiriman: null,
          noResi: null,
        });
      }
    }

    // --- Map ALL valid WC orders to TempRow[] ---
    // Use _is_pos meta to determine source label
    const wcRows: TempRow[] = [];
    for (const order of validOrders) {
      const isPOS = order.meta_data?.some(
        (m) => m.key === "_is_pos" && m.value === "Y"
      );
      const sumber = isPOS ? "POS" : "Website";

      const lineItems = order.line_items || [];
      const shippingTotal = parseFloat(order.shipping_total || "0") || 0;

      // Check for POS cash/transfer meta on WC orders
      const cashMeta = order.meta_data?.find(
        (m) => m.key === "_pos_cash_amount"
      );
      const transferMeta = order.meta_data?.find(
        (m) => m.key === "_pos_transfer_amount"
      );
      const cashAmount = cashMeta ? (parseFloat(String(cashMeta.value)) || 0) : 0;
      const transferAmount = transferMeta ? (parseFloat(String(transferMeta.value)) || 0) : 0;

      const uniqueCodeMeta = order.meta_data?.find(
        (m) => m.key === "_unique_payment_code"
      );
      const kodeUnik = uniqueCodeMeta?.value ? String(uniqueCodeMeta.value) : null;

      // Detect discount from fee_lines (negative amount)
      const discountFee = order.fee_lines?.find(
        (f) => parseFloat(f.total) < 0
      );
      const wcDiscountAmount = discountFee
        ? Math.abs(parseFloat(discountFee.total))
        : 0;

      const customerName = [
        order.billing?.first_name,
        order.billing?.last_name,
      ]
        .filter(Boolean)
        .join(" ") || null;
      
      const resolvedCustomerName = isPOS
        ? (customerName === "JB - Store" || !customerName ? null : customerName)
        : customerName;

      const noHp = order.billing?.phone || null;
      const alamat = [
        order.billing?.address_1,
        order.billing?.city,
        order.billing?.state,
      ]
        .filter(Boolean)
        .join(", ") || null;

      // Kode Pos
      const kodePos = order.billing?.postcode || null;

      // Metode Pengiriman — from shipping_lines
      const metodePengiriman =
        order.shipping_lines && order.shipping_lines.length > 0
          ? order.shipping_lines[0].method_title
          : null;

      // No Resi — JNE plugin stores AWB in meta_data
      const resiMetaKeys = [
        "jneshof_shipping_tracking_number",
        "jneshof_shipping_pickup_number",
        "_jne_awb_number",
        "_jne_resi",
        "jne_awb",
        "_wc_shipment_tracking_number",
        "_tracking_number",
        "resi_number",
        "_jne_tracking_number",
        "awb_number",
        "_awb_number",
      ];

      let noResi: string | null = null;
      for (const key of resiMetaKeys) {
        const meta = order.meta_data?.find((m) => m.key === key);
        if (meta?.value && String(meta.value).trim()) {
          noResi = String(meta.value).trim();
          break;
        }
      }

      if (!noResi) {
        const resiMeta = order.meta_data?.find(
          (m) =>
            m.key.toLowerCase().includes("resi") ||
            m.key.toLowerCase().includes("awb") ||
            m.key.toLowerCase().includes("tracking")
        );
        if (resiMeta?.value) {
          noResi = String(resiMeta.value).trim() || null;
        }
      }

      if (!isPOS && !wcRows.some((r) => r.sumber === "Website")) {
        console.log(
          "[reports] First website order meta_data keys:",
          order.meta_data?.map((m) => m.key).join(", ")
        );
      }

      const rawDate = order.date_created_gmt
        ? (order.date_created_gmt.endsWith("Z") || order.date_created_gmt.includes("+")
          ? new Date(order.date_created_gmt)
          : new Date(order.date_created_gmt + "Z"))
        : (order.date_created.endsWith("Z") || order.date_created.includes("+")
          ? new Date(order.date_created)
          : new Date(order.date_created + "+07:00"));
      const tanggal = formatTanggal(rawDate);

      // Sum of line item gross totals for proportion calculation
      const lineItemGrossSum = lineItems.reduce(
        (sum, it) => sum + (parseFloat(it.price) || 0) * (it.quantity || 1),
        0
      ) || 1;

      for (let i = 0; i < lineItems.length; i++) {
        const item = lineItems[i];
        const hargaBarang = (parseFloat(item.price) || 0) * (item.quantity || 1);
        const itemProportion = hargaBarang / lineItemGrossSum;

        // Proportional discount per line item
        const diskon = wcDiscountAmount > 0
          ? Math.round(wcDiscountAmount * itemProportion)
          : null;

        let cash: number | null = null;
        let transfer: number | null = null;
        let others: number | null = null;

        // Only assign payment amounts to the first line item of each order
        if (i === 0) {
          const orderTotal = parseFloat(order.total) || 0;

          if (!isPOS) {
            // Website order: full order total as transfer
            cash = null;
            transfer = orderTotal;
            others = null;
          } else {
            // POS order synced to WC
            const pm = order.payment_method;

            if (pm === "pos_split" || (cashMeta && transferMeta)) {
              cash = cashAmount;
              transfer = transferAmount;
              others = null;
            } else if (pm === "pos_cash" || cashMeta) {
              cash = cashAmount > 0 ? cashAmount : orderTotal;
              transfer = null;
              others = null;
            } else if (pm === "pos_other") {
              cash = null;
              transfer = null;
              others = orderTotal;
            } else {
              // Default: assume transfer (pos_transfer, bacs, website payments, etc.)
              cash = null;
              transfer = orderTotal;
              others = null;
            }
          }
        }

        wcRows.push({
          rawDate,
          tanggal,
          sumber,
          orderId: `#${order.number || order.id}`,
          sku: item.sku || "-",
          productName: item.name || "-",
          qty: item.quantity || 1,
          hargaBarang,
          transfer,
          cash,
          others,
          diskon,
          ongkosKirim: shippingTotal > 0 ? shippingTotal : null,
          kodeUnik,
          customerName: resolvedCustomerName,
          noHp,
          alamat,
          kodePos: !isPOS ? kodePos : null,
          metodePengiriman: !isPOS ? metodePengiriman : null,
          noResi: !isPOS ? noResi : null,
        });
      }
    }

    // --- Combine, sort, and number ---
    const allRows: ReportRow[] = [...posRows, ...wcRows]
      .sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime())
      .map((row, i) => {
        const rest: Omit<ReportRow, "no"> & { rawDate?: Date } = { ...row };
        delete rest.rawDate;
        return { ...rest, no: i + 1 };
      });

    // --- Build summary ---
    const uniqueOrderIds = new Set(allRows.map((r) => r.orderId));
    const posOrderIds = new Set(
      allRows.filter((r) => r.sumber === "POS").map((r) => r.orderId)
    );
    const wcOrderIds = new Set(
      allRows.filter((r) => r.sumber === "Website").map((r) => r.orderId)
    );

    const totalCash = allRows.reduce((sum, r) => sum + (r.cash || 0), 0);
    const totalTransfer = allRows.reduce(
      (sum, r) => sum + (r.transfer || 0),
      0
    );
    const totalOthers = allRows.reduce((sum, r) => sum + (r.others || 0), 0);
 
    const summary = {
      totalOrders: uniqueOrderIds.size,
      totalItems: allRows.length,
      totalCash: Math.round(totalCash),
      totalTransfer: Math.round(totalTransfer),
      totalOthers: Math.round(totalOthers),
      totalRevenue: Math.round(totalCash + totalTransfer + totalOthers),
      posOrders: posOrderIds.size,
      wcOrders: wcOrderIds.size,
    };

    return NextResponse.json({
      success: true,
      data: allRows,
      summary,
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
    });
  } catch (error) {
    console.error("[reports] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch reports",
      },
      { status: 500 }
    );
  }
}
