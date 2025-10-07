

import type { Quote } from '@/context/quote-context';

export interface Product {
  productId: string;
  name: string;
  brand: string;
  category: string;
  status: string;
  [key: string]: any;
}

export interface AppEvent {
  id: string;
  type: 'login' | 'logout' | 'product_added';
  timestamp: Date;
  userEmail: string;
  details?: Record<string, any>;
}

export type OrderStatus = 'Pending' | 'Accepted' | 'Denied';

export interface Order {
  id: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    zip: string;
  };
  items: {
    id: string;
    name: string;
    brand: string;
    category: string;
    quantity: number;
    price: number;
  }[];
  total: number;
  orderDate: Date;
  status: OrderStatus;
}

export interface Notification {
    id: string;
    customer: {
        email: string;
        phone?: string;
    };
    emailSubject: string;
    emailBody: string;
    smsBody?: string;
    sentAt: Date;
    orderId?: string;
    quoteId?: string;
}
