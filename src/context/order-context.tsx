
'use client';

import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import type { Order, CartItem } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';

interface OrderContextType {
  orders: Order[];
  addOrder: (customer: Omit<Order['customer'], 'id'>, items: CartItem[], total: number) => void;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export function OrderProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const { toast } = useToast();
  const ordersCollectionRef = collection(db, 'orders');

  useEffect(() => {
    const q = query(ordersCollectionRef, orderBy('orderDate', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          orderDate: data.orderDate.toDate(),
        } as Order;
      });
      setOrders(ordersData);
    });

    return () => unsubscribe();
  }, []);

  const addOrder = async (customer: Omit<Order['customer'], 'id'>, items: CartItem[], total: number) => {
    try {
        await addDoc(ordersCollectionRef, {
            customer,
            items,
            total,
            orderDate: serverTimestamp(),
        });
        toast({
          title: 'New Order Received!',
          description: `An order from ${customer.name} for ₹${total.toFixed(2)} was placed.`,
        });
    } catch (error) {
        console.error("Error adding order: ", error);
        toast({
            title: 'Error',
            description: 'Could not place order.',
            variant: 'destructive',
        });
    }
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
