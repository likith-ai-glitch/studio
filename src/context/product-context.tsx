
'use client';

import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, getDoc, writeBatch, getDocs, deleteField, Timestamp } from 'firebase/firestore';
import { products as initialProducts } from '@/lib/products';
import type { Product } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

const formSchema = z.object({
  id: z.string().min(3),
  name: z.string().min(2),
  brand: z.string().min(2),
  category: z.string().min(2),
  status: z.string().optional(),
}).catchall(z.any());
type ProductFormValues = z.infer<typeof formSchema>;


interface ProductContextType {
  products: Product[];
  productKeys: string[];
  headerNames: Record<string, string>;
  loading: boolean;
  addProduct: (productData: ProductFormValues) => Promise<void>;
  updateProduct: (productData: ProductFormValues, originalId: string) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  getProduct: (productId: string) => Promise<Product | undefined>;
  addColumn: (columnName: string) => Promise<void>;
  deleteColumn: (columnName: string) => Promise<void>;
  setColumnOrder: (order: string[]) => void;
  renameColumn: (columnKey: string, newName: string) => void;
  homePageFieldOrder: string[];
  setHomePageFieldOrder: (order: string[]) => void;
  homePageVisibleFields: Record<string, boolean>;
  toggleHomePageFieldVisibility: (key: string) => void;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

const COLUMN_ORDER_STORAGE_KEY = 'shopstream_column_order';
const HEADER_NAMES_STORAGE_KEY = 'shopstream_header_names';
const HOME_PAGE_FIELD_ORDER_STORAGE_KEY = 'shopstream_homepage_field_order';
const HOME_PAGE_VISIBLE_FIELDS_STORAGE_KEY = 'shopstream_homepage_visible_fields';


export function ProductProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [productKeys, setProductKeys] = useState<string[]>([]);
  const [headerNames, setHeaderNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [homePageFieldOrder, setHomePageFieldOrder] = useState<string[]>([]);
  const [homePageVisibleFields, setHomePageVisibleFields] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const productsCollectionRef = collection(db, 'products');

  useEffect(() => {
    try {
        const item = window.localStorage.getItem(HEADER_NAMES_STORAGE_KEY);
        setHeaderNames(item ? JSON.parse(item) : {});
    } catch (error) {
        console.warn('Could not parse header names from localStorage', error);
    }
    
    try {
      const item = window.localStorage.getItem(HOME_PAGE_VISIBLE_FIELDS_STORAGE_KEY);
      setHomePageVisibleFields(item ? JSON.parse(item) : { category: true }); // Default 'category' to visible
    } catch (error) {
      console.warn('Could not parse home page visible fields from localStorage', error);
    }

    const unsubscribe = onSnapshot(productsCollectionRef, async (snapshot) => {
        if (snapshot.empty && initialProducts.length > 0) {
            console.log("No products found in Firestore. Seeding database...");
            setLoading(true);
            const batch = writeBatch(db);
            initialProducts.forEach((product) => {
                const docRef = doc(db, "products", product.id);
                const productWithDates = {
                    ...product,
                    startDate: product.startDate ? Timestamp.fromDate(new Date(product.startDate)) : null,
                    lastUpdatedDate: product.lastUpdatedDate ? Timestamp.fromDate(new Date(product.lastUpdatedDate)) : null,
                };
                batch.set(docRef, productWithDates);
            });
            try {
              await batch.commit();
            } catch (error) {
              console.error("Error seeding database: ", error);
            } finally {
               setLoading(false);
            }
        } else {
            const productsData = snapshot.docs.map(doc => {
              const data = doc.data();
              return { ...data, id: doc.id } as Product;
            });
            setProducts(productsData);
            
            const allKeys = new Set<string>();
            productsData.forEach(p => Object.keys(p).forEach(k => allKeys.add(k)));

            if (allKeys.has('description')) {
                allKeys.delete('description');
            }

            const fixedOrder = ['id', 'name', 'brand', 'category', 'status', 'startDate', 'lastUpdatedDate'];
            
            // For admin table column order
            try {
              const item = window.localStorage.getItem(COLUMN_ORDER_STORAGE_KEY);
              const savedOrder = item ? JSON.parse(item) : [];
              const validSavedOrder = savedOrder.filter((k: string) => allKeys.has(k));
              const newKeys = Array.from(allKeys).filter(k => !validSavedOrder.includes(k));
              setProductKeys([...validSavedOrder, ...newKeys]);
            } catch (error) {
              console.warn('Could not parse column order from localStorage', error);
              const dynamicKeys = Array.from(allKeys).filter(k => !fixedOrder.includes(k)).sort();
              setProductKeys([...fixedOrder.filter(k => allKeys.has(k)), ...dynamicKeys]);
            }
            
            // For home page field order
            try {
              const item = window.localStorage.getItem(HOME_PAGE_FIELD_ORDER_STORAGE_KEY);
              const homeSavedOrder = item ? JSON.parse(item) : [];
              const homeConfigurableFields = Array.from(allKeys).filter(k => !['id', 'name', 'brand', 'status', 'startDate', 'lastUpdatedDate'].includes(k));
              const validHomeSavedOrder = homeSavedOrder.filter((k: string) => homeConfigurableFields.includes(k));
              const newHomeKeys = homeConfigurableFields.filter(k => !validHomeSavedOrder.includes(k));
              setHomePageFieldOrder([...validHomeSavedOrder, ...newHomeKeys]);
            } catch (error) {
               console.warn('Could not parse home page field order from localStorage', error);
               const homeConfigurableFields = Array.from(allKeys).filter(k => !['id', 'name', 'brand', 'status', 'startDate', 'lastUpdatedDate'].includes(k));
               setHomePageFieldOrder(homeConfigurableFields);
            }


            setLoading(false);
        }
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

    const newProduct: Record<string, any> = {
      ...restOfData,
      status: productData.status || 'Available',
    };

    Object.keys(newProduct).forEach(key => {
        if (newProduct[key] instanceof Date) {
            newProduct[key] = Timestamp.fromDate(newProduct[key]);
        }
    });
    
    await setDoc(docRef, newProduct);
  };

  const updateProduct = async (productData: ProductFormValues, originalId: string): Promise<void> => {
      const oldProduct = await getProduct(originalId);
      if (!oldProduct) {
          throw new Error("Original product not found for update.");
      }
      
      const { ...restOfData } = productData;

      const updatedProductData: Record<string, any> = {
        ...oldProduct,
        ...restOfData,
      };
      
      if (productData.id !== originalId) {
          console.warn("Attempted to change product ID during update, which is not allowed. The original ID will be kept.");
          updatedProductData.id = originalId;
      }
      
      Object.keys(updatedProductData).forEach(key => {
        if (updatedProductData[key] instanceof Date) {
            updatedProductData[key] = Timestamp.fromDate(updatedProductData[key]);
        } else if (updatedProductData[key] === null || updatedProductData[key] === '') {
            updatedProductData[key] = deleteField();
        }
      });

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

    try {
      const productDoc = doc(db, 'products', productId);
      const docSnap = await getDoc(productDoc);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const product: Product = { id: docSnap.id, ...data } as Product;
        return product;
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
      setProductKeys(order);
    } catch (error) {
      console.error('Failed to save column order to localStorage', error);
      toast({
        title: 'Error Saving Order',
        description: 'Could not save your column preference.',
        variant: 'destructive',
      });
    }
  };

  const renameColumn = (columnKey: string, newName: string) => {
      const newHeaders = {
        ...headerNames,
        [columnKey]: newName,
      };
      setHeaderNames(newHeaders);
      try {
        window.localStorage.setItem(HEADER_NAMES_STORAGE_KEY, JSON.stringify(newHeaders));
      } catch (error) {
        console.error('Failed to save header names to localStorage', error);
         toast({
            title: 'Error Saving Name',
            description: 'Could not save your column name preference.',
            variant: 'destructive',
        });
      }
  }
  
  const setHomePageOrder = (order: string[]) => {
    try {
      window.localStorage.setItem(HOME_PAGE_FIELD_ORDER_STORAGE_KEY, JSON.stringify(order));
      setHomePageFieldOrder(order);
    } catch (error) {
      console.error('Failed to save home page field order to localStorage', error);
    }
  };

  const toggleHomePageVisibility = (key: string) => {
    const newVisibility = {
      ...homePageVisibleFields,
      [key]: !homePageVisibleFields[key],
    };
    setHomePageVisibleFields(newVisibility);
    try {
      window.localStorage.setItem(HOME_PAGE_VISIBLE_FIELDS_STORAGE_KEY, JSON.stringify(newVisibility));
    } catch (error) {
      console.error('Failed to save home page visibility to localStorage', error);
    }
  };


  return (
    <ProductContext.Provider value={{ 
        products, 
        productKeys, 
        headerNames, 
        loading, 
        addProduct, 
        updateProduct, 
        deleteProduct, 
        getProduct, 
        addColumn, 
        deleteColumn, 
        setColumnOrder, 
        renameColumn,
        homePageFieldOrder,
        setHomePageFieldOrder: setHomePageOrder,
        homePageVisibleFields,
        toggleHomePageFieldVisibility: toggleHomePageVisibility,
    }}>
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
