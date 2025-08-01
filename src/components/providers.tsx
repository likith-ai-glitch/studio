
'use client';

import { CartProvider } from '@/context/cart-context';
import { WishlistProvider } from '@/context/wishlist-context';
import { ProductProvider } from '@/context/product-context';
import type { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ProductProvider>
      <WishlistProvider>
        <CartProvider>
            {children}
        </CartProvider>
      </WishlistProvider>
    </ProductProvider>
  );
}
