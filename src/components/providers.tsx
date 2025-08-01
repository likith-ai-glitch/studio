
'use client';

import { AuthProvider } from '@/context/auth-context';
import { CartProvider } from '@/context/cart-context';
import { WishlistProvider } from '@/context/wishlist-context';
import { ProductProvider } from '@/context/product-context';
import { EventsProvider } from '@/context/events-context';
import { OrderProvider } from '@/context/order-context';
import type { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ProductProvider>
        <OrderProvider>
          <WishlistProvider>
            <CartProvider>
              <EventsProvider>
                {children}
              </EventsProvider>
            </CartProvider>
          </WishlistProvider>
        </OrderProvider>
      </ProductProvider>
    </AuthProvider>
  );
}
