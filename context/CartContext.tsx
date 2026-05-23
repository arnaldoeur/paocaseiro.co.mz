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
    setCart: (items: CartItem[]) => void;
    restoreBackupCart: () => void;
    total: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [cart, setCart] = useState<CartItem[]>(() => {
        try {
            const saved = localStorage.getItem('cart');
            if (!saved) return [];
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) {
                return parsed.map(item => ({
                    ...item,
                    price: Number(item.price) || 0,
                    quantity: Number(item.quantity) || 1
                }));
            }
            return [];
        } catch(e) {
            return [];
        }
    });

    useEffect(() => {
        localStorage.setItem('cart', JSON.stringify(cart));
    }, [cart]);

    const addToCart = (newItem: Omit<CartItem, 'quantity'> & { quantity?: number }) => {
        setCart((prevCart) => {
            const existingItem = prevCart.find((item) => item.name === newItem.name);
            const qty = newItem.quantity || 1;

            if (existingItem) {
                const newQuantity = existingItem.quantity + qty;
                if (newQuantity <= 0) {
                    return prevCart.filter(item => item.name !== newItem.name);
                }
                return prevCart.map((item) =>
                    item.name === newItem.name ? { ...item, quantity: newQuantity } : item
                );
            }
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

    /**
     * Restores a previously backed-up cart from localStorage key 'cancelled_cart_backup'.
     * Called when the user cancels a payment and wants to try again.
     */
    const restoreBackupCart = () => {
        try {
            const backup = localStorage.getItem('cancelled_cart_backup');
            if (backup) {
                const parsed = JSON.parse(backup);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setCart(parsed.map(item => ({
                        ...item,
                        price: Number(item.price) || 0,
                        quantity: Number(item.quantity) || 1
                    })));
                    localStorage.removeItem('cancelled_cart_backup');
                }
            }
        } catch(e) {
            console.error('Failed to restore backup cart', e);
        }
    };

    const total = cart.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0);

    return (
        <CartContext.Provider value={{ cart, addToCart, removeFromCart, clearCart, setCart, restoreBackupCart, total }}>
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
