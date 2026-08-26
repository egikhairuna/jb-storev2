"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  X,
  AlertTriangle,
  Loader2,
  Trash2,
  Plus,
  Minus,
  Search,
  User,
  MessageSquare,
  PackagePlus,
  Tag,
  AlertCircle
} from "lucide-react";
import { useCartStore } from "@/store/cart.store";
import { useEditOrder } from "@/hooks/use-orders";
import type { OrderSummary, OrderItemPayload } from "@/types/api-schemas";

interface EditOrderModalProps {
  order: OrderSummary | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface EditableItem {
  productId: string;
  variationId?: string;
  name: string;
  sku?: string;
  variantName?: string;
  quantity: number;
  price: number;
}

interface SearchItem {
  id: string;
  variantId?: string;
  productName: string;
  variantName?: string;
  sku: string;
  price: number;
  stock: number;
}

export const EditOrderModal = ({
  order,
  onClose,
  onSuccess,
}: EditOrderModalProps) => {
  const products = useCartStore((s) => s.products);
  const editOrderMutation = useEditOrder();

  // State management
  const [editedItems, setEditedItems] = useState<EditableItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [orderNote, setOrderNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "transfer" | "split" | "other">("cash");
  const [cashAmount, setCashAmount] = useState<string>("");
  const [transferAmount, setTransferAmount] = useState<string>("");
  const [otherLabel, setOtherLabel] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Search combobox state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchDropdownRef = useRef<HTMLDivElement>(null);

  // Initialize state when order changes
  useEffect(() => {
    if (order) {
      const initialItems: EditableItem[] = (order.items || []).map((item: OrderItemPayload) => ({
        productId: String(item.productId),
        variationId: item.variationId ? String(item.variationId) : undefined,
        name: item.name,
        sku: item.sku || "",
        variantName: item.variantName,
        quantity: item.quantity,
        price: item.price,
      }));

      setEditedItems(initialItems);
      setCustomerName(order.customerName || "");
      setOrderNote(order.orderNote || "");

      // Determine initial payment method
      const pm = order.paymentMethod || "";
      const normPm = pm.startsWith("pos_") ? pm.slice(4) : pm;
      if (normPm === "transfer") {
        setPaymentMethod("transfer");
      } else if (normPm === "split") {
        setPaymentMethod("split");
      } else if (normPm === "other") {
        setPaymentMethod("other");
      } else {
        setPaymentMethod("cash");
      }

      setCashAmount(order.cashAmount ? String(order.cashAmount) : "");
      setTransferAmount(order.transferAmount ? String(order.transferAmount) : "");
      setOtherLabel(
        order.otherLabel ||
          (order.paymentMethodTitle?.replace(/^Other\s*-\s*/i, "") ?? "")
      );
      setError(null);
      setSearchOpen(false);
      setSearchQuery("");
    }
  }, [order]);

  // Flatten store products into searchable items
  const searchItems = useMemo<SearchItem[]>(() => {
    const result: SearchItem[] = [];
    for (const p of products) {
      if (p.variants && p.variants.length > 0) {
        for (const v of p.variants) {
          result.push({
            id: p.id,
            variantId: v.id,
            productName: p.name,
            variantName: v.name,
            sku: v.sku || "",
            price: v.price,
            stock: v.stock,
          });
        }
      } else {
        result.push({
          id: p.id,
          productName: p.name,
          sku: p.sku || "",
          price: p.price,
          stock: p.stock,
        });
      }
    }
    return result;
  }, [products]);

  // Filter search items
  const filteredSearchItems = useMemo(() => {
    if (!searchQuery.trim()) return searchItems.slice(0, 25);
    const q = searchQuery.toLowerCase();
    return searchItems.filter(
      (item) =>
        item.productName.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        (item.variantName?.toLowerCase() || "").includes(q)
    );
  }, [searchItems, searchQuery]);

  // Handle outside click for search dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        searchDropdownRef.current &&
        !searchDropdownRef.current.contains(e.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(e.target as Node)
      ) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Calculate totals
  const subtotal = useMemo(() => {
    return editedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [editedItems]);

  const discountAmount = useMemo(() => {
    if (!order) return 0;
    if (order.discountType === "percent" && order.discountValue) {
      return (subtotal * order.discountValue) / 100;
    }
    if (order.discountType === "nominal" && order.discountValue) {
      return order.discountValue;
    }
    return order.discountAmount || 0;
  }, [order, subtotal]);

  const total = Math.max(0, subtotal - discountAmount);

  // Split calculations
  const parsedCash = parseFloat(cashAmount) || 0;
  const parsedTransfer = parseFloat(transferAmount) || 0;
  const splitSum = parsedCash + parsedTransfer;
  const splitDiff = Math.abs(total - splitSum);

  // Change amount for cash
  const changeAmount = useMemo(() => {
    return Math.max(0, parsedCash - total);
  }, [parsedCash, total]);

  // When switching payment methods, adjust amounts
  const handlePaymentMethodChange = (newMethod: "cash" | "transfer" | "split" | "other") => {
    setPaymentMethod(newMethod);
    if (newMethod === "cash") {
      setCashAmount(String(total));
      setTransferAmount("0");
    } else if (newMethod === "transfer") {
      setTransferAmount(String(total));
      setCashAmount("0");
    } else if (newMethod === "split") {
      setCashAmount(String(Math.floor(total / 2)));
      setTransferAmount(String(total - Math.floor(total / 2)));
    }
  };

  // Auto-calculate split transfer amount when cash amount changes
  const handleSplitCashChange = (val: string) => {
    const numericVal = val.replace(/\D/g, "");
    setCashAmount(numericVal);
    const parsed = parseFloat(numericVal) || 0;
    if (parsed <= total) {
      setTransferAmount(String(total - parsed));
    } else {
      setTransferAmount("0");
    }
  };

  const handleUpdateQty = (index: number, newQty: number) => {
    if (newQty <= 0) {
      // Remove item
      setEditedItems((prev) => prev.filter((_, idx) => idx !== index));
    } else {
      setEditedItems((prev) =>
        prev.map((item, idx) => (idx === index ? { ...item, quantity: newQty } : item))
      );
    }
  };

  const handleRemoveItem = (index: number) => {
    setEditedItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleAddProduct = (item: SearchItem) => {
    setEditedItems((prev) => {
      const existingIdx = prev.findIndex(
        (i) => i.productId === item.id && (i.variationId || undefined) === (item.variantId || undefined)
      );
      if (existingIdx > -1) {
        const next = [...prev];
        next[existingIdx] = {
          ...next[existingIdx],
          quantity: next[existingIdx].quantity + 1,
        };
        return next;
      }
      return [
        ...prev,
        {
          productId: item.id,
          variationId: item.variantId,
          name: item.productName,
          sku: item.sku,
          variantName: item.variantName,
          quantity: 1,
          price: item.price,
        },
      ];
    });
    setSearchOpen(false);
    setSearchQuery("");
  };

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(val).replace("Rp", "Rp ");
  };

  // Validation
  const canSave = useMemo(() => {
    if (editedItems.length === 0) return false;
    if (editOrderMutation.isPending) return false;
    if (paymentMethod === "cash") {
      return parsedCash >= total;
    }
    if (paymentMethod === "split") {
      return splitSum === total;
    }
    if (paymentMethod === "other") {
      return otherLabel.trim().length > 0;
    }
    return true;
  }, [editedItems, editOrderMutation.isPending, paymentMethod, parsedCash, total, splitSum, otherLabel]);

  const handleSave = async () => {
    if (!order?.wcOrderId || !canSave) return;
    setError(null);

    let paymentMethodCode = "pos_cash";
    let paymentMethodTitle = "Cash";

    if (paymentMethod === "transfer") {
      paymentMethodCode = "pos_transfer";
      paymentMethodTitle = "Direct Bank Transfer";
    } else if (paymentMethod === "split") {
      paymentMethodCode = "pos_split";
      paymentMethodTitle = `Split Transfer (Tunai: Rp ${parsedCash.toLocaleString("id-ID")} / Transfer: Rp ${parsedTransfer.toLocaleString("id-ID")})`;
    } else if (paymentMethod === "other") {
      paymentMethodCode = "pos_other";
      paymentMethodTitle = `Other - ${otherLabel.trim() || "Other"}`;
    }

    try {
      await editOrderMutation.mutateAsync({
        wcOrderId: order.wcOrderId,
        payload: {
          items: editedItems.map((item) => ({
            productId: item.productId,
            variationId: item.variationId,
            name: item.name,
            sku: item.sku,
            variantName: item.variantName,
            quantity: item.quantity,
            price: item.price,
          })),
          payment_method: paymentMethodCode,
          payment_method_title: paymentMethodTitle,
          customer_name: customerName.trim() || "Guest",
          order_note: orderNote.trim() || undefined,
          cash_amount: paymentMethod === "cash" ? (parsedCash || total) : paymentMethod === "split" ? parsedCash : 0,
          transfer_amount: paymentMethod === "transfer" ? total : paymentMethod === "split" ? parsedTransfer : 0,
          other_label: paymentMethod === "other" ? otherLabel.trim() : undefined,
          total,
        },
      });

      onSuccess();
      onClose();
    } catch (err: unknown) {
      console.error("[EditOrderModal] Failed to update order:", err);
      const msg = err instanceof Error ? err.message : "Gagal memperbarui order. Pastikan koneksi WooCommerce terhubung.";
      setError(msg);
    }
  };

  if (!order) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
      <div className="w-[620px] max-h-[92vh] overflow-hidden rounded-2xl bg-gray-950 border border-white/10 shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between shrink-0 bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400 animate-pulse" />
            <h2 className="text-lg font-bold text-white tracking-tight">
              Edit Order #{order.wcOrderId || order.posOrderId.slice(-6)}
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={editOrderMutation.isPending}
            className="p-1.5 hover:bg-white/5 rounded-full transition-colors text-white/40 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning Banner */}
        <div className="mx-6 mt-4 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-3 text-xs text-amber-300 shrink-0">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
          <span>Perubahan akan langsung diterapkan ke WooCommerce & stok disesuaikan otomatis.</span>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5 custom-scrollbar">
          {/* Section 1: Customer & Note */}
          <div className="space-y-3">
            <h3 className="text-[11px] font-bold text-white/40 uppercase tracking-[0.15em] flex items-center gap-2">
              <User className="w-3.5 h-3.5" /> Customer & Catatan
            </h3>

            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="text-xs text-white/60 mb-1.5 block font-medium">
                  Nama Pelanggan
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Guest / Nama pelanggan"
                  className="w-full h-10 px-3.5 rounded-xl text-sm text-white placeholder-white/20 outline-none focus:border-amber-400/50 transition-all"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                />
              </div>

              <div>
                <label className="text-xs text-white/60 mb-1.5 block font-medium flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-white/30" /> Catatan Order
                </label>
                <textarea
                  rows={2}
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  placeholder="Catatan tambahan untuk transaksi ini..."
                  className="w-full p-3 rounded-xl text-sm text-white placeholder-white/20 outline-none focus:border-amber-400/50 transition-all resize-none"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Payment Method */}
          <div className="space-y-3 pt-2 border-t border-white/5">
            <h3 className="text-[11px] font-bold text-white/40 uppercase tracking-[0.15em] flex items-center gap-2">
              <Tag className="w-3.5 h-3.5" /> Metode Pembayaran
            </h3>

            {/* Payment Tabs */}
            <div className="bg-white/5 rounded-xl p-1 flex">
              {(["cash", "transfer", "split", "other"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => handlePaymentMethodChange(m)}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                    paymentMethod === m
                      ? "bg-amber-500 text-gray-950 shadow-lg shadow-amber-500/20"
                      : "text-white/40 hover:text-white/70"
                  }`}
                >
                  {m.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Cash Mode */}
            {paymentMethod === "cash" && (
              <div className="space-y-2.5 p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="flex items-center gap-3">
                  <span className="text-white/60 text-xs w-32 shrink-0 font-medium">
                    Uang Diterima
                  </span>
                  <div className="flex-1 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">
                      Rp
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={
                        cashAmount === ""
                          ? ""
                          : new Intl.NumberFormat("id-ID").format(parseFloat(cashAmount) || 0)
                      }
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, "");
                        setCashAmount(raw);
                      }}
                      placeholder="0"
                      className="w-full h-10 pl-10 pr-3 rounded-lg text-sm text-right font-mono text-white outline-none focus:border-amber-400/50 transition-all"
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.12)",
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setCashAmount(String(total))}
                    className="text-amber-400 text-xs whitespace-nowrap hover:text-amber-300 transition-colors font-medium px-2 py-1 bg-amber-400/10 rounded-lg border border-amber-400/20"
                  >
                    Uang Pas
                  </button>
                </div>

                {parseFloat(cashAmount) > 0 && (
                  <div className="flex justify-between items-center pt-2 border-t border-white/5 text-xs">
                    <span className="text-white/40">Kembalian</span>
                    <span
                      className={`font-mono font-semibold text-sm ${
                        changeAmount >= 0 ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {formatIDR(changeAmount)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Transfer Mode */}
            {paymentMethod === "transfer" && (
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-white/60 font-medium">Nominal Transfer</span>
                  <span className="text-white font-mono font-bold text-sm">
                    {formatIDR(total)}
                  </span>
                </div>
                <p className="text-white/30 text-[11px]">
                  Pembayaran transfer bank akan diset sesuai total pesanan.
                </p>
              </div>
            )}

            {/* Split Mode */}
            {paymentMethod === "split" && (
              <div className="space-y-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="flex items-center gap-3">
                  <span className="text-white/60 text-xs w-20 shrink-0 font-medium">
                    Tunai (Rp)
                  </span>
                  <div className="flex-1 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-xs">
                      Rp
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={
                        cashAmount === ""
                          ? ""
                          : new Intl.NumberFormat("id-ID").format(parseFloat(cashAmount) || 0)
                      }
                      onChange={(e) => handleSplitCashChange(e.target.value)}
                      className="w-full h-9 pl-9 pr-3 rounded-lg text-sm text-right font-mono text-white outline-none focus:border-amber-400/50 transition-all"
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.12)",
                      }}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-white/60 text-xs w-20 shrink-0 font-medium">
                    Transfer (Rp)
                  </span>
                  <div className="flex-1 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-xs">
                      Rp
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={
                        transferAmount === ""
                          ? ""
                          : new Intl.NumberFormat("id-ID").format(parseFloat(transferAmount) || 0)
                      }
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, "");
                        setTransferAmount(raw);
                      }}
                      className="w-full h-9 pl-9 pr-3 rounded-lg text-sm text-right font-mono text-white outline-none focus:border-amber-400/50 transition-all"
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.12)",
                      }}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-white/5 text-xs">
                  <span className="text-white/40 font-mono">
                    Total Split: {formatIDR(splitSum)}
                  </span>
                  {splitSum < total ? (
                    <span className="text-red-400 font-medium italic">
                      Kurang {formatIDR(splitDiff)}
                    </span>
                  ) : splitSum > total ? (
                    <span className="text-amber-400 font-medium italic">
                      Lebih {formatIDR(splitDiff)}
                    </span>
                  ) : (
                    <span className="text-green-400 font-bold uppercase tracking-wider">
                      ✓ Pas
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Other Mode */}
            {paymentMethod === "other" && (
              <div className="space-y-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                <div>
                  <label className="text-white/60 text-xs mb-1.5 block font-medium">
                    Label Metode Pembayaran
                  </label>
                  <input
                    type="text"
                    value={otherLabel}
                    onChange={(e) => setOtherLabel(e.target.value)}
                    placeholder='contoh: "Baymun", "Kasbon", "Debit BCA"'
                    className="w-full h-10 px-3.5 rounded-lg text-sm text-white placeholder-white/20 outline-none focus:border-amber-400/50 transition-all"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.12)",
                    }}
                  />
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-white/40">Total Pembayaran</span>
                  <span className="text-white font-mono font-bold text-sm">
                    {formatIDR(total)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Line Items */}
          <div className="space-y-3 pt-2 border-t border-white/5">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-bold text-white/40 uppercase tracking-[0.15em] flex items-center gap-2">
                <PackagePlus className="w-3.5 h-3.5" /> Item Produk ({editedItems.length})
              </h3>
            </div>

            {/* Add Product Combobox */}
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSearchOpen(true);
                  }}
                  onFocus={() => setSearchOpen(true)}
                  placeholder="+ Tambah produk / cari SKU..."
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.12)",
                  }}
                  className="w-full h-10 rounded-xl pl-10 pr-4 text-xs text-white placeholder:text-white/30 outline-none focus:border-amber-400/50 transition-all"
                />
              </div>

              {/* Dropdown Results */}
              {searchOpen && (
                <div
                  ref={searchDropdownRef}
                  className="absolute left-0 right-0 top-full mt-1.5 z-50 max-h-[240px] overflow-y-auto rounded-xl shadow-2xl custom-scrollbar"
                  style={{
                    background: "rgba(18,18,18,0.98)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    backdropFilter: "blur(20px)",
                  }}
                >
                  {filteredSearchItems.length > 0 ? (
                    filteredSearchItems.map((item, idx) => (
                      <button
                        key={`${item.id}-${item.variantId || idx}`}
                        type="button"
                        onClick={() => handleAddProduct(item)}
                        className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-white/10 transition-colors text-left border-b border-white/5 last:border-0"
                      >
                        <div className="flex flex-col min-w-0 pr-3">
                          <span className="text-xs font-semibold text-white/90 truncate">
                            {item.productName}
                          </span>
                          <div className="flex items-center gap-2 mt-0.5">
                            {item.variantName && (
                              <span className="text-[10px] text-blue-400 bg-blue-500/20 px-1.5 py-0.2 rounded font-medium">
                                {item.variantName}
                              </span>
                            )}
                            {item.sku && (
                              <span className="text-[10px] font-mono text-white/40">
                                {item.sku}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-xs font-mono font-bold text-amber-400">
                            {formatIDR(item.price)}
                          </span>
                          <span className="block text-[10px] text-white/30">
                            Stok: {item.stock}
                          </span>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-6 text-center text-xs text-white/30">
                      Tidak ada produk ditemukan
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Items List */}
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
              {editedItems.length === 0 ? (
                <div className="text-center py-6 text-xs text-white/30 border border-dashed border-white/10 rounded-xl">
                  Tidak ada item dalam order. Tambahkan produk di atas.
                </div>
              ) : (
                editedItems.map((item, index) => (
                  <div
                    key={`${item.productId}-${item.variationId || index}`}
                    className="p-3 rounded-xl flex items-center justify-between gap-3"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    {/* Item Info */}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-white truncate">
                        {item.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {item.variantName && (
                          <span className="text-[10px] text-blue-400 bg-blue-500/20 px-1.5 py-0.5 rounded font-medium">
                            {item.variantName}
                          </span>
                        )}
                        <span className="text-[10px] font-mono text-white/40">
                          {formatIDR(item.price)} / unit
                        </span>
                      </div>
                    </div>

                    {/* Qty Controls */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(index, item.quantity - 1)}
                        className="h-7 w-7 rounded-lg flex items-center justify-center text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                        style={{
                          background: "rgba(255,255,255,0.06)",
                          border: "1px solid rgba(255,255,255,0.1)",
                        }}
                      >
                        <Minus className="w-3 h-3" />
                      </button>

                      <input
                        type="number"
                        min={1}
                        max={999}
                        value={item.quantity}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val)) handleUpdateQty(index, val);
                        }}
                        className="w-10 text-center font-mono text-xs font-bold text-white bg-transparent outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        style={{ borderBottom: "1px solid rgba(255,255,255,0.2)" }}
                      />

                      <button
                        type="button"
                        onClick={() => handleUpdateQty(index, item.quantity + 1)}
                        className="h-7 w-7 rounded-lg flex items-center justify-center text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                        style={{
                          background: "rgba(255,255,255,0.06)",
                          border: "1px solid rgba(255,255,255,0.1)",
                        }}
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Line Total */}
                    <div className="text-right shrink-0 w-24">
                      <span className="text-xs font-mono font-bold text-white">
                        {formatIDR(item.price * item.quantity)}
                      </span>
                    </div>

                    {/* Delete Button */}
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="p-1 text-white/20 hover:text-red-400 transition-colors shrink-0"
                      title="Hapus item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Running Total Card */}
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5 text-xs">
              <div className="flex justify-between text-white/50">
                <span>Subtotal ({editedItems.reduce((s, i) => s + i.quantity, 0)} item)</span>
                <span className="font-mono">{formatIDR(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-green-400">
                  <span>Diskon Order</span>
                  <span className="font-mono">-{formatIDR(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-white/5">
                <span className="text-sm font-bold text-white">Total Baru</span>
                <span className="text-base font-bold font-mono text-amber-400">
                  {formatIDR(total)}
                </span>
              </div>
            </div>
          </div>

          {/* Error Message Inline */}
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 flex items-start gap-2.5 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 flex items-center justify-end gap-3 shrink-0 bg-white/[0.02]">
          <button
            type="button"
            onClick={onClose}
            disabled={editOrderMutation.isPending}
            className="px-5 h-11 rounded-xl text-white/60 text-sm font-medium hover:bg-white/5 transition-all"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave || editOrderMutation.isPending}
            className="px-6 h-11 rounded-xl text-sm font-bold bg-amber-500 hover:bg-amber-400 text-gray-950 shadow-lg shadow-amber-500/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {editOrderMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-gray-950" />
                <span>Menyimpan ke WooCommerce...</span>
              </>
            ) : (
              <span>Simpan Perubahan</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
