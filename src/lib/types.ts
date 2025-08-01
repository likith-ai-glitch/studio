
export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  color: string;
  brand: string;
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
