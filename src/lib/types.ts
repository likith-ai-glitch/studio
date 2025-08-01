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
