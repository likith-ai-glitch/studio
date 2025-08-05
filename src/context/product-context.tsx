
'use client';

import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, getDoc, writeBatch, getDocs, deleteField } from 'firebase/firestore';
import { products as initialProducts } from '@/lib/products';
import type { Product } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

const formSchema = z.object({
  id: z.string().min(3),
  name: z.string().min(2),
  description: z.string().min(10),
  brand: z.string().min(2),
  category: z.string().min(2),
  status: z.string().optional(),
}).catchall(z.any());
type ProductFormValues = z.infer<typeof formSchema>;


interface ProductContextType {
  products: Product[];
  productKeys: string[];
  loading: boolean;
  addProduct: (productData: ProductFormValues) => Promise<void>;
  updateProduct: (productData: ProductFormValues, originalId: string) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  getProduct: (productId: string) => Promise<Product | undefined>;
  addColumn: (columnName: string) => Promise<void>;
  deleteColumn: (columnName: string) => Promise<void>;
  setColumnOrder: (order: string[]) => void;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

const COLUMN_ORDER_STORAGE_KEY = 'shopstream_column_order';

export function ProductProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [productKeys, setProductKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const productsCollectionRef = collection(db, 'products');

  useEffect(() => {
    const unsubscribe = onSnapshot(productsCollectionRef, async (snapshot) => {
        if (snapshot.empty) {
            console.log("No products found in Firestore. Seeding database...");
            const batch = writeBatch(db);
            initialProducts.forEach((product) => {
                const docRef = doc(db, "products", product.id);
                batch.set(docRef, product);
            });
            await batch.commit();
            console.log("Seeding complete.");
            // The listener will re-fire with the new data automatically
        } else {
            const productsData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Product));
            setProducts(productsData.sort((a, b) => a.name.localeCompare(b.name)));
            
            const keys = new Set<string>();
            productsData.forEach(p => Object.keys(p).forEach(k => keys.add(k)));
            
            let savedOrder: string[] = [];
            try {
              const item = window.localStorage.getItem(COLUMN_ORDER_STORAGE_KEY);
              savedOrder = item ? JSON.parse(item) : [];
            } catch (error) {
              console.warn('Could not parse column order from localStorage', error);
            }

            const allKeys = Array.from(keys);
            // Filter savedOrder to only include keys that actually exist
            const validSavedOrder = savedOrder.filter(k => allKeys.includes(k));
            const unsavedKeys = allKeys.filter(k => !validSavedOrder.includes(k)).sort();
            
            if (validSavedOrder.length > 0) {
              setProductKeys([...validSavedOrder, ...unsavedKeys]);
            } else {
              const fixedOrder = ['id', 'name', 'description', 'brand', 'category', 'price', 'status'];
              const dynamicKeys = allKeys.filter(k => !fixedOrder.includes(k)).sort();
              setProductKeys([...fixedOrder.filter(k => allKeys.includes(k)), ...dynamicKeys]);
            }
        }
        setLoading(false);
    }, (error) => {
        console.error("Error fetching products with snapshot: ", error);
        toast({
            title: "Connection Error",
            description: "Could not connect to Firestore for real-time updates.",
            variant: "destructive",
        });
        setLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);
  
  const addProduct = async (productData: ProductFormValues): Promise<void> => {
    const newId = productData.id;
    if (!newId) {
       throw new Error("Product ID is required.");
    }
    const docRef = doc(db, 'products', newId);

    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      throw new Error("A product with this ID already exists.");
    }
    
    const { ...restOfData } = productData;

    const newProduct = {
      ...restOfData,
      status: productData.status || 'Available',
    };
    
    await setDoc(docRef, newProduct);
  };

  const updateProduct = async (productData: ProductFormValues, originalId: string): Promise<void> => {
      const oldProduct = await getProduct(originalId);
      if (!oldProduct) {
          throw new Error("Original product not found for update.");
      }
      
      const { ...restOfData } = productData;

      const updatedProductData = {
        ...oldProduct,
        ...restOfData,
      };
      
      if (productData.id !== originalId) {
          console.warn("Attempted to change product ID during update, which is not allowed. The original ID will be kept.");
          updatedProductData.id = originalId;
      }

      const docRef = doc(db, 'products', originalId);
      await setDoc(docRef, updatedProductData, { merge: true });
  };

  const deleteProduct = async (productId: string) => {
    const productToDelete = products.find(p => p.id === productId);
    if (!productToDelete) return;
    
    const originalProducts = products;
    setProducts(prev => prev.filter(p => p.id !== productId));
    
    const productDocRef = doc(db, 'products', productId);
    try {
      await deleteDoc(productDocRef);
      toast({
        title: "Product Deleted",
        description: `${productToDelete.name} has been successfully deleted.`,
        variant: 'destructive',
      });
    } catch (error) {
      console.error("Error deleting product: ", error);
      toast({
        title: "Error",
        description: "Failed to delete product.",
        variant: "destructive",
      });
      setProducts(originalProducts);
    }
  };

  const getProduct = async (productId: string): Promise<Product | undefined> => {
    const localProduct = products.find(p => p.id === productId);
    if (localProduct) return localProduct;

    // If not found locally, fetch directly from Firestore as a fallback.
    try {
      const productDoc = doc(db, 'products', productId);
      const docSnap = await getDoc(productDoc);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Product;
      } else {
        return undefined;
      }
    } catch (error) {
      console.error("Error getting product:", error);
      return undefined;
    }
  };

  const addColumn = async (columnName: string) => {
    const batch = writeBatch(db);
    const snapshot = await getDocs(productsCollectionRef);
    snapshot.forEach(doc => {
      const docRef = doc.ref;
      batch.update(docRef, { [columnName]: '' });
    });
    await batch.commit();
     toast({
        title: 'Column Added',
        description: `The column "${columnName}" has been added to all products.`,
    });
  }

  const deleteColumn = async (columnName: string) => {
    const batch = writeBatch(db);
    const snapshot = await getDocs(productsCollectionRef);
    snapshot.forEach(document => {
      const docRef = document.ref;
      batch.update(docRef, { [columnName]: deleteField() });
    });
    await batch.commit();
    toast({
      title: 'Column Deleted',
      description: `The column "${columnName}" has been deleted from all products.`,
      variant: 'destructive',
    });
  };

  const setColumnOrder = (order: string[]) => {
    try {
      window.localStorage.setItem(COLUMN_ORDER_STORAGE_KEY, JSON.stringify(order));
      setProductKeys(order); // Update state immediately for instant feedback
    } catch (error) {
      console.error('Failed to save column order to localStorage', error);
      toast({
        title: 'Error Saving Order',
        description: 'Could not save your column preference.',
        variant: 'destructive',
      });
    }
  };

  return (
    <ProductContext.Provider value={{ products, productKeys, loading, addProduct, updateProduct, deleteProduct, getProduct, addColumn, deleteColumn, setColumnOrder }}>
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

    
