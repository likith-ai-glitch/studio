
'use client';

import { AuthProvider } from '@/context/auth-context';
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
              <EventsProvider>
                {children}
              </EventsProvider>
          </WishlistProvider>
        </OrderProvider>
      </ProductProvider>
    </AuthProvider>
  );
}
