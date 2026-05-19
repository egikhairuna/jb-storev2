import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, Product, POSOrder } from '@/types/pos';

interface CartStore {
  items: CartItem[];
  products: Product[];
  setProducts: (products: Product[]) => void;
  addItem: (product: Product, variantId?: string) => void;
  removeItem: (productId: string, variantId?: string) => void;
  updateQty: (productId: string, qty: number, variantId?: string) => void;
  clearCart: () => void;
  offlineQueue: POSOrder[];
  queueOrder: (order: POSOrder) => void;
  markSynced: (offlineId: string, wcOrderId: number) => void;
  markFailed: (offlineId: string, error: string) => void;
  pendingCount: () => number;
  // Checkout-level fields (reset on clearCart)
  discountType: 'percent' | 'nominal' | null;
  discountValue: number;
  customerName: string;
  orderNote: string;
  setDiscount: (type: 'percent' | 'nominal' | null, value: number) => void;
  setCustomerName: (name: string) => void;
  setOrderNote: (note: string) => void;
  // Computed
  subtotal: () => number;
  discountAmount: () => number;
  total: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      products: [],
      setProducts: (products) => set({ products }),
      addItem: (product, variantId) => {
        set((state) => {
          const existingItemIndex = state.items.findIndex(
            (i) => i.id === product.id && i.variantId === variantId
          );
          
          let maxStock = product.stock;
          let variantName = undefined;
          let variantSku = undefined;
          
          if (variantId && product.variants) {
            const variant = product.variants.find(v => v.id === variantId);
            if (variant) {
              maxStock = variant.stock;
              variantName = variant.name;
              variantSku = variant.sku;
            }
          }

          if (existingItemIndex > -1) {
            const newItems = [...state.items];
            const currentItem = newItems[existingItemIndex];
            const newQty = Math.min(currentItem.quantity + 1, maxStock);
            
            newItems[existingItemIndex] = {
              ...currentItem,
              quantity: newQty
            };
            
            return { items: newItems };
          }

          const newItem: CartItem = {
            ...product,
            quantity: Math.min(1, maxStock),
            variantId,
            variantName,
            sku: variantSku || product.sku,
          };
          
          return { items: [...state.items, newItem] };
        });
      },
      removeItem: (productId, variantId) => {
        set((state) => ({
          items: state.items.filter(
            (i) => !(i.id === productId && i.variantId === variantId)
          )
        }));
      },
      updateQty: (productId, qty, variantId) => {
        set((state) => {
          const newItems = state.items.map(item => {
            if (item.id === productId && item.variantId === variantId) {
              let maxStock = item.stock;
              if (variantId && item.variants) {
                 const v = item.variants.find(v => v.id === variantId);
                 if (v) maxStock = v.stock;
              }
              return { ...item, quantity: Math.min(Math.max(1, qty), maxStock) };
            }
            return item;
          });
          return { items: newItems };
        });
      },
      clearCart: () => set({ 
        items: [], 
        discountType: null, 
        discountValue: 0, 
        customerName: '', 
        orderNote: '' 
      }),
      offlineQueue: [],
      queueOrder: (order) => set((state) => ({ offlineQueue: [...state.offlineQueue, order] })),
      markSynced: (offlineId, wcOrderId) => set((state) => ({
        offlineQueue: state.offlineQueue.map(order => 
          order.offline_id === offlineId 
            ? { ...order, status: 'synced', wc_order_id: wcOrderId }
            : order
        )
      })),
      markFailed: (offlineId, error) => set((state) => ({
        offlineQueue: state.offlineQueue.map(order => 
          order.offline_id === offlineId 
            ? { ...order, status: 'failed', note: error }
            : order
        )
      })),
      pendingCount: () => get().offlineQueue.filter(o => o.status === 'pending' || o.status === 'failed').length,
      discountType: null,
      discountValue: 0,
      customerName: '',
      orderNote: '',
      setDiscount: (type, value) => set({ discountType: type, discountValue: value }),
      setCustomerName: (name) => set({ customerName: name }),
      setOrderNote: (note) => set({ orderNote: note }),
      subtotal: () => get().items.reduce((sum, item) => sum + item.price * item.quantity, 0),
      discountAmount: () => {
        const sub = get().subtotal();
        const type = get().discountType;
        const val = get().discountValue;
        if (type === 'percent') return (sub * val) / 100;
        if (type === 'nominal') return val;
        return 0;
      },
      total: () => get().subtotal() - get().discountAmount(),
    }),
    {
      name: 'pos-storage-v3',
      partialize: (state) => ({
        items: state.items,
        offlineQueue: state.offlineQueue,
        products: state.products
      }),
    }
  )
);
