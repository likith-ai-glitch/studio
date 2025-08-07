
'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import type { Order, OrderStatus } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';

interface OrderContextType {
  orders: Order[];
  addOrder: (customer: Omit<Order['customer'], 'id'>, items: Order['items'], total: number) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;
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
          orderDate: data.orderDate ? data.orderDate.toDate() : new Date(),
          status: data.status || 'Pending', // Default status
        } as Order;
      });
      setOrders(ordersData);
    });

    return () => unsubscribe();
  }, []);

  const addOrder = async (customer: Omit<Order['customer'], 'id'>, items: Order['items'], total: number) => {
    try {
        await addDoc(ordersCollectionRef, {
            customer,
            items,
            total,
            orderDate: serverTimestamp(),
            status: 'Pending',
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

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    const orderDocRef = doc(db, 'orders', orderId);
    try {
      await updateDoc(orderDocRef, { status });
      toast({
        title: 'Order Updated',
        description: `Order status changed to ${status}.`,
      });
    } catch (error) {
      console.error('Error updating order status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update order status.',
        variant: 'destructive',
      });
    }
  };

  const deleteOrder = async (orderId: string) => {
    const orderDocRef = doc(db, 'orders', orderId);
    try {
      await deleteDoc(orderDocRef);
      toast({
        title: 'Order Deleted',
        description: 'The order has been permanently deleted.',
        variant: 'destructive',
      });
    } catch (error) {
      console.error('Error deleting order:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete order.',
        variant: 'destructive',
      });
    }
  };

  return (
    <OrderContext.Provider value={{ orders, addOrder, updateOrderStatus, deleteOrder }}>
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
