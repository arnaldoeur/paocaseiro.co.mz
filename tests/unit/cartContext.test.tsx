import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { CartProvider, useCart, CartItem } from '../../context/CartContext';

// ──────────────────────────────────────────────
// Unit Tests: CartContext
// ──────────────────────────────────────────────

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <CartProvider>{children}</CartProvider>
);

describe('CartContext', () => {
  describe('initial state', () => {
    it('starts with an empty cart', () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      expect(result.current.cart).toEqual([]);
      expect(result.current.total).toBe(0);
    });

    it('restores cart from localStorage', () => {
      const savedCart: CartItem[] = [
        { name: 'Pão Caseiro', price: 50, quantity: 2 },
        { name: 'Café Espresso', price: 30, quantity: 1 },
      ];
      localStorage.setItem('cart', JSON.stringify(savedCart));

      const { result } = renderHook(() => useCart(), { wrapper });
      expect(result.current.cart).toHaveLength(2);
      expect(result.current.total).toBe(130); // 50*2 + 30*1
    });

    it('handles corrupted localStorage gracefully', () => {
      localStorage.setItem('cart', 'invalid-json{{{');

      const { result } = renderHook(() => useCart(), { wrapper });
      expect(result.current.cart).toEqual([]);
    });

    it('handles non-array localStorage value gracefully', () => {
      localStorage.setItem('cart', JSON.stringify({ not: 'an-array' }));

      const { result } = renderHook(() => useCart(), { wrapper });
      expect(result.current.cart).toEqual([]);
    });
  });

  describe('addToCart', () => {
    it('adds a new item to the cart', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addToCart({ name: 'Pão Caseiro', price: 50 });
      });

      expect(result.current.cart).toHaveLength(1);
      expect(result.current.cart[0].name).toBe('Pão Caseiro');
      expect(result.current.cart[0].quantity).toBe(1);
      expect(result.current.total).toBe(50);
    });

    it('increments quantity for existing item', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addToCart({ name: 'Pão Caseiro', price: 50 });
      });
      act(() => {
        result.current.addToCart({ name: 'Pão Caseiro', price: 50 });
      });

      expect(result.current.cart).toHaveLength(1);
      expect(result.current.cart[0].quantity).toBe(2);
      expect(result.current.total).toBe(100);
    });

    it('adds multiple different items', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addToCart({ name: 'Pão Caseiro', price: 50 });
      });
      act(() => {
        result.current.addToCart({ name: 'Café', price: 30 });
      });

      expect(result.current.cart).toHaveLength(2);
      expect(result.current.total).toBe(80);
    });

    it('supports custom quantity', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addToCart({ name: 'Donuts', price: 25, quantity: 5 });
      });

      expect(result.current.cart[0].quantity).toBe(5);
      expect(result.current.total).toBe(125);
    });

    it('removes item when quantity reaches zero via negative add', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addToCart({ name: 'Pão', price: 50 });
      });
      act(() => {
        result.current.addToCart({ name: 'Pão', price: 50, quantity: -1 });
      });

      expect(result.current.cart).toHaveLength(0);
      expect(result.current.total).toBe(0);
    });

    it('treats zero quantity as 1 (falsy default)', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addToCart({ name: 'Ghost', price: 100, quantity: 0 });
      });

      // CartContext uses `quantity || 1`, so 0 defaults to 1
      expect(result.current.cart).toHaveLength(1);
      expect(result.current.cart[0].quantity).toBe(1);
    });

    it('preserves item metadata (image, isSpecial, etc.)', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addToCart({
          name: 'Special Cake',
          price: 200,
          image: '/cake.jpg',
          isSpecial: true,
          prepTime: '30min',
        });
      });

      expect(result.current.cart[0].image).toBe('/cake.jpg');
      expect(result.current.cart[0].isSpecial).toBe(true);
      expect(result.current.cart[0].prepTime).toBe('30min');
    });
  });

  describe('removeFromCart', () => {
    it('removes an item by name', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addToCart({ name: 'Item A', price: 10 });
        result.current.addToCart({ name: 'Item B', price: 20 });
      });

      act(() => {
        result.current.removeFromCart('Item A');
      });

      expect(result.current.cart).toHaveLength(1);
      expect(result.current.cart[0].name).toBe('Item B');
    });

    it('does nothing when removing non-existent item', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addToCart({ name: 'Item A', price: 10 });
      });

      act(() => {
        result.current.removeFromCart('Non-existent');
      });

      expect(result.current.cart).toHaveLength(1);
    });
  });

  describe('clearCart', () => {
    it('clears all items from the cart', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addToCart({ name: 'Item 1', price: 10 });
        result.current.addToCart({ name: 'Item 2', price: 20 });
        result.current.addToCart({ name: 'Item 3', price: 30 });
      });

      act(() => {
        result.current.clearCart();
      });

      expect(result.current.cart).toHaveLength(0);
      expect(result.current.total).toBe(0);
    });
  });

  describe('total calculation', () => {
    it('correctly calculates total for multiple items', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addToCart({ name: 'A', price: 100, quantity: 2 });
        result.current.addToCart({ name: 'B', price: 50, quantity: 3 });
      });

      // 100*2 + 50*3 = 350
      expect(result.current.total).toBe(350);
    });

    it('handles items with zero price', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addToCart({ name: 'Freebie', price: 0, quantity: 5 });
      });

      expect(result.current.total).toBe(0);
    });

    it('handles prices with decimal points', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addToCart({ name: 'Café', price: 29.99, quantity: 2 });
      });

      expect(result.current.total).toBeCloseTo(59.98);
    });
  });

  describe('localStorage persistence', () => {
    it('saves cart to localStorage on changes', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addToCart({ name: 'Pão', price: 50 });
      });

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'cart',
        expect.stringContaining('Pão')
      );
    });
  });

  describe('useCart outside provider', () => {
    it('throws error when used outside CartProvider', () => {
      expect(() => {
        renderHook(() => useCart());
      }).toThrow('useCart must be used within a CartProvider');
    });
  });
});
