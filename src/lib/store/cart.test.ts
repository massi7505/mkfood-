import { useCartStore } from './cart';
import { beforeEach, describe, expect, it } from 'vitest';

describe('cart store', () => {
  beforeEach(() => {
    useCartStore.setState({ items: [], isOpen: false });
  });

  it('adds and increments an existing product', () => {
    const product = {
      productId: '42',
      ref: 'ART-42',
      label: 'Article',
      priceHt: 10,
      tva: 20,
      qty: 2
    };

    useCartStore.getState().addItem(product);
    useCartStore.getState().addItem({ ...product, qty: 3 });

    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0].qty).toBe(5);
  });

  it('removes an item when quantity is zero', () => {
    useCartStore.getState().addItem({
      productId: '42',
      ref: 'ART-42',
      label: 'Article',
      priceHt: 10,
      tva: 20,
      qty: 1
    });

    useCartStore.getState().updateQty('42', 0);

    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it('computes totals', () => {
    useCartStore.getState().addItem({
      productId: '42',
      ref: 'ART-42',
      label: 'Article',
      priceHt: 10,
      tva: 20,
      qty: 2
    });

    expect(useCartStore.getState().totalItems()).toBe(2);
    expect(useCartStore.getState().totalHt()).toBe(20);
    expect(useCartStore.getState().tvaAmount()).toBe(4);
    expect(useCartStore.getState().totalTtc()).toBe(24);
  });
});
