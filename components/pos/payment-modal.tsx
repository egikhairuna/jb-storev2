import React, { useState, useMemo, useEffect, useRef } from "react";
import { X, AlertCircle, Loader2, User, Tag, MessageSquare, ChevronDown, ChevronUp } from "lucide-react";
import { useCartStore } from "@/store/cart.store";
import type { CartItem } from "@/types/pos";
import { CURRENCY } from "@/lib/constants";
import { ReceiptModal } from "./receipt-modal";
import { useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/lib/query-keys";
import { useSession } from "next-auth/react";


interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CompletedOrder {
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
}

export const PaymentModal = ({ isOpen, onClose }: PaymentModalProps) => {
  const { 
    items, 
    clearCart,
    discountType,
    discountValue,
    customerName,
    orderNote,
    setDiscount,
    setCustomerName,
    setOrderNote,
    subtotal: getSubtotal,
    discountAmount: getDiscountAmount,
    total: getTotal
  } = useCartStore();

  const [paymentMethod, setPaymentMethod] = useState<"cash" | "transfer" | "split">("cash");
  const [givenAmount, setGivenAmount] = useState<string>("");
  const [transferAmount, setTransferAmount] = useState<string>("");
  const [errorData, setErrorData] = useState<{ message?: string; items?: { name: string; requested: number; available: number }[] } | null>(null);
  
  const [completedOrder, setCompletedOrder] = useState<CompletedOrder | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [expandedSection, setExpandedSection] = useState<'customer' | 'discount' | 'note' | null>(null);
  
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const offlineIdRef = useRef<string | null>(null);

  const cashInputRef = useRef<HTMLInputElement>(null);

  const subtotal = getSubtotal();
  const discountAmount = getDiscountAmount();
  const total = getTotal();

  const changeAmount = useMemo(() => {
    const given = parseFloat(givenAmount) || 0;
    return Math.max(0, given - total);
  }, [givenAmount, total]);

  const splitSum = (parseFloat(givenAmount) || 0) + (parseFloat(transferAmount) || 0);
  const splitDiff = Math.abs(total - splitSum);

  const canConfirm = 
    paymentMethod === "cash" ? (parseFloat(givenAmount) || 0) >= total :
    paymentMethod === "split" ? splitSum === total :
    true;

  useEffect(() => {
    if (!isOpen) {
      setCompletedOrder(null);
      setErrorData(null);
      setError(null);
      setGivenAmount("");
      setTransferAmount("");
      setExpandedSection(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && (paymentMethod === "cash" || paymentMethod === "split")) {
      setTimeout(() => {
        cashInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, paymentMethod]);

  // Auto-calculate transfer amount in split mode when cash changes
  useEffect(() => {
    if (paymentMethod === "split") {
      const cash = parseFloat(givenAmount) || 0;
      if (cash <= total) {
        setTransferAmount((total - cash).toString());
      } else {
        setTransferAmount("0");
      }
    }
  }, [givenAmount, total, paymentMethod]);

  const formatRupiah = (value: number) => 
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: CURRENCY,
      maximumFractionDigits: 0,
    }).format(value).replace("Rp", "Rp ");

  const handleConfirm = async () => {
    if (isSubmitting || !canConfirm) return;
    setIsSubmitting(true);
    setErrorData(null);
    setError(null);

    try {
      if (!offlineIdRef.current) {
        offlineIdRef.current = crypto.randomUUID();
      }

      const isSplit = paymentMethod === "split";
      const parsedCash = parseFloat(givenAmount) || 0;
      const parsedTransfer = parseFloat(transferAmount) || 0;

      const payload = {
        offline_id: offlineIdRef.current,
        items: items.map((item) => ({
          productId: item.id,
          variationId: item.variantId,
          name: item.name,
          sku: item.sku,
          variantName: item.variantName,
          quantity: item.quantity,
          price: item.price,
        })),
        paymentMethod: paymentMethod === "cash" ? "pos_cash" : paymentMethod === "transfer" ? "pos_transfer" : "pos_split",
        discountAmount,
        discountType,
        discountValue,
        taxAmount: 0,
        cashAmount: paymentMethod === "cash" ? total : isSplit ? parsedCash : 0,
        transferAmount: paymentMethod === "transfer" ? total : isSplit ? parsedTransfer : 0,
        customerName: customerName || null,
        orderNote: orderNote || null,
      };

      console.log('[payment] submitting order...');
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      console.log('[payment] API response:', JSON.stringify(data).slice(0, 300));

      if (!res.ok && data.code === 'STOCK_INSUFFICIENT') {
        setErrorData({ items: data.items ?? [] });
        setIsSubmitting(false);
        return;
      }

      if (!res.ok) {
        setError(data.error ?? 'Terjadi kesalahan');
        setIsSubmitting(false);
        return;
      }

      if (data.success && data.order) {
        // Reset offline_id for next transaction
        offlineIdRef.current = null;

        // Invalidate queries
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products() });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.orders() });

        setCompletedOrder({
          wcOrderId: String(data.order.wcOrderId ?? data.order.id),
          customerName: customerName || null,
          items,
          subtotal,
          discountAmount,
          discountType,
          discountValue,
          total,
          paymentMethod: paymentMethod,
          cashAmount: paymentMethod === "cash" ? (parsedCash || total) : isSplit ? parsedCash : undefined,
          transferAmount: paymentMethod === "transfer" ? total : isSplit ? parsedTransfer : undefined,
          changeAmount: paymentMethod === "cash" ? Math.max(0, (parsedCash || total) - total) : 0,
          orderNote: orderNote || null,
          createdAt: data.order.createdAt ?? new Date().toISOString(),
          cashierName: session?.user?.name ?? 'Kasir',
        });

        // Clear the cart upon successful checkout!
        clearCart();
        // Do NOT setIsSubmitting(false) here - receipt modal takes over
      }
    } catch (err) {
      console.error('[payment] unexpected error:', err);
      setError('Koneksi bermasalah. Silakan coba lagi.');
      setIsSubmitting(false);
    }
  };



  const handleCashInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    setGivenAmount(raw ? parseInt(raw, 10).toString() : "");
  };

  const handleCashInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const allowedKeys = ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab"];
    if (!/^[0-9]$/.test(e.key) && !allowedKeys.includes(e.key)) {
      e.preventDefault();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
      <div className="w-[440px] overflow-hidden rounded-2xl bg-gray-950 border border-white/10 shadow-2xl flex flex-col max-h-[600px]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <h2 className="text-lg font-semibold text-white">
            Payment Method
          </h2>
          {!isSubmitting && (
            <button onClick={onClose} className="rounded-full p-1.5 hover:bg-white/5 transition-colors">
              <X className="h-5 w-5 text-white/40" />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 custom-scrollbar">
          <div className="flex flex-col gap-2">
            {/* Customer Section */}
            <div className="rounded-xl border border-white/5 overflow-hidden">
              <button 
                onClick={() => setExpandedSection(expandedSection === 'customer' ? null : 'customer')}
                className="w-full px-3 h-10 flex items-center justify-between bg-white/[0.03] hover:bg-white/[0.06] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-white/30" />
                  <span className="text-sm font-medium text-white/70">
                    {customerName || "Add Customer"}
                  </span>
                </div>
                {expandedSection === 'customer' ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
              </button>
              {expandedSection === 'customer' && (
                <div className="px-3 py-2 bg-transparent border-t border-white/5">
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Enter customer name..."
                    className="w-full h-9 px-3 rounded-lg text-sm text-white placeholder-white/20 outline-none focus:border-blue-500 transition-all"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                  />
                </div>
              )}
            </div>

            {/* Discount Section */}
            <div className="rounded-xl border border-white/5 overflow-hidden">
              <button 
                onClick={() => setExpandedSection(expandedSection === 'discount' ? null : 'discount')}
                className="w-full px-3 h-10 flex items-center justify-between bg-white/[0.03] hover:bg-white/[0.06] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Tag className="w-4 h-4 text-white/30" />
                  <span className="text-sm font-medium text-white/70">
                    {discountAmount > 0 ? `Diskon: -${formatRupiah(discountAmount)}` : "Add Discount"}
                  </span>
                </div>
                {expandedSection === 'discount' ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
              </button>
              {expandedSection === 'discount' && (
                <div className="px-3 py-2 bg-transparent border-t border-white/5 space-y-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setDiscount('percent', discountValue)}
                      className={`flex-1 h-8 rounded-lg text-xs font-medium transition-all ${discountType === 'percent' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
                    >
                      Percent (%)
                    </button>
                    <button
                      onClick={() => setDiscount('nominal', discountValue)}
                      className={`flex-1 h-8 rounded-lg text-xs font-medium transition-all ${discountType === 'nominal' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
                    >
                      Nominal (Rp)
                    </button>
                    <button
                      onClick={() => setDiscount(null, 0)}
                      className="h-8 px-3 rounded-lg text-xs font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
                    >
                      Reset
                    </button>
                  </div>
                  {discountType && (
                    <div className="space-y-1">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-xs font-medium">
                          {discountType === 'percent' ? '%' : 'Rp'}
                        </span>
                        <input
                          type="number"
                          value={discountValue || ''}
                          onChange={(e) => setDiscount(discountType, parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          className="w-full h-9 pl-10 pr-3 rounded-lg text-sm text-white placeholder-white/20 outline-none focus:border-blue-500 transition-all"
                          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                        />
                      </div>
                      <p className="text-[10px] text-green-400 font-medium text-right uppercase tracking-wider">
                        Discount: -{formatRupiah(discountAmount)}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Note Section */}
            <div className="rounded-xl border border-white/5 overflow-hidden">
              <button 
                onClick={() => setExpandedSection(expandedSection === 'note' ? null : 'note')}
                className="w-full px-3 h-10 flex items-center justify-between bg-white/[0.03] hover:bg-white/[0.06] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-4 h-4 text-white/30" />
                  <span className="text-sm font-medium text-white/70">
                    {orderNote ? "View Note" : "Add Note"}
                  </span>
                </div>
                {expandedSection === 'note' ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
              </button>
              {expandedSection === 'note' && (
                <div className="px-3 py-2 bg-transparent border-t border-white/5">
                  <textarea
                    rows={2}
                    value={orderNote}
                    onChange={(e) => setOrderNote(e.target.value)}
                    placeholder="Write a note..."
                    className="w-full p-2 rounded-lg text-sm text-white placeholder-white/20 outline-none focus:border-blue-500 transition-all resize-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                  />
                </div>
              )}
            </div>

            {/* Order Summary - Tighter */}
            <div className="space-y-1 py-3 border-y border-white/10 my-1">
              <div className="flex justify-between text-sm">
                <span className="text-white/40">Subtotal</span>
                <span className="text-white/70 font-mono">
                  {formatRupiah(subtotal)}
                </span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-white/40">Diskon</span>
                  <span className="text-green-400 font-mono">
                    -{formatRupiah(discountAmount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center pt-1">
                <span className="text-white font-semibold">Total</span>
                <span className="text-white font-mono font-bold text-xl">
                  {formatRupiah(total)}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              {/* Payment Tabs */}
              <div className="bg-white/5 rounded-xl p-1 flex">
                {(["cash", "transfer", "split"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setPaymentMethod(m)}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      paymentMethod === m 
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" 
                        : "text-white/40 hover:text-white/60"
                    }`}
                  >
                    {m.toUpperCase()}
                  </button>
                ))}
              </div>

              <div className="flex-1">
                {paymentMethod === "cash" && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 py-3">
                      <span className="text-white/50 text-sm w-32 shrink-0">
                        Amount Received
                      </span>
                      <div className="flex-1 relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">Rp</span>
                        <input
                          ref={cashInputRef}
                          type="text"
                          inputMode="numeric"
                          autoFocus
                          value={givenAmount === "" ? "" : new Intl.NumberFormat("id-ID").format(parseFloat(givenAmount) || 0)}
                          onChange={handleCashInputChange}
                          onKeyDown={handleCashInputKeyDown}
                          placeholder="0"
                          className="w-full h-10 pl-9 pr-3 rounded-lg text-sm text-right font-mono text-white outline-none focus:border-blue-500/50 transition-all"
                          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
                        />
                      </div>
                      <button onClick={() => setGivenAmount(total.toString())}
                        className="text-blue-400 text-xs whitespace-nowrap hover:text-blue-300 transition-colors">
                        Uang Pas
                      </button>
                    </div>

                    {parseFloat(givenAmount) > 0 && (
                      <div className="flex justify-between items-center py-2 px-1 border-t border-white/5">
                        <span className="text-white/40 text-sm">Change</span>
                        <span className={`text-sm font-mono font-semibold ${changeAmount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {formatRupiah(changeAmount)}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {paymentMethod === "transfer" && (
                  <div className="py-3 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-white/50 text-sm">Transfer Amount</span>
                      <span className="text-white font-mono font-semibold">
                        {formatRupiah(total)}
                      </span>
                    </div>
                    <input
                      type="text"
                      placeholder="Nomor referensi (opsional)"
                      className="w-full h-9 px-3 rounded-lg text-sm text-white placeholder-white/20 outline-none focus:border-blue-500/50 transition-all"
                      style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
                    />
                  </div>
                )}

                {paymentMethod === "split" && (
                  <div className="space-y-3 py-1">
                    {/* Split - Tunai */}
                    <div className="flex items-center gap-3">
                      <span className="text-white/50 text-sm w-20 shrink-0">Cash</span>
                      <div className="flex-1 relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-xs">Rp</span>
                        <input
                          ref={cashInputRef}
                          type="text"
                          inputMode="numeric"
                          value={givenAmount === "" ? "" : new Intl.NumberFormat("id-ID").format(parseFloat(givenAmount) || 0)}
                          onChange={handleCashInputChange}
                          onKeyDown={handleCashInputKeyDown}
                          className="w-full h-9 pl-9 pr-3 rounded-lg text-sm text-right font-mono text-white outline-none focus:border-blue-500/50 transition-all"
                          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
                          placeholder="0"
                        />
                      </div>
                    </div>

                    {/* Split - Transfer */}
                    <div className="flex items-center gap-3">
                      <span className="text-white/50 text-sm w-20 shrink-0">Transfer</span>
                      <div className="flex-1 relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-xs">Rp</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={transferAmount === "" ? "" : new Intl.NumberFormat("id-ID").format(parseFloat(transferAmount) || 0)}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/\D/g, "");
                            setTransferAmount(raw ? parseInt(raw, 10).toString() : "");
                          }}
                          onKeyDown={handleCashInputKeyDown}
                          className="w-full h-9 pl-9 pr-3 rounded-lg text-sm text-right font-mono text-white outline-none focus:border-blue-500/50 transition-all"
                          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
                          placeholder="0"
                        />
                      </div>
                    </div>

                    {/* Split Validation Row */}
                    <div className="flex justify-between items-center px-1 pt-1">
                      <span className="text-xs font-medium text-white/30">Total: {formatRupiah(splitSum)}</span>
                      {splitSum < total ? (
                        <span className="text-xs font-medium text-red-400 italic">Underpaid {formatRupiah(splitDiff)}</span>
                      ) : splitSum > total ? (
                        <span className="text-xs font-medium text-amber-400 italic">Overpaid {formatRupiah(splitDiff)}</span>
                      ) : (
                        <span className="text-xs font-medium text-green-400 uppercase tracking-tighter">✓ Pas</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Numpad removed */}

              {errorData && (
                <div className="flex gap-3 rounded-xl bg-red-500/10 p-3 text-sm text-red-400 border border-red-500/20">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-1">
                    {(errorData?.message || error) && <p className="font-medium text-xs">{errorData?.message || error}</p>}
                    {errorData?.items && (
                      <div className="space-y-1">
                        <p className="font-bold text-[10px] uppercase tracking-wider">Stock not enough:</p>
                        <ul className="space-y-0.5 text-xs">
                          {errorData.items.map((err, idx) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <span className="mt-1.5 w-1 h-1 rounded-full bg-red-400 shrink-0"></span>
                              <span>
                                <span className="font-semibold">{err.name}</span>: {err.requested} vs {err.available}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        {!completedOrder && (
          <div className="border-t border-white/10 px-6 py-4 bg-white/[0.02]">
            <button
              disabled={!canConfirm || isSubmitting}
              onClick={handleConfirm}
              className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all disabled:bg-white/5 disabled:text-white/20 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Processing...</span>
                </>
              ) : (
                <span className="text-sm">Confirm Payment</span>
              )}
            </button>
          </div>
        )}
      </div>

      <ReceiptModal
        order={completedOrder}
        onClose={() => {
          setCompletedOrder(null);
          onClose();
        }}
        onNewTransaction={() => {
          clearCart();
          setCompletedOrder(null);
          offlineIdRef.current = null;
          onClose();
        }}
      />
    </div>
  );
};
