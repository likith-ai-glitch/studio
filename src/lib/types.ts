
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  color: string;
  brand: string;
  [key: string]: any; // Allow for dynamic properties
}

export interface CartItem extends Product {
  quantity: number;
}

export interface AppEvent {
  id: number;
  type: 'login' | 'logout' | 'product_added';
  timestamp: Date;
  userEmail: string;
  details?: Record<string, any>;
}

export interface Order {
  id: number;
  customer: {
    name: string;
    email: string;
    address: string;
    city: string;
    zip: string;
  };
  items: CartItem[];
  total: number;
  orderDate: Date;
}
