
'use client';

import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, getDoc, writeBatch, getDocs, deleteField, Timestamp, addDoc } from 'firebase/firestore';
import { products as initialProducts } from '@/lib/products';
import type { Product } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

const formSchema = z.object({
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
  updateProduct: (productData: ProductFormValues, originalProductId?: string) => Promise<void>;
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
  adminTableVisibleFields: Record<string, boolean>;
  toggleAdminTableFieldVisibility: (key: string) => void;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

const COLUMN_ORDER_STORAGE_KEY = 'shopstream_column_order';
const HEADER_NAMES_STORAGE_KEY = 'shopstream_header_names';
const HOME_PAGE_FIELD_ORDER_STORAGE_KEY = 'shopstream_homepage_field_order';
const HOME_PAGE_VISIBLE_FIELDS_STORAGE_KEY = 'shopstream_homepage_visible_fields';
const ADMIN_TABLE_VISIBLE_FIELDS_STORAGE_KEY = 'shopstream_admintable_visible_fields';


export function ProductProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [productKeys, setProductKeys] = useState<string[]>([]);
  const [headerNames, setHeaderNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [homePageFieldOrder, setHomePageFieldOrder] = useState<string[]>([]);
  const [homePageVisibleFields, setHomePageVisibleFields] = useState<Record<string, boolean>>({});
  const [adminTableVisibleFields, setAdminTableVisibleFields] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const productsCollectionRef = collection(db, 'products');

  useEffect(() => {
    const safelyParseJSON = (key: string, defaultValue: any) => {
      try {
        if (typeof window === 'undefined') return defaultValue;
        const item = window.localStorage.getItem(key);
        if (item) {
          return JSON.parse(item);
        }
        return defaultValue;
      } catch (error) {
        console.warn(`Could not parse ${key} from localStorage`, error);
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(key);
        }
        return defaultValue;
      }
    };
    
    setHeaderNames(safelyParseJSON(HEADER_NAMES_STORAGE_KEY, {}));
    setHomePageVisibleFields(safelyParseJSON(HOME_PAGE_VISIBLE_FIELDS_STORAGE_KEY, { name: true, brand: true, category: true, price: true }));

    const unsubscribe = onSnapshot(productsCollectionRef, async (snapshot) => {
        if (snapshot.empty && initialProducts.length > 0) {
            console.log("No products found in Firestore. Seeding database...");
            setLoading(true);
            const batch = writeBatch(db);
            initialProducts.forEach((product) => {
                const docRef = doc(db, "products", product.productId);
                const { ...productData} = product;
                const productWithDates: Record<string, any> = { ...productData };
                 Object.keys(productWithDates).forEach(key => {
                    if (key === 'startDate' || key === 'lastUpdatedDate') {
                        productWithDates[key] = productWithDates[key] ? Timestamp.fromDate(new Date(productWithDates[key])) : null;
                    }
                });
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
              const productWithDates: Record<string, any> = {};
              for (const key in data) {
                if (data[key] instanceof Timestamp) {
                  productWithDates[key] = data[key].toDate();
                } else {
                  productWithDates[key] = data[key];
                }
              }
              return { ...productWithDates, productId: doc.id } as Product;
            });
            setProducts(productsData);
            
            const allKeys = new Set<string>();
            productsData.forEach(p => Object.keys(p).forEach(k => allKeys.add(k)));

            const fixedOrder = ['productId', 'name', 'brand', 'category', 'status', 'startDate', 'lastUpdatedDate'];
            
            const savedOrder = safelyParseJSON(COLUMN_ORDER_STORAGE_KEY, []);
            const validSavedOrder = savedOrder.filter((k: string) => allKeys.has(k));
            const newKeys = Array.from(allKeys).filter(k => !validSavedOrder.includes(k) && !fixedOrder.includes(k));
            const finalKeys = [...new Set(finalKeys)];
            setProductKeys(finalKeys);

            const savedAdminVisibility = safelyParseJSON(ADMIN_TABLE_VISIBLE_FIELDS_STORAGE_KEY, {});
            const finalAdminVisibility: Record<string, boolean> = {};
            finalKeys.forEach(key => {
              finalAdminVisibility[key] = savedAdminVisibility[key] ?? true; // Default to visible
            });
            setAdminTableVisibleFields(finalAdminVisibility);

            const homeSavedOrder = safelyParseJSON(HOME_PAGE_FIELD_ORDER_STORAGE_KEY, []);
            const allConfigurableHomePageFields = finalKeys.filter(k => !['productId'].includes(k));
            const validHomeSavedOrder = homeSavedOrder.filter((k: string) => allConfigurableHomePageFields.includes(k));
            const newHomeKeys = allConfigurableHomePageFields.filter(k => !validHomeSavedOrder.includes(k));
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
    const docRef = doc(db, "products", productData.productId);
    
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      throw new Error(`Product with ID "${productData.productId}" already exists.`);
    }

    const newProduct: Record<string, any> = {
      ...productData,
      status: productData.status || 'Available',
    };
    
    Object.keys(newProduct).forEach(key => {
        if (newProduct[key] instanceof Date) {
            newProduct[key] = Timestamp.fromDate(newProduct[key]);
        }
    });
    
    await setDoc(docRef, newProduct);
  };

  const updateProduct = async (productData: ProductFormValues, originalProductId?: string): Promise<void> => {
    const { productId, ...restOfData } = productData;

    if (!productId) {
      throw new Error("productId is missing, cannot update product.");
    }

    if (originalProductId && originalProductId !== productId) {
        const newDocRef = doc(db, 'products', productId);
        const oldDocRef = doc(db, 'products', originalProductId);

        const newDocSnap = await getDoc(newDocRef);
        if (newDocSnap.exists()) {
          throw new Error(`Product with new ID "${productId}" already exists.`);
        }
        
        const newProductData: Record<string, any> = {};
        Object.entries(restOfData).forEach(([key, value]) => {
            if (value !== null && value !== undefined && value !== '') {
                 if (value instanceof Date) {
                    newProductData[key] = Timestamp.fromDate(value);
                } else {
                    newProductData[key] = value;
                }
            }
        });

        const batch = writeBatch(db);
        batch.set(newDocRef, newProductData);
        batch.delete(oldDocRef);
        await batch.commit();

    } else {
       const docRef = doc(db, 'products', productId);
       const dataToUpdate: Record<string, any> = {};

       Object.keys(restOfData).forEach(key => {
            const value = (restOfData as any)[key];
            if (value instanceof Date) {
                dataToUpdate[key] = Timestamp.fromDate(value);
            } else if (value === null || value === undefined || value === '') {
                dataToUpdate[key] = deleteField();
            } else {
                dataToUpdate[key] = value;
            }
        });

       await setDoc(docRef, dataToUpdate, { merge: true });
    }
  };


  const deleteProduct = async (productId: string) => {
    const productToDelete = products.find(p => p.productId === productId);
    if (!productToDelete) return;
    
    const originalProducts = products;
    setProducts(prev => prev.filter(p => p.productId !== productId));
    
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
    const localProduct = products.find(p => p.productId === productId);
    if (localProduct) return localProduct;

    try {
      const productDoc = doc(db, 'products', productId);
      const docSnap = await getDoc(productDoc);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const productDataWithDates: Record<string, any> = {};
         for (const key in data) {
            if (data[key] instanceof Timestamp) {
                productDataWithDates[key] = data[key].toDate();
            } else {
                productDataWithDates[key] = data[key];
            }
        }
        return { productId: docSnap.id, ...productDataWithDates } as Product;
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
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(COLUMN_ORDER_STORAGE_KEY, JSON.stringify(order));
        setProductKeys(order);
      }
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
         if (typeof window !== 'undefined') {
            window.localStorage.setItem(HEADER_NAMES_STORAGE_KEY, JSON.stringify(newHeaders));
         }
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
       if (typeof window !== 'undefined') {
          window.localStorage.setItem(HOME_PAGE_FIELD_ORDER_STORAGE_KEY, JSON.stringify(order));
          setHomePageFieldOrder(order);
       }
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
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(HOME_PAGE_VISIBLE_FIELDS_STORAGE_KEY, JSON.stringify(newVisibility));
      }
    } catch (error) {
      console.error('Failed to save home page visibility to localStorage', error);
    }
  };
  
  const toggleAdminTableFieldVisibility = (key: string) => {
    const newVisibility = {
      ...adminTableVisibleFields,
      [key]: !adminTableVisibleFields[key],
    };
    setAdminTableVisibleFields(newVisibility);
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(ADMIN_TABLE_VISIBLE_FIELDS_STORAGE_KEY, JSON.stringify(newVisibility));
      }
    } catch (error) {
      console.error('Failed to save admin table visibility to localStorage', error);
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
        adminTableVisibleFields,
        toggleAdminTableFieldVisibility: toggleAdminTableFieldVisibility,
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
