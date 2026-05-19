import { create } from "zustand";
import { BarcodeItem } from "@/types/pos";

interface BarcodeStore {
  items: BarcodeItem[];
  addItem: (item: BarcodeItem) => void;
  updateQuantity: (index: number, quantity: number) => void;
  removeItem: (index: number) => void;
  clearAll: () => void;
}

export const useBarcodeStore = create<BarcodeStore>((set) => ({
  items: [],
  addItem: (item) => set((state) => {
    // Check if item already exists in queue to increment quantity instead of adding new row
    const existingIndex = state.items.findIndex(i => i.id === item.id && i.variantId === item.variantId);
    if (existingIndex > -1) {
      const newItems = [...state.items];
      newItems[existingIndex] = {
        ...newItems[existingIndex],
        quantity: newItems[existingIndex].quantity + item.quantity
      };
      return { items: newItems };
    }
    return { items: [...state.items, item] };
  }),
  updateQuantity: (index, quantity) => set((state) => {
    const newItems = [...state.items];
    if (newItems[index]) {
      newItems[index] = {
        ...newItems[index],
        quantity: Math.max(1, Math.min(99, quantity))
      };
    }
    return { items: newItems };
  }),
  removeItem: (index) => set((state) => ({
    items: state.items.filter((_, i) => i !== index),
  })),
  clearAll: () => set({ items: [] }),
}));
