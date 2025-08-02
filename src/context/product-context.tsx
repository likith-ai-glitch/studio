
'use client';

import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, getDoc, writeBatch, query, where } from 'firebase/firestore';
import { products as initialProducts } from '@/lib/products';
import type { Product } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

interface ProductContextType {
  products: Product[];
  loading: boolean;
  addProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  getProduct: (productId: string) => Promise<Product | undefined>;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export function ProductProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const productsCollectionRef = collection(db, 'products');

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(productsCollectionRef);
       if (querySnapshot.empty) {
        // Seed the database if it's empty
        console.log("No products found in Firestore, seeding database...");
        const batch = writeBatch(db);
        initialProducts.forEach((product) => {
          const docRef = doc(db, "products", product.id);
          batch.set(docRef, product);
        });
        await batch.commit();
        console.log("Database seeded successfully.");
        // Fetch again after seeding
        const newSnapshot = await getDocs(productsCollectionRef);
        const productsData = newSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
        setProducts(productsData);
      } else {
        const productsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
        setProducts(productsData);
      }

    } catch (error) {
      console.error("Error fetching products: ", error);
      toast({
        title: "Error",
        description: "Could not fetch products from the database.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const addProduct = async (productData: Omit<Product, 'id'>) => {
    try {
      const newId = `P100${Date.now()}`;
      const newProduct = { ...productData, id: newId };
      await setDoc(doc(db, "products", newId), newProduct);
      setProducts((prev) => [...prev, newProduct]);
      toast({
        title: "Product Added",
        description: `${productData.name} has been successfully added.`,
      });
    } catch (error) {
       console.error("Error adding product: ", error);
       toast({
        title: "Error",
        description: "Failed to add product.",
        variant: "destructive",
      });
    }
  };

  const updateProduct = async (updatedProduct: Product) => {
    const productDoc = doc(db, 'products', updatedProduct.id);
    try {
      const { id, ...productData } = updatedProduct;
      await updateDoc(productDoc, productData);
      setProducts((prev) =>
        prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p))
      );
      toast({
        title: "Product Updated",
        description: `${updatedProduct.name} has been successfully updated.`,
      });
    } catch (error) {
      console.error("Error updating product: ", error);
      toast({
        title: "Error",
        description: "Failed to update product.",
        variant: "destructive",
      });
    }
  };

  const deleteProduct = async (productId: string) => {
    const productDoc = doc(db, 'products', productId);
    try {
      const productName = products.find(p => p.id === productId)?.name;
      await deleteDoc(productDoc);
      setProducts((prev) => prev.filter((p) => p.id !== productId));
      toast({
        title: "Product Deleted",
        description: `${productName} has been successfully deleted.`,
        variant: 'destructive',
      });
    } catch (error) {
      console.error("Error deleting product: ", error);
      toast({
        title: "Error",
        description: "Failed to delete product.",
        variant: "destructive",
      });
    }
  };

  const getProduct = async (productId: string) => {
    try {
      const productDoc = doc(db, 'products', productId);
      const docSnap = await getDoc(productDoc);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Product;
      } else {
        console.log("No such document!");
        return undefined;
      }
    } catch (error) {
      console.error("Error getting product:", error);
      return undefined;
    }
  };
  
  // The getProduct in context needs to match the interface, but components might need a sync version
  const getProductSync = (productId: string) => {
      return products.find(p => p.id === productId);
  }


  return (
    <ProductContext.Provider value={{ products, loading, addProduct, updateProduct, deleteProduct, getProduct }}>
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
