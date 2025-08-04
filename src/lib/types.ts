
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  color: string;
  brand: string;
  status: string;
  [key: string]: any; // Allow for dynamic properties
}

export interface CartItem extends Product {
  quantity: number;
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
  items: CartItem[];
  total: number;
  orderDate: Date;
}

    