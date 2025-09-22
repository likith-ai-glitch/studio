import { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, getDoc, writeBatch, getDocs, deleteField, Timestamp, updateDoc } from 'firebase/firestore';
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
  updateProductField: (productId: string, field: string, value: any) => Promise<void>;
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
  selectedProducts: string[];
  toggleProductSelection: (productId: string) => void;
  toggleSelectAllProducts: (productIds: string[]) => void;
  clearSelection: () => void;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

const safeJsonParse = (item: string | null, fallback: any) => {
  if (item === null) return fallback;
  try {
    const parsed = JSON.parse(item);
    if (typeof fallback === 'object' && fallback !== null && !Array.isArray(fallback) && Object.keys(parsed).length === 0) return fallback;
    if (Array.isArray(fallback) && parsed.length === 0) return fallback;
    return parsed;
  } catch (e) {
    return fallback;
  }
};

export function ProductProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [rawKeys, setRawKeys] = useState<string[]>([]);
  const [orderedProductKeys, setOrderedProductKeys] = useState<string[]>([]);
  const [headerNames, setHeaderNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [homePageFieldOrder, setHomePageFieldOrder] = useState<string[]>([]);
  const [homePageVisibleFields, setHomePageVisibleFields] = useState<Record<string, boolean>>({});
  const [adminTableVisibleFields, setAdminTableVisibleFields] = useState<Record<string, boolean>>({});
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const { toast } = useToast();
  
  const productsCollectionRef = collection(db, 'products');

  const seedDatabase = useCallback(async () => {
    const batch = writeBatch(db);
    initialProducts.forEach((product) => {
      const docRef = doc(db, "products", product.productId);
      const productWithDates: Record<string, any> = { ...product, qtyForQuote: 0 };
      Object.keys(productWithDates).forEach(key => {
        if (key === 'startDate' || key === 'lastUpdatedDate') {
          productWithDates[key] = productWithDates[key] ? Timestamp.fromDate(new Date(productWithDates[key])) : null;
        }
      });
      batch.set(docRef, productWithDates);
    });
    await batch.commit();
  }, []);

  // Hydrate state from localStorage on the client side
  useEffect(() => {
    const storedColumnOrder = safeJsonParse(localStorage.getItem('productKeysOrder'), []);
    const adminVisibility = safeJsonParse(localStorage.getItem('adminTableVisibleFields'), {});
    const homeVisibility = safeJsonParse(localStorage.getItem('homePageVisibleFields'), {});
    const homeOrder = safeJsonParse(localStorage.getItem('homePageFieldOrder'), []);
    const storedHeaders = safeJsonParse(localStorage.getItem('headerNames'), {});

    setHeaderNames(storedHeaders);
    setOrderedProductKeys(storedColumnOrder);
    setAdminTableVisibleFields(adminVisibility);
    setHomePageVisibleFields(homeVisibility);
    setHomePageFieldOrder(homeOrder);
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    const checkAndSeed = async () => {
      const snapshot = await getDocs(productsCollectionRef);
      if (snapshot.empty && initialProducts.length > 0) {
        await seedDatabase();
      }
    };
    
    checkAndSeed();

    const unsubscribe = onSnapshot(productsCollectionRef, (snapshot) => {
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

      if (productsData.length > 0) {
        const allKeys = new Set<string>();
        productsData.forEach(p => Object.keys(p).forEach(k => allKeys.add(k)));
        allKeys.add('quoteTotal');
        const newRawKeys = Array.from(allKeys);
        setRawKeys(newRawKeys);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching products with snapshot: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [seedDatabase]);

  // Update states and localStorage when rawKeys changes, only after hydration
  useEffect(() => {
    if (!isHydrated || rawKeys.length === 0) return;

    setOrderedProductKeys(prevOrder => {
      const validStoredOrder = prevOrder.filter((k: string) => rawKeys.includes(k));
      const newKeysDetected = rawKeys.filter(k => !validStoredOrder.includes(k));
      const finalKeys = [...validStoredOrder, ...newKeysDetected];
      localStorage.setItem('productKeysOrder', JSON.stringify(finalKeys));
      return finalKeys;
    });

    setAdminTableVisibleFields(prevVisibility => {
      const newVisibility: Record<string, boolean> = {};
      rawKeys.forEach(key => {
        newVisibility[key] = prevVisibility[key] !== false;
      });
      localStorage.setItem('adminTableVisibleFields', JSON.stringify(newVisibility));
      return newVisibility;
    });

    const homePageConfigurableFields = rawKeys.filter(k => !['productId', 'quoteTotal'].includes(k));

    setHomePageFieldOrder(prevOrder => {
      const validHomeOrder = prevOrder.filter((k: string) => homePageConfigurableFields.includes(k));
      const newHomeFields = homePageConfigurableFields.filter(k => !validHomeOrder.includes(k));
      const finalOrder = [...validHomeOrder, ...newHomeFields];
      localStorage.setItem('homePageFieldOrder', JSON.stringify(finalOrder));
      return finalOrder;
    });

    setHomePageVisibleFields(prevVisibility => {
      const newVisibility: Record<string, boolean> = {};
      const defaultVisible = ['name', 'brand', 'category', 'price', 'status'];
      homePageConfigurableFields.forEach(key => {
        newVisibility[key] = prevVisibility[key] ?? defaultVisible.includes(key);
      });
      localStorage.setItem('homePageVisibleFields', JSON.stringify(newVisibility));
      return newVisibility;
    });

  }, [rawKeys, isHydrated]);

  const addProduct = async (productData: ProductFormValues): Promise<void> => {
    const docRef = doc(db, "products", productData.productId);
    
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      throw new Error(`Product with ID "${productData.productId}" already exists.`);
    }

    const newProduct: Record<string, any> = { ...productData, status: productData.status || 'Available', qtyForQuote: 0 };
    
    Object.keys(newProduct).forEach(key => {
      if (newProduct[key] instanceof Date) newProduct[key] = Timestamp.fromDate(newProduct[key]);
    });
    
    await setDoc(docRef, newProduct);
  };

  const updateProduct = async (productData: ProductFormValues, originalProductId?: string): Promise<void> => {
    const { productId, ...restOfData } = productData;
    if (!productId) throw new Error("productId is missing, cannot update product.");

    if (originalProductId && originalProductId !== productId) {
      const newDocRef = doc(db, 'products', productId);
      const oldDocRef = doc(db, 'products', originalProductId);
      const newDocSnap = await getDoc(newDocRef);
      if (newDocSnap.exists()) throw new Error(`Product with new ID "${productId}" already exists.`);
      
      const oldDataSnap = await getDoc(oldDocRef);
      const oldData = oldDataSnap.data() || {};
      const combinedData = { ...oldData, ...restOfData };
      const newProductData: Record<string, any> = {};

      Object.entries(combinedData).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          newProductData[key] = value instanceof Date ? Timestamp.fromDate(value) : value;
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
        if (value instanceof Date) dataToUpdate[key] = Timestamp.fromDate(value);
        else if (value === null || value === undefined || value === '') dataToUpdate[key] = deleteField();
        else dataToUpdate[key] = value;
      });
      await setDoc(docRef, dataToUpdate, { merge: true });
    }
  };
  
  const updateProductField = async (productId: string, field: string, value: any) => {
    const docRef = doc(db, 'products', productId);
    try {
      await updateDoc(docRef, { [field]: value });
      toast({ title: 'Product Updated', description: `Successfully updated ${field}.` });
    } catch (error) {
      console.error("Error updating product field: ", error);
      toast({ title: 'Error', description: `Failed to update ${field}.`, variant: 'destructive' });
    }
  };

  const deleteProduct = async (productId: string) => {
    const productToDelete = products.find(p => p.productId === productId);
    if (!productToDelete) return;
    
    await deleteDoc(doc(db, 'products', productId));
    toast({ title: "Product Deleted", description: `"${productToDelete.name}" has been successfully deleted.`, variant: 'destructive' });
  };

  const getProduct = async (productId: string): Promise<Product | undefined> => {
    const localProduct = products.find(p => p.productId === productId);
    if (localProduct) return localProduct;

    const docSnap = await getDoc(doc(db, 'products', productId));
    if (docSnap.exists()) {
      const data = docSnap.data();
      const productDataWithDates: Record<string, any> = {};
      for (const key in data) {
        productDataWithDates[key] = data[key] instanceof Timestamp ? data[key].toDate() : data[key];
      }
      return { productId: docSnap.id, ...productDataWithDates } as Product;
    }
    return undefined;
  };

  const addColumn = async (columnName: string) => {
    const batch = writeBatch(db);
    const snapshot = await getDocs(productsCollectionRef);
    snapshot.forEach(doc => batch.update(doc.ref, { [columnName]: '' }));
    await batch.commit();
    toast({ title: 'Column Added', description: `The column "${columnName}" has been added.` });
  };

  const deleteColumn = async (columnName: string) => {
    const batch = writeBatch(db);
    const snapshot = await getDocs(productsCollectionRef);
    snapshot.forEach(document => batch.update(document.ref, { [columnName]: deleteField() }));
    await batch.commit();
    toast({ title: 'Column Deleted', description: `The column "${columnName}" has been deleted.`, variant: 'destructive' });
  };

  const setColumnOrder = (order: string[]) => {
    setOrderedProductKeys(order);
    if (isHydrated) localStorage.setItem('productKeysOrder', JSON.stringify(order));
  };

  const renameColumn = (columnKey: string, newName: string) => {
    const newHeaders = { ...headerNames, [columnKey]: newName };
    setHeaderNames(newHeaders);
    if (isHydrated) localStorage.setItem('headerNames', JSON.stringify(newHeaders));
  };
  
  const setHomePageOrder = (order: string[]) => {
    setHomePageFieldOrder(order);
    if (isHydrated) localStorage.setItem('homePageFieldOrder', JSON.stringify(order));
  };

  const toggleHomePageVisibility = (key: string) => {
    const newVisibility = { ...homePageVisibleFields, [key]: !homePageVisibleFields[key] };
    setHomePageVisibleFields(newVisibility);
    if (isHydrated) localStorage.setItem('homePageVisibleFields', JSON.stringify(newVisibility));
  };
  
  const toggleAdminTableFieldVisibility = (key: string) => {
    const newVisibility = { ...adminTableVisibleFields, [key]: !adminTableVisibleFields[key] };
    setAdminTableVisibleFields(newVisibility);
    if (isHydrated) localStorage.setItem('adminTableVisibleFields', JSON.stringify(newVisibility));
  };

  const toggleProductSelection = useCallback((productId: string) => {
    setSelectedProducts(prev => 
      prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]
    );
  }, []);

  const toggleSelectAllProducts = useCallback((productIds: string[]) => {
    setSelectedProducts(prev => {
      const visibleProductIds = new Set(productIds);
      const selectedProductIds = new Set(prev);
      const allVisibleSelected = productIds.every(id => selectedProductIds.has(id));

      if (allVisibleSelected) return prev.filter(id => !visibleProductIds.has(id));
      else return [...new Set([...prev, ...productIds])];
    });
  }, []);
  
  const clearSelection = useCallback(() => { setSelectedProducts([]); }, []);

  const productKeys = useMemo(() => {
    if (!isHydrated) return rawKeys;
    const validOrderedKeys = orderedProductKeys.filter(k => rawKeys.includes(k));
    const newKeys = rawKeys.filter(k => !validOrderedKeys.includes(k));
    return [...validOrderedKeys, ...newKeys];
  }, [isHydrated, orderedProductKeys, rawKeys]);

  return (
    <ProductContext.Provider value={{ 
      products, 
      productKeys, 
      headerNames, 
      loading, 
      addProduct, 
      updateProduct, 
      updateProductField,
      deleteProduct, 
      getProduct, 
      addColumn, 
      deleteColumn, 
      setColumnOrder, 
      renameColumn,
      homePageFieldOrder: isHydrated ? homePageFieldOrder : [], 
      setHomePageFieldOrder: setHomePageOrder,
      homePageVisibleFields: isHydrated ? homePageVisibleFields : {},
      toggleHomePageFieldVisibility: toggleHomePageVisibility,
      adminTableVisibleFields: isHydrated ? adminTableVisibleFields : {},
      toggleAdminTableFieldVisibility: toggleAdminTableFieldVisibility,
      selectedProducts, 
      toggleProductSelection, 
      toggleSelectAllProducts, 
      clearSelection,
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
