
export interface Product {
  id: string; // Autonumber (PK)
  name: string;
  description: string;
  manufacturer: string;
  partNumber: string;
  codeName: string;
  mapping1: string;
  mapping2: string;
  mapping3: string;
  status: string;
  [key: string]: any;
}

export interface Price {
  id: string; // Autonumber (PK)
  name: string;
  description: string;
  baseCurrency: string;
  amount: number;
  productId: string;
}

export interface CartItem extends Product {
  quantity: number;
  price: number; // For simplicity in cart, we'll store the resolved price.
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
