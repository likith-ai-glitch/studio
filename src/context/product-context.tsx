
'use client';

import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, getDoc, writeBatch, getDocs, deleteField, Timestamp, addDoc } from 'firebase/firestore';
import { products as initialProducts } from '@/lib/products';
import type { Product } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

const formSchema = z.object({
  partId: z.string().optional(),
  productId: z.string().min(3),
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
  updateProduct: (productData: ProductFormValues, partId: string) => Promise<void>;
  deleteProduct: (partId: string) => Promise<void>;
  getProduct: (partId: string) => Promise<Product | undefined>;
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
    const safelyParseJSON = (key: string, defaultValue: any) => {
      try {
        const item = window.localStorage.getItem(key);
        // Added a check to ensure the item is not null or undefined before parsing.
        if (item) {
          return JSON.parse(item);
        }
        return defaultValue;
      } catch (error) {
        console.warn(`Could not parse ${key} from localStorage`, error);
        window.localStorage.removeItem(key); // Clear corrupted data
        return defaultValue;
      }
    };
    
    setHeaderNames(safelyParseJSON(HEADER_NAMES_STORAGE_KEY, {}));
    setHomePageVisibleFields(safelyParseJSON(HOME_PAGE_VISIBLE_FIELDS_STORAGE_KEY, { category: true, price: true }));

    const unsubscribe = onSnapshot(productsCollectionRef, async (snapshot) => {
        if (snapshot.empty && initialProducts.length > 0) {
            console.log("No products found in Firestore. Seeding database...");
            setLoading(true);
            const batch = writeBatch(db);
            initialProducts.forEach((product) => {
                const docRef = doc(db, "products", product.partId);
                const {partId, ...productData} = product;
                const productWithDates = {
                    ...productData,
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
              // Ensure Timestamps are converted to Dates
              const productWithDates: Record<string, any> = {};
              for (const key in data) {
                if (data[key] instanceof Timestamp) {
                  productWithDates[key] = data[key].toDate();
                } else {
                  productWithDates[key] = data[key];
                }
              }
              return { ...productWithDates, partId: doc.id } as Product;
            });
            setProducts(productsData);
            
            const allKeys = new Set<string>();
            productsData.forEach(p => Object.keys(p).forEach(k => allKeys.add(k)));

            const fixedOrder = ['partId', 'productId', 'name', 'brand', 'category', 'status', 'startDate', 'lastUpdatedDate'];
            
            const savedOrder = safelyParseJSON(COLUMN_ORDER_STORAGE_KEY, []);
            const validSavedOrder = savedOrder.filter((k: string) => allKeys.has(k));
            const newKeys = Array.from(allKeys).filter(k => !validSavedOrder.includes(k) && !fixedOrder.includes(k));
            const finalKeys = [...fixedOrder.filter(k => allKeys.has(k)), ...validSavedOrder.filter(k => !fixedOrder.includes(k)), ...newKeys];
            setProductKeys([...new Set(finalKeys)]);
            
            const homeSavedOrder = safelyParseJSON(HOME_PAGE_FIELD_ORDER_STORAGE_KEY, []);
            const homeConfigurableFields = Array.from(allKeys).filter(k => !['partId', 'productId', 'name', 'brand', 'status', 'startDate', 'lastUpdatedDate'].includes(k));
            const validHomeSavedOrder = homeSavedOrder.filter((k: string) => homeConfigurableFields.includes(k));
            const newHomeKeys = homeConfigurableFields.filter(k => !validHomeSavedOrder.includes(k));
            setHomePageFieldOrder([...validHomeSavedOrder, ...newHomeKeys]);


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
    // Let firestore generate the ID
    const newDocRef = doc(collection(db, "products"));
    const { partId, ...newProductData } = productData;

    const newProduct: Record<string, any> = {
      ...newProductData,
      status: productData.status || 'Available',
    };
    
    Object.keys(newProduct).forEach(key => {
        if (newProduct[key] instanceof Date) {
            newProduct[key] = Timestamp.fromDate(newProduct[key]);
        }
    });
    
    await setDoc(newDocRef, newProduct);
  };

  const updateProduct = async (productData: ProductFormValues, currentPartId: string): Promise<void> => {
    const { partId: formPartId, ...restOfData } = productData;

    if (formPartId && formPartId !== currentPartId) {
        // ID has changed, so we create a new doc and delete the old one.
        const { partId, ...productProperties } = productData;
        const newProduct: Record<string, any> = { ...productProperties };

        Object.keys(newProduct).forEach(key => {
            if (newProduct[key] instanceof Date) {
                newProduct[key] = Timestamp.fromDate(newProduct[key] as Date);
            }
        });
        
        const batch = writeBatch(db);
        const newDocRef = doc(db, 'products', formPartId);
        batch.set(newDocRef, newProduct);
        
        const oldDocRef = doc(db, 'products', currentPartId);
        batch.delete(oldDocRef);
        
        await batch.commit();

    } else {
        // Standard update, partId has not changed
        const cleanData: Record<string, any> = { ...restOfData };
        
        Object.keys(cleanData).forEach(key => {
            if (cleanData[key] instanceof Date) {
                cleanData[key] = Timestamp.fromDate(cleanData[key]);
            } else if (cleanData[key] === null || cleanData[key] === undefined || cleanData[key] === '') {
                cleanData[key] = deleteField();
            }
        });
        
        const docRef = doc(db, 'products', currentPartId);
        await setDoc(docRef, cleanData, { merge: true });
    }
  };

  const deleteProduct = async (partId: string) => {
    const productToDelete = products.find(p => p.partId === partId);
    if (!productToDelete) return;
    
    const originalProducts = products;
    setProducts(prev => prev.filter(p => p.partId !== partId));
    
    const productDocRef = doc(db, 'products', partId);
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

  const getProduct = async (partId: string): Promise<Product | undefined> => {
    const localProduct = products.find(p => p.partId === partId);
    if (localProduct) return localProduct;

    try {
      const productDoc = doc(db, 'products', partId);
      const docSnap = await getDoc(productDoc);
      if (docSnap.exists()) {
        const data = docSnap.data();
        // Convert Timestamps to Dates before returning
        const productDataWithDates: Record<string, any> = {};
         for (const key in data) {
            if (data[key] instanceof Timestamp) {
                productDataWithDates[key] = data[key].toDate();
            } else {
                productDataWithDates[key] = data[key];
            }
        }
        return { partId: docSnap.id, ...productDataWithDates } as Product;
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
