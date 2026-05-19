import React, { useRef } from "react";
import { CheckCircle, Printer } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import { Receipt } from "./receipt";
import type { CartItem } from "@/types/pos";

interface ReceiptModalProps {
  order: {
    wcOrderId: string | number;
    customerName: string | null;
    items: CartItem[];
    subtotal: number;
    discountAmount: number;
    discountType: 'percent' | 'nominal' | null;
    discountValue: number;
    total: number;
    paymentMethod: string;
    cashAmount?: number;
    transferAmount?: number;
    changeAmount?: number;
    orderNote?: string | null;
    createdAt: string;
    cashierName: string;
  } | null;
  onClose: () => void;
  onNewTransaction: () => void;
}

export const ReceiptModal = ({ order, onClose, onNewTransaction }: ReceiptModalProps) => {
  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: `Receipt-${order?.wcOrderId || 'Order'}`,
  });

  if (!order) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
      <div className="bg-gray-950 border border-white/10 rounded-2xl w-[420px] max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="relative pt-8 pb-4 text-center">
          <div className="mb-2 flex justify-center">
            <div className="rounded-full bg-green-500/20 p-3">
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-white">Success!</h2>
          <p className="text-white/40 text-sm mt-1">Order #{order.wcOrderId}</p>
        </div>

        {/* Receipt Preview Area */}
        <div className="flex-1 overflow-y-auto px-4 py-2 custom-scrollbar">
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
              <Receipt order={order} />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 flex flex-col gap-3">
          <button
            onClick={() => handlePrint()}
            className="h-12 w-full rounded-xl flex items-center justify-center gap-3 text-sm font-semibold transition-all active:scale-95"
            style={{ 
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'white'
            }}
          >
            <Printer className="w-5 h-5 text-blue-400" />
            Print
          </button>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 h-12 rounded-xl text-white/60 text-sm font-medium hover:bg-white/5 transition-all"
            >
              Close
            </button>
            <button
              onClick={onNewTransaction}
              className="flex-[2] h-12 rounded-xl text-white text-sm font-bold shadow-lg shadow-blue-600/20 transition-all active:scale-95"
              style={{ 
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                border: '1px solid rgba(255,255,255,0.1)'
              }}
            >
              New Transaction
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
