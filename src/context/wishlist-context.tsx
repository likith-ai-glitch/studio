
'use client';

import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import type { Product } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, setDoc, arrayUnion, arrayRemove } from 'firebase/firestore';

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
  const { user } = useAuth();

  const getWishlistRef = useCallback(() => {
    if (!user) return null;
    return doc(db, 'wishlists', user.uid);
  }, [user]);

  useEffect(() => {
    if (!user) {
      setWishlistItems([]);
      return;
    }
    const wishlistRef = getWishlistRef();
    if (!wishlistRef) return;

    const unsubscribe = onSnapshot(wishlistRef, (docSnap) => {
      if (docSnap.exists()) {
        const wishlistData = docSnap.data();
        setWishlistItems(wishlistData.items || []);
      } else {
        setWishlistItems([]);
      }
    });

    return () => unsubscribe();
  }, [user, getWishlistRef]);

  const addToWishlist = async (product: Product) => {
    const wishlistRef = getWishlistRef();
    if (!wishlistRef) {
      toast({ title: 'Please log in', description: 'You need to be logged in to add items to your wishlist.', variant: 'destructive'});
      return;
    }
    await setDoc(wishlistRef, { items: arrayUnion(product) }, { merge: true });
    toast({
      title: "Added to wishlist",
      description: `${product.name} has been added to your wishlist.`,
    });
  };

  const removeFromWishlist = async (productId: string | number) => {
    const wishlistRef = getWishlistRef();
    if (!wishlistRef) return;
    
    const itemToRemove = wishlistItems.find(item => item.id === productId);
    if (itemToRemove) {
      await setDoc(wishlistRef, { items: arrayRemove(itemToRemove) }, { merge: true });
      toast({
        title: "Removed from wishlist",
        description: `${itemToRemove.name} has been removed from your wishlist.`,
      });
    }
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
