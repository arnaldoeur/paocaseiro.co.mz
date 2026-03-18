import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface CartItem {
    name: string;
    price: number;
    quantity: number;
    image?: string;
    isSpecial?: boolean;
    prepTime?: string;
    deliveryTime?: string;
    name_en?: string;
}

interface CartContextType {
    cart: CartItem[];
    addToCart: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
    removeFromCart: (itemName: string) => void;
    clearCart: () => void;
    total: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [cart, setCart] = useState<CartItem[]>(() => {
        const saved = localStorage.getItem('cart');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        localStorage.setItem('cart', JSON.stringify(cart));
    }, [cart]);

    const addToCart = (newItem: Omit<CartItem, 'quantity'> & { quantity?: number }) => {
        setCart((prevCart) => {
            const existingItem = prevCart.find((item) => item.name === newItem.name);
            const qty = newItem.quantity || 1; // Default to 1 if not provided, but allow negatives via this too? 
            // Wait, logic from Cart.tsx was passing { ...item, quantity: 1 } or -1. 
            // But here I'm modifying to support `quantity` as input correctly.

            if (existingItem) {
                const newQuantity = existingItem.quantity + qty;
                if (newQuantity <= 0) {
                    return prevCart.filter(item => item.name !== newItem.name);
                }

                return prevCart.map((item) =>
                    item.name === newItem.name ? { ...item, quantity: newQuantity } : item
                );
            }
            // If item doesn't exist and qty is positive
            if (qty > 0) {
                return [...prevCart, { ...newItem, quantity: qty }];
            }
            return prevCart;
        });
    };

    const removeFromCart = (itemName: string) => {
        setCart((prevCart) => prevCart.filter((item) => item.name !== itemName));
    };

    const clearCart = () => setCart([]);

    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    return (
        <CartContext.Provider value={{ cart, addToCart, removeFromCart, clearCart, total }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
};
