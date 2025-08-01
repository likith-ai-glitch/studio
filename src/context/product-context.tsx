
'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { products as initialProducts } from '@/lib/products';
import type { Product } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

interface ProductContextType {
  products: Product[];
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (productId: number) => void;
  getProduct: (productId: number) => Product | undefined;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export function ProductProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const { toast } = useToast();

  const addProduct = (product: Omit<Product, 'id'>) => {
    setProducts((prev) => {
      const newProduct = { ...product, id: Date.now() };
      return [...prev, newProduct];
    });
    toast({
        title: "Product Added",
        description: `${product.name} has been successfully added.`,
    });
  };

  const updateProduct = (updatedProduct: Product) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p))
    );
     toast({
        title: "Product Updated",
        description: `${updatedProduct.name} has been successfully updated.`,
    });
  };

  const deleteProduct = (productId: number) => {
    const productName = products.find(p => p.id === productId)?.name;
    setProducts((prev) => prev.filter((p) => p.id !== productId));
    toast({
        title: "Product Deleted",
        description: `${productName} has been successfully deleted.`,
        variant: 'destructive',
    });
  };

  const getProduct = (productId: number) => {
    return products.find(p => p.id === productId);
  }

  return (
    <ProductContext.Provider value={{ products, addProduct, updateProduct, deleteProduct, getProduct }}>
      {children}
    </ProductContext.Provider>
  );
}

export function useProducts() {
  const context = useContext(ProductContext);
  if (context === undefined) {
    throw new Error('useProducts must be used within a ProductProvider');
  }
  return context;
}
