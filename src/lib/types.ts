export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  color: string;
}

export interface CartItem extends Product {
  quantity: number;
}
