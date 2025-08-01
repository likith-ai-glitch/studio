
'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import type { Order, CartItem } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

interface OrderContextType {
  orders: Order[];
  addOrder: (customer: Omit<Order['customer'], 'id'>, items: CartItem[], total: number) => void;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export function OrderProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const { toast } = useToast();

  const addOrder = (customer: Omit<Order['customer'], 'id'>, items: CartItem[], total: number) => {
    const newOrder: Order = {
      id: Date.now(),
      customer,
      items,
      total,
      orderDate: new Date(),
    };
    setOrders((prevOrders) => [...prevOrders, newOrder]);
    toast({
      title: 'New Order Received!',
      description: `An order from ${customer.name} for ₹${total.toFixed(2)} was placed.`,
    });
  };

  return (
    <OrderContext.Provider value={{ orders, addOrder }}>
      {children}
    </OrderContext.Provider>
  );
}

export function useOrders() {
  const context = useContext(OrderContext);
  if (context === undefined) {
    throw new Error('useOrders must be used within an OrderProvider');
  }
  return context;
}
