
'use client';

import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import type { CartItem, Product } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, onSnapshot, writeBatch, deleteDoc } from 'firebase/firestore';

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: number | string) => void;
  updateQuantity: (productId: number | string, quantity: number) => void;
  clearCart: () => void;
  cartCount: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();

  const getCartRef = useCallback(() => {
    if (!user) return null;
    return doc(db, 'carts', user.uid);
  }, [user]);

  useEffect(() => {
    if (!user) {
      setCartItems([]);
      return;
    }
    const cartRef = getCartRef();
    if (!cartRef) return;

    const unsubscribe = onSnapshot(cartRef, (docSnap) => {
      if (docSnap.exists()) {
        const cartData = docSnap.data();
        setCartItems(cartData.items || []);
      } else {
        setCartItems([]);
      }
    });

    return () => unsubscribe();
  }, [user, getCartRef]);

  const addToCart = async (product: Product) => {
    const cartRef = getCartRef();
    if (!cartRef) {
      toast({ title: 'Please log in', description: 'You need to be logged in to add items to your cart.', variant: 'destructive'});
      return;
    }

    const newCartItems = [...cartItems];
    const existingItemIndex = newCartItems.findIndex((item) => item.id === product.id);

    if (existingItemIndex > -1) {
      newCartItems[existingItemIndex].quantity += 1;
    } else {
      newCartItems.push({ ...product, quantity: 1 });
    }

    await setDoc(cartRef, { items: newCartItems }, { merge: true });
    
    toast({
      title: "Added to cart",
      description: `${product.name} has been added to your cart.`,
    });
  };

  const removeFromCart = async (productId: number | string) => {
    const cartRef = getCartRef();
    if (!cartRef) return;

    const newCartItems = cartItems.filter((item) => item.id !== productId);
    await setDoc(cartRef, { items: newCartItems });

    toast({
      title: "Removed from cart",
      description: `Item has been removed from your cart.`,
      variant: 'destructive'
    });
  };

  const updateQuantity = async (productId: number | string, quantity: number) => {
    if (quantity <= 0) {
      await removeFromCart(productId);
    } else {
      const cartRef = getCartRef();
      if (!cartRef) return;

      const newCartItems = cartItems.map((item) =>
        item.id === productId ? { ...item, quantity } : item
      );
      await setDoc(cartRef, { items: newCartItems });
    }
  };

  const clearCart = async () => {
    const cartRef = getCartRef();
    if (!cartRef) return;
    await deleteDoc(cartRef);
  };

  const cartCount = cartItems.reduce((count, item) => count + item.quantity, 0);
  const totalPrice = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartCount,
        totalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
