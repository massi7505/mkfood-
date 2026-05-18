'use client';

import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface CartItem {
  productId: string;
  ref: string;
  label: string;
  priceHt: number;
  tva: number;
  qty: number;
  imageUrl?: string;
}

export interface CartStore {
  items: CartItem[];
  isOpen: boolean;
  addItem: (product: CartItem) => void;
  updateQty: (productId: string, qty: number) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
  openCart: () => void;
  closeCart: () => void;
  totalItems: () => number;
  totalHt: () => number;
  totalTtc: () => number;
  tvaAmount: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      addItem: (product) =>
        set((state) => {
          const existingItem = state.items.find((item) => item.productId === product.productId);

          if (existingItem) {
            return {
              items: state.items.map((item) =>
                item.productId === product.productId
                  ? { ...item, qty: item.qty + product.qty }
                  : item
              )
            };
          }

          return { items: [...state.items, product] };
        }),
      updateQty: (productId, qty) =>
        set((state) => {
          if (qty <= 0) {
            return { items: state.items.filter((item) => item.productId !== productId) };
          }

          return {
            items: state.items.map((item) =>
              item.productId === productId ? { ...item, qty } : item
            )
          };
        }),
      removeItem: (productId) =>
        set((state) => ({ items: state.items.filter((item) => item.productId !== productId) })),
      clear: () => set({ items: [] }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      totalItems: () => get().items.reduce((total, item) => total + item.qty, 0),
      totalHt: () => get().items.reduce((total, item) => total + item.priceHt * item.qty, 0),
      tvaAmount: () =>
        get().items.reduce((total, item) => total + item.priceHt * item.qty * (item.tva / 100), 0),
      totalTtc: () => get().totalHt() + get().tvaAmount()
    }),
    {
      name: 'portail-b2b-cart',
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (state) => ({ items: state.items })
    }
  )
);

export function useCartHydration() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(useCartStore.persist.hasHydrated());
    const unsubscribe = useCartStore.persist.onFinishHydration(() => setHydrated(true));
    useCartStore.persist.rehydrate();
    return unsubscribe;
  }, []);

  return hydrated;
}
