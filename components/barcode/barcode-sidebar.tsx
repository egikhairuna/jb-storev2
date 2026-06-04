"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { Search, Minus, Plus, Trash2 } from "lucide-react";
import { useCartStore } from "@/store/cart.store";
import { useBarcodeStore } from "@/lib/store/barcode-store";
import type { BarcodeItem } from "@/types/pos";

interface SearchItem {
  id: string;
  variantId?: string;
  productName: string;
  variantName?: string;
  sku: string;
  price: number;
  type: "product" | "variant";
}

export const BarcodeSidebar = () => {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const products = useCartStore((s) => s.products);
  const { items, addItem, updateQuantity, removeItem } =
    useBarcodeStore();

  // Flatten products into searchable items
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
            type: "variant",
          });
        }
      } else {
        result.push({
          id: p.id,
          productName: p.name,
          sku: p.sku || "",
          price: p.price,
          type: "product",
        });
      }
    }
    return result;
  }, [products]);

  // Filter by search value
  const filtered = useMemo(() => {
    if (!value.trim()) return searchItems.slice(0, 30);
    const q = value.toLowerCase();
    return searchItems.filter(
      (item) =>
        item.productName.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        (item.variantName?.toLowerCase() || "").includes(q)
    );
  }, [searchItems, value]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (item: SearchItem) => {
    const newItem: BarcodeItem = {
      id: item.id,
      variantId: item.variantId,
      productName: item.productName,
      variantName: item.variantName,
      sku: item.sku || item.id,
      price: item.price,
      quantity: 1,
    };
    addItem(newItem);
    setOpen(false);
    setValue("");
  };

  const totalLabels = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <aside
      className="h-full flex flex-col"
      style={{
        background: "rgba(255,255,255,0.05)",
        borderRight: "1px solid rgba(255,255,255,0.1)",
      }}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3 shrink-0">
        <h2 className="text-[10px] font-bold text-white/50 uppercase tracking-[0.2em] mb-3">
          Barcode Queue
        </h2>

        {/* Search Combobox */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Search product or SKU..."
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
            className="w-full h-9 rounded-lg pl-9 pr-3 text-xs text-white placeholder:text-white/30 outline-none focus:border-white/25 transition-all"
          />

          {/* Dropdown */}
          {open && (
            <div
              ref={dropdownRef}
              className="absolute left-0 right-0 top-full mt-1 z-50 max-h-[280px] overflow-y-auto rounded-lg shadow-2xl"
              style={{
                background: "rgba(20,20,20,0.98)",
                border: "1px solid rgba(255,255,255,0.12)",
                backdropFilter: "blur(20px)",
              }}
            >
              {filtered.length > 0 ? (
                filtered.map((item, idx) => (
                  <button
                    key={`${item.id}-${item.variantId || idx}`}
                    onClick={() => handleSelect(item)}
                    className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-white/10 transition-colors text-left border-b border-white/5 last:border-0"
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="text-xs font-medium text-white/80 truncate">
                        {item.productName}
                      </span>
                      {item.variantName && (
                        <span className="text-[10px] text-blue-400 bg-blue-500/20 px-1.5 py-0.5 rounded mt-0.5 w-fit">
                          {item.variantName}
                        </span>
                      )}
                    </div>
                    <div className="shrink-0">
                      {item.sku ? (
                        <span className="text-[9px] font-mono text-white/50 bg-white/5 px-1.5 py-0.5 rounded border border-white/10">
                          {item.sku}
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded border border-red-400/20">
                          NO SKU
                        </span>
                      )}
                    </div>
                  </button>
                ))
              ) : (
                <div className="px-4 py-6 text-center text-xs text-white/30">
                  No products found
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Queue List */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/20">
        {items.length > 0 ? (
          <div className="flex flex-col gap-2">
            {items.map((item, idx) => (
              <div
                key={`${item.id}-${item.variantId || idx}`}
                className="rounded-lg p-3"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                {/* Product name + delete */}
                <div className="flex justify-between items-start mb-1.5">
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-medium text-white/80 line-clamp-1">
                      {item.productName}
                    </p>
                    {item.variantName && (
                      <span className="text-[10px] text-blue-400 bg-blue-500/20 px-1.5 py-0.5 rounded inline-block mt-0.5">
                        {item.variantName}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => removeItem(idx)}
                    className="text-white/20 hover:text-red-400 transition-colors shrink-0 p-0.5"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* SKU */}
                <p className="text-[10px] text-white/40 font-mono mb-2">
                  {item.sku || "NO SKU"}
                </p>

                {/* Quantity controls */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => updateQuantity(idx, item.quantity - 1)}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-white/60 hover:bg-white/15 transition-colors"
                    style={{
                      background: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(255,255,255,0.12)",
                    }}
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={item.quantity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (!isNaN(val)) updateQuantity(idx, val);
                    }}
                    onBlur={(e) => {
                      const val = parseInt(e.target.value);
                      if (isNaN(val) || val < 1) updateQuantity(idx, 1);
                    }}
                    className="w-10 bg-transparent text-center font-mono text-sm font-medium text-white focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.2)" }}
                  />
                  <button
                    type="button"
                    onClick={() => updateQuantity(idx, item.quantity + 1)}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-white/60 hover:bg-white/15 transition-colors"
                    style={{
                      background: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(255,255,255,0.12)",
                    }}
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Search className="h-8 w-8 text-white/10 mb-2" />
            <p className="text-xs text-white/20">Your queue is empty</p>
          </div>
        )}
      </div>

      {/* Footer */}
      {items.length > 0 && (
        <div
          className="px-4 py-3 flex items-center justify-between shrink-0"
          style={{
            borderTop: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(0,0,0,0.2)",
          }}
        >
          <span className="text-xs text-white/50">Total Labels</span>
          <span className="text-xs font-bold text-white/80 bg-white/10 px-2.5 py-0.5 rounded-full border border-white/10">
            {totalLabels}
          </span>
        </div>
      )}
    </aside>
  );
};
