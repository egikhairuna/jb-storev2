"use client";

import React, { useState, useMemo } from "react";
import { Search, Printer, X, Minus, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useBarcodeStore } from "@/lib/store/barcode-store";
import { BarcodeItem, Product } from "@/types/pos";

export const BarcodeSidebar = () => {
  const [searchQuery, setSearchQuery] = useState("");
  
  // Note: if products are missing, trigger a Sync from the Kasir page
  // to re-fetch all products from WooCommerce into local DB
  const { data: productsData } = useQuery({
    queryKey: ['barcode-products'],
    queryFn: async () => {
      const res = await fetch('/api/products?per_page=999&page=1')
      const json = await res.json()
      return json.data as Product[]
    },
    staleTime: 60_000,
  })
  
  const products = useMemo(() => productsData ?? [], [productsData]);

  const { items, addItem, updateQuantity, removeItem, clearAll } = useBarcodeStore();

  // Flatten products and variants for search
  const searchResults = useMemo(() => {
    if (searchQuery.length < 1) return [];

    const query = searchQuery.toLowerCase();
    const results: Array<{ 
      id: string; 
      productName: string; 
      variantId?: string; 
      variantName?: string; 
      sku: string; 
      price: number;
    }> = [];

    products.forEach((p) => {
      if (p.variants && p.variants.length > 0) {
        p.variants.forEach((v) => {
          if (
            p.name.toLowerCase().includes(query) || 
            (v.sku?.toLowerCase() || "").includes(query) ||
            v.name.toLowerCase().includes(query)
          ) {
            results.push({
              id: p.id,
              productName: p.name,
              variantId: v.id,
              variantName: v.name,
              sku: v.sku || "",
              price: v.price,
            });
          }
        });
      } else {
        if (
          p.name.toLowerCase().includes(query) || 
          (p.sku?.toLowerCase() || "").includes(query)
        ) {
          results.push({
            id: p.id,
            productName: p.name,
            sku: p.sku || "",
            price: p.price,
          });
        }
      }
    });

    return results;
  }, [products, searchQuery]);

  const handleSelectItem = (res: { 
    id: string; 
    productName: string; 
    variantId?: string; 
    variantName?: string; 
    sku: string; 
    price: number;
  }) => {
    const newItem: BarcodeItem = {
      id: res.id,
      productName: res.productName,
      variantId: res.variantId,
      variantName: res.variantName,
      sku: res.sku || res.id, // Fallback to ID if no SKU
      price: res.price,
      quantity: 1,
    };
    addItem(newItem);
    setSearchQuery("");
  };

  const totalLabelCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <aside 
      style={{
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(30px) saturate(160%)',
        WebkitBackdropFilter: 'blur(30px) saturate(160%)',
        borderRight: '1px solid rgba(255,255,255,0.15)',
      }}
      className="w-[300px] h-full flex flex-col shrink-0"
    >
      {/* SEARCH SECTION */}
      <div className="flex flex-col border-b border-white/10">
        <h2 className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] px-4 pt-4 pb-2">
          Choose Product
        </h2>
        <div className="px-4 pb-3 relative">
          <Search className="absolute left-7 top-1/2 -translate-y-1/2 -mt-1.5 h-3.5 w-3.5 text-white/30" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Find Name or SKU..."
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.15)',
            }}
            className="w-full h-9 rounded-lg pl-9 pr-4 text-sm text-white placeholder:text-white/30 outline-none focus:ring-2 focus:ring-white/10 transition-all"
          />
        </div>

        {searchQuery.length > 0 && (
          <div className="max-h-[280px] overflow-y-auto border-t border-white/5 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/20">
            {searchResults.length > 0 ? (
              searchResults.map((res, idx) => (
                <div
                  key={`${res.id}-${res.variantId || idx}`}
                  onClick={() => handleSelectItem(res)}
                  className="px-4 py-2.5 hover:bg-white/10 cursor-pointer flex justify-between items-center transition-colors border-b border-white/5 last:border-0"
                >
                  <div className="flex flex-col min-w-0 pr-2">
                    <span className="text-sm font-medium text-white/90 truncate">
                      {res.productName}
                    </span>
                    {res.variantName && (
                      <span className="text-[10px] text-white/40">
                        {res.variantName}
                      </span>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    {res.sku ? (
                      <span className="text-[9px] font-mono text-white/50 bg-white/5 px-1.5 py-0.5 rounded border border-white/10">
                        {res.sku}
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded border border-red-400/20">
                        NO SKU
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-xs text-white/30">
                Product Not Found
              </div>
            )}
          </div>
        )}
      </div>

      {/* QUEUE SECTION */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h2 className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">
            Print Queue
          </h2>
          {items.length > 0 && (
            <span className="bg-white/10 text-white/80 text-[10px] font-bold px-2 py-0.5 rounded-full border border-white/10">
              {totalLabelCount}
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/20">
          {items.length > 0 ? (
            <div className="flex flex-col">
              {items.map((item, idx) => (
                <div
                  key={`${item.id}-${item.variantId || idx}`}
                  className="px-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors group"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="min-w-0 pr-2">
                      <p className="text-sm font-medium text-white/90 line-clamp-1">
                        {item.productName}
                      </p>
                      {item.variantName && (
                        <p className="text-[11px] text-white/40">
                          {item.variantName}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => removeItem(idx)}
                      className="text-white/20 hover:text-red-400 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => updateQuantity(idx, item.quantity - 1)}
                      style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-white/60 hover:bg-white/20 transition-colors"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <input
                      type="number"
                      min="1"
                      max="99"
                      value={item.quantity}
                      onChange={(e) => updateQuantity(idx, parseInt(e.target.value) || 1)}
                      className="w-10 bg-transparent text-center font-mono text-sm font-medium text-white focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [font-feature-settings:'tnum']"
                    />
                    <button
                      type="button"
                      onClick={() => updateQuantity(idx, item.quantity + 1)}
                      style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-white/60 hover:bg-white/20 transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <Printer className="h-8 w-8 text-white/10 mb-2" />
              <p className="text-xs text-white/20 uppercase tracking-widest">Empty Queue</p>
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div 
            style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}
            className="p-4 sticky bottom-0"
          >
            <button
              onClick={clearAll}
              style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}
              className="w-full h-10 text-red-400 hover:bg-red-400/20 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 uppercase tracking-widest"
            >
              Clear All
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
