
'use client';

import { AuthProvider } from '@/context/auth-context';
import { ProductProvider } from '@/context/product-context';
import { EventsProvider } from '@/context/events-context';
import { OrderProvider } from '@/context/order-context';
import { CartProvider } from '@/context/cart-context';
import type { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ProductProvider>
        <OrderProvider>
          <EventsProvider>
            <CartProvider>
              {children}
            </CartProvider>
          </EventsProvider>
        </OrderProvider>
      </ProductProvider>
    </AuthProvider>
  );
}
