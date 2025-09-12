
'use client';

import { AuthProvider } from '@/context/auth-context';
import { ProductProvider } from '@/context/product-context';
import { EventsProvider } from '@/context/events-context';
import { OrderProvider } from '@/context/order-context';
import { QuoteProvider } from '@/context/quote-context';
import { NotificationProvider } from '@/context/notification-context';
import type { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ProductProvider>
        <OrderProvider>
          <EventsProvider>
            <NotificationProvider>
                <QuoteProvider>
                {children}
                </QuoteProvider>
            </NotificationProvider>
          </EventsProvider>
        </OrderProvider>
      </ProductProvider>
    </AuthProvider>
  );
}
