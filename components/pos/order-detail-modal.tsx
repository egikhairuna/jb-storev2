import React, { useRef } from "react";
import { X, Printer } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import { Receipt } from "./receipt";
import type { OrderSummary, OrderItemPayload } from "@/types/api-schemas";

interface OrderDetailModalProps {
  order: OrderSummary | null;
  onClose: () => void;
}

export const OrderDetailModal = ({ order, onClose }: OrderDetailModalProps) => {
  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: `Receipt-${order?.wcOrderId || 'Order'}`,
  });

  if (!order) return null;

  // Map local DB order to Receipt props shape
  const receiptOrder = {
    wcOrderId: order.wcOrderId || order.posOrderId.slice(-6),
    customerName: order.customerName || null,
    items: order.items.map((item: OrderItemPayload) => ({
      id: item.productId,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      sku: item.sku || "",
      type: "simple" as const,
      stock: 0,
      variantId: item.variationId,
      variantName: item.variantName || undefined,
    })),
    subtotal: order.subtotal || 0,
    discountAmount: order.discountAmount || 0,
    discountType: (order.discountType as "percent" | "nominal" | null) || null,
    discountValue: order.discountValue || 0,
    total: order.total || 0,
    paymentMethod: order.paymentMethod || 'pos_cash',
    cashAmount: order.cashAmount || undefined,
    transferAmount: order.transferAmount || undefined,
    changeAmount: 0, // Not stored in DB
    orderNote: order.orderNote || null,
    createdAt: order.createdAt,
    cashierName: order.cashierName || "Kasir"
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
      <div className="bg-gray-950 border border-white/10 rounded-2xl w-[420px] max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Detail Order</h2>
          <button onClick={onClose} className="p-1 hover:bg-white/5 rounded-full transition-colors">
            <X className="w-5 h-5 text-white/40" />
          </button>
        </div>

        {/* Receipt Preview Area */}
        <div className="flex-1 overflow-y-auto px-4 py-4 custom-scrollbar">
          <div style={{
            background: '#fff',
            borderRadius: '8px',
            padding: '0',
            maxWidth: '80mm',
            margin: '0 auto',
            boxShadow: '0 2px 16px rgba(0,0,0,0.3)',
            overflow: 'hidden',
          }}>
            <div ref={receiptRef}>
              <Receipt order={receiptOrder} />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6">
          <button
            onClick={() => handlePrint()}
            className="h-12 w-full rounded-xl flex items-center justify-center gap-3 text-sm font-semibold transition-all active:scale-95 mb-3"
            style={{ 
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'white'
            }}
          >
            <Printer className="w-5 h-5 text-blue-400" />
            Print Struk
          </button>
          
          <button
            onClick={onClose}
            className="w-full h-11 rounded-xl text-white/60 text-sm font-medium hover:bg-white/5 transition-all"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
