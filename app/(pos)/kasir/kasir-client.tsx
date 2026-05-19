"use client";

import React, { useState, useEffect, useRef } from "react";
import { useProducts } from "@/hooks/use-products";
import { useCartStore } from "@/store/cart.store";
import { KEYBOARD_SHORTCUTS } from "@/lib/constants";
import { POSHeader } from "@/components/pos/pos-header";
import { ProductCard } from "@/components/pos/product-card";
import { CartPanel } from "@/components/pos/cart-panel";
import { PaymentModal } from "@/components/pos/payment-modal";
import { SidebarNav } from "@/components/pos/sidebar-nav";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { VariantDialog } from "@/components/pos/variant-dialog";
import type { Product } from "@/types/pos";

export default function KasirPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [selectedProductForVariants, setSelectedProductForVariants] = useState<Product | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useProducts({
    search: searchQuery,
    page: page,
    per_page: 24
  });

  const products = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 24);

  const { addItem, clearCart } = useCartStore();

  // Reset page when search changes
  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === KEYBOARD_SHORTCUTS.FOCUS_SEARCH) {
        if (document.activeElement?.tagName !== "INPUT") {
          e.preventDefault();
          searchRef.current?.focus();
        }
      }
      if (e.key === KEYBOARD_SHORTCUTS.CLEAR_CART) {
        if (!isPaymentModalOpen) {
          clearCart();
        } else {
          setIsPaymentModalOpen(false);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [clearCart, isPaymentModalOpen]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-transparent">
      <SidebarNav />

      <main className="flex flex-1 overflow-hidden">
        {/* Left: CartPanel */}
        <aside className="shrink-0">
          <CartPanel onCheckout={() => setIsPaymentModalOpen(true)} />
        </aside>

        {/* Right: ProductArea */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <POSHeader
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchRef={searchRef}
          />

          <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/20">
            {isLoading ? (
              <div className="grid grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="aspect-square animate-pulse rounded-xl bg-gray-200" />
                ))}
              </div>
            ) : products.length > 0 ? (
              <div className="grid grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAdd={(variantId) => addItem(product, variantId)}
                    onOpenVariants={(p) => setSelectedProductForVariants(p)}
                  />
                ))}
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-gray-400 py-20">
                <p className="text-sm">Produk tidak ditemukan</p>
              </div>
            )}
          </div>

          {/* Pagination UI */}
          {!isLoading && total > 0 && (
            <div 
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              }}
              className="flex items-center justify-between px-4 py-3 sticky bottom-0"
            >
              <div className="text-sm text-gray-500">
                Showing <span className="font-medium text-white/80">{(page - 1) * 24 + 1}</span>–
                <span className="font-medium text-white/80">{Math.min(page * 24, total)}</span> of{" "}
                <span className="font-medium text-white/80">{total}</span> products
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                
                <span className="px-2 text-sm text-white/60 font-medium">
                  Page {page} of {totalPages}
                </span>
                
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Variant Selection Modal */}
      <VariantDialog
        product={selectedProductForVariants}
        onClose={() => setSelectedProductForVariants(null)}
        onSelect={(pId, vId) => {
          const product = products.find(p => p.id === pId);
          if (product) addItem(product, vId);
          setSelectedProductForVariants(null);
        }}
      />

      {/* Payment Modal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
      />
    </div>
  );
}


