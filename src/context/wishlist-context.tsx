
'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import type { Product } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";

interface WishlistContextType {
  wishlistItems: Product[];
  addToWishlist: (product: Product) => void;
  removeFromWishlist: (productId: number | string) => void;
  isInWishlist: (productId: number | string) => boolean;
  wishlistCount: number;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [wishlistItems, setWishlistItems] = useState<Product[]>([]);
  const { toast } = useToast();

  const addToWishlist = (product: Product) => {
    setWishlistItems((prevItems) => {
      if (!prevItems.find((item) => item.id === product.id)) {
        toast({
          title: "Added to wishlist",
          description: `${product.name} has been added to your wishlist.`,
        });
        return [...prevItems, product];
      }
      return prevItems;
    });
  };

  const removeFromWishlist = (productId: number | string) => {
    setWishlistItems((prevItems) => {
        const itemToRemove = prevItems.find(item => item.id === productId);
        if (itemToRemove) {
             toast({
              title: "Removed from wishlist",
              description: `${itemToRemove.name} has been removed from your wishlist.`,
            });
        }
        return prevItems.filter((item) => item.id !== productId)
    });
  };

  const isInWishlist = (productId: number | string) => {
    return wishlistItems.some((item) => item.id === productId);
  };
  
  const wishlistCount = wishlistItems.length;

  return (
    <WishlistContext.Provider value={{ wishlistItems, addToWishlist, removeFromWishlist, isInWishlist, wishlistCount }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
}
