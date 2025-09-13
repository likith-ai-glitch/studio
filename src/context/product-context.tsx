
'use client';

import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
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

export function ProductProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [productKeys, setProductKeys] = useState<string[]>([]);
  const [headerNames, setHeaderNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [homePageFieldOrder, setHomePageFieldOrder] = useState<string[]>([]);
  const [homePageVisibleFields, setHomePageVisibleFields] = useState<Record<string, boolean>>({});
  const [adminTableVisibleFields, setAdminTableVisibleFields] = useState<Record<string, boolean>>({});
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const { toast } = useToast();
  
  const productsCollectionRef = collection(db, 'products');

  const seedDatabase = useCallback(async () => {
    console.log("Seeding database with initial products...");
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
    try {
      await batch.commit();
      toast({ title: "Database Seeded", description: "Initial products have been loaded." });
    } catch (error) {
      console.error("Error seeding database: ", error);
      toast({ title: "Seeding Error", description: "Could not load initial products.", variant: "destructive" });
    }
  }, [toast]);

  useEffect(() => {
    const checkAndSeed = async () => {
        setLoading(true);
        try {
            const snapshot = await getDocs(productsCollectionRef);
            if (snapshot.empty && initialProducts.length > 0) {
                await seedDatabase();
            }
        } catch (error) {
            console.error("Error checking or seeding database:", error);
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

        const fixedOrder = ['productId', 'name', 'brand', 'category', 'status', 'price', 'qtyForQuote', 'quoteTotal', 'startDate', 'lastUpdatedDate'];
        const currentKeys = Array.from(allKeys);
        const newKeys = currentKeys.filter(k => !fixedOrder.includes(k));
        const finalKeys = [...fixedOrder.filter(k => currentKeys.includes(k)), ...newKeys];
        
        setProductKeys(prevKeys => {
            const storedOrder = JSON.parse(localStorage.getItem('productKeysOrder') || '[]');
            if (storedOrder.length > 0) {
                // Filter stored keys to only include keys that still exist
                const validStoredOrder = storedOrder.filter((k: string) => finalKeys.includes(k));
                // Add any new keys that weren't in the stored order
                const newUnstoredKeys = finalKeys.filter(k => !validStoredOrder.includes(k));
                return [...validStoredOrder, ...newUnstoredKeys];
            }
            if (JSON.stringify(prevKeys) !== JSON.stringify(finalKeys)) {
                return finalKeys;
            }
            return prevKeys;
        });
      }
      
      setLoading(false);
      
    }, (error) => {
      console.error("Error fetching products with snapshot: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [seedDatabase]);

  useEffect(() => {
    // This effect runs only on the client, after initial render
    const adminVisibility: Record<string, boolean> = JSON.parse(localStorage.getItem('adminTableVisibleFields') || '{}');
    const homeVisibility: Record<string, boolean> = JSON.parse(localStorage.getItem('homePageVisibleFields') || '{}');
    const homeOrder: string[] = JSON.parse(localStorage.getItem('homePageFieldOrder') || '[]');
    const storedHeaders: Record<string, string> = JSON.parse(localStorage.getItem('headerNames') || '{}');

    // Initialize admin table visibility
    const newAdminVisibility: Record<string, boolean> = {};
    productKeys.forEach(key => {
        newAdminVisibility[key] = adminVisibility[key] !== false; // Default to true
    });
    setAdminTableVisibleFields(newAdminVisibility);

    const homePageConfigurableFields = productKeys.filter(k => !['productId', 'quoteTotal'].includes(k));
    
    // Initialize home page order
    if (homeOrder.length > 0) {
        const validOrder = homeOrder.filter(k => homePageConfigurableFields.includes(k));
        const newFields = homePageConfigurableFields.filter(k => !validOrder.includes(k));
        setHomePageFieldOrder([...validOrder, ...newFields]);
    } else {
        setHomePageFieldOrder(homePageConfigurableFields);
    }

    // Initialize home page visibility
    const newHomeVisibility: Record<string, boolean> = {};
    const defaultVisible = ['name', 'brand', 'category', 'price', 'status'];
    homePageConfigurableFields.forEach(key => {
        if (homeVisibility[key] !== undefined) {
             newHomeVisibility[key] = homeVisibility[key];
        } else {
            newHomeVisibility[key] = defaultVisible.includes(key);
        }
    });
    setHomePageVisibleFields(newHomeVisibility);

    // Initialize header names
    setHeaderNames(storedHeaders);

  }, [productKeys]); // Re-run when product keys change
  
  const addProduct = async (productData: ProductFormValues): Promise<void> => {
    const docRef = doc(db, "products", productData.productId);
    
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      throw new Error(\`Product with ID "\${productData.productId}" already exists.\`);
    }

    const newProduct: Record<string, any> = {
      ...productData,
      status: productData.status || 'Available',
      qtyForQuote: 0,
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
          throw new Error(\`Product with new ID "\${productId}" already exists.\`);
        }
        
        const oldDataSnap = await getDoc(oldDocRef);
        const oldData = oldDataSnap.data() || {};
        
        const combinedData = { ...oldData, ...restOfData };
        
        const newProductData: Record<string, any> = {};
        Object.entries(combinedData).forEach(([key, value]) => {
            if (value !== null && value !== undefined && value !== '') {
                 if (value instanceof Date) {
                    newProductData[key] = Timestamp.fromDate(value);
                } else if (value.toDate && typeof value.toDate === 'function'){
                    newProductData[key] = value; // It's already a Timestamp
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
  
  const updateProductField = async (productId: string, field: string, value: any) => {
    const docRef = doc(db, 'products', productId);
    try {
        await updateDoc(docRef, { [field]: value });
         toast({
            title: 'Product Updated',
            description: \`Successfully updated \${field}.\`,
        });
    } catch (error) {
        console.error("Error updating product field: ", error);
        toast({
            title: 'Error',
            description: \`Failed to update \${field}.\`,
            variant: 'destructive',
        });
    }
  }


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
        description: \`\${productToDelete.name} has been successfully deleted.\`,
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
        description: \`The column "\${columnName}" has been added to all products.\`,
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
      description: \`The column "\${columnName}" has been deleted from all products.\`,
      variant: 'destructive',
    });
  };

  const setColumnOrder = (order: string[]) => {
    setProductKeys(order);
    localStorage.setItem('productKeysOrder', JSON.stringify(order));
  };

  const renameColumn = (columnKey: string, newName: string) => {
      const newHeaders = {...headerNames, [columnKey]: newName};
      setHeaderNames(newHeaders);
      localStorage.setItem('headerNames', JSON.stringify(newHeaders));
  }
  
  const setHomePageOrder = (order: string[]) => {
    setHomePageFieldOrder(order);
    localStorage.setItem('homePageFieldOrder', JSON.stringify(order));
  };

  const toggleHomePageVisibility = (key: string) => {
    const newVisibility = {...homePageVisibleFields, [key]: !homePageVisibleFields[key]};
    setHomePageVisibleFields(newVisibility);
    localStorage.setItem('homePageVisibleFields', JSON.stringify(newVisibility));
  };
  
  const toggleAdminTableFieldVisibility = (key: string) => {
    const newVisibility = {...adminTableVisibleFields, [key]: !adminTableVisibleFields[key]};
    setAdminTableVisibleFields(newVisibility);
    localStorage.setItem('adminTableVisibleFields', JSON.stringify(newVisibility));
  };

  const toggleProductSelection = useCallback((productId: string) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  }, []);

  const toggleSelectAllProducts = useCallback((productIds: string[]) => {
    setSelectedProducts(prev => {
        const visibleProductIds = new Set(productIds);
        const selectedProductIds = new Set(prev);
        
        const allVisibleSelected = productIds.every(id => selectedProductIds.has(id));

        if (allVisibleSelected) {
            // Deselect all visible products
            return prev.filter(id => !visibleProductIds.has(id));
        } else {
            // Select all visible products
            return [...new Set([...prev, ...productIds])];
        }
    });
  }, []);
  
  const clearSelection = useCallback(() => {
    setSelectedProducts([]);
  }, []);


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
        homePageFieldOrder,
        setHomePageFieldOrder: setHomePageOrder,
        homePageVisibleFields,
        toggleHomePageFieldVisibility: toggleHomePageVisibility,
        adminTableVisibleFields,
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
