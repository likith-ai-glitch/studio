
export interface Product {
  id: string;
  name: string;
  description: string;
  brand: string;
  category: string;
  color: string;
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
    quantity: number;
    price: number;
  }[];
  total: number;
  orderDate: Date;
}
