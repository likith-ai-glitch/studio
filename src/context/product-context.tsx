
'use client';

import { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo } from 'react';
import { db, storage } from '@/lib/firebase';
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc, getDoc, writeBatch, getDocsFromServer, query, runTransaction, FieldValue, deleteField } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { products as initialProducts } from '@/lib/products';
import type { Product } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

const formSchema = z.object({
  id: z.string().min(3),
  name: z.string().min(2),
  price: z.coerce.number().min(0),
  category: z.string().min(2),
  brand: z.string().min(2),
  color: z.string().min(2),
  status: z.string().optional(),
  image: z.union([z.instanceof(File), z.string()]).optional(),
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
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export function ProductProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const productsCollectionRef = collection(db, 'products');

  const initializeDatabase = useCallback(async () => {
    setLoading(true);
    try {
      const q = query(productsCollectionRef);
      const snapshot = await getDocsFromServer(q);
      if (snapshot.empty) {
        console.log("Database is empty. Seeding with initial products...");
        const batch = writeBatch(db);
        initialProducts.forEach((product) => {
          const docRef = doc(db, "products", product.id);
          batch.set(docRef, product);
        });
        await batch.commit();
        console.log("Seeding complete.");
      }
    } catch (error) {
      console.error("Error checking or seeding database:", error);
      toast({
        title: "Firestore Error",
        description: "Could not initialize the product database.",
        variant: "destructive",
      });
    }

    const unsubscribe = onSnapshot(productsCollectionRef, (snapshot) => {
        const productsData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Product));
        setProducts(productsData.sort((a, b) => a.name.localeCompare(b.name)));
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

    return unsubscribe;
  }, [toast]);

  useEffect(() => {
    const unsubscribePromise = initializeDatabase();
    return () => {
        unsubscribePromise.then(unsubscribe => {
            if (unsubscribe) {
                unsubscribe();
            }
        }).catch(err => console.error("Error during unsubscribe cleanup:", err));
    };
  }, [initializeDatabase]);
  
  const uploadImage = async (imageFile: File, productId: string): Promise<string> => {
      const storageRef = ref(storage, `products/${productId}/${imageFile.name}`);
      const snapshot = await uploadBytes(storageRef, imageFile);
      const downloadURL = await getDownloadURL(snapshot.ref);
      return downloadURL;
  };
  
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
    
    let imageUrl = 'https://placehold.co/600x400.png';
    if (productData.image instanceof File) {
        imageUrl = await uploadImage(productData.image, newId);
    }
    
    const { image, ...restOfProductData } = productData;

    const newProduct = {
      ...restOfProductData,
      description: 'A great product.', // default description
      image: imageUrl,
      status: productData.status || 'Available',
    };
    
    await setDoc(docRef, newProduct);
  };

  const updateProduct = async (productData: ProductFormValues, originalId: string): Promise<void> => {
      const oldProduct = await getProduct(originalId);
      if (!oldProduct) {
          throw new Error("Original product not found for update.");
      }
      
      let imageUrl = oldProduct.image;
      if (productData.image instanceof File) {
          imageUrl = await uploadImage(productData.image, originalId);
      }
      
      const { image, ...restOfProductData } = productData;
      
      const updatedProductData = {
        ...oldProduct,
        ...restOfProductData,
        image: imageUrl
      };
      
      // ID cannot be changed in this implementation to prevent storage path issues.
      // If ID change is needed, it requires moving the image file in storage.
      if (productData.id !== originalId) {
          toast({
              title: "Update Info",
              description: "Changing product ID is not allowed. Other fields updated.",
              variant: "default",
          });
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

    if (loading) {
       console.log("Still loading products, can't fetch from server yet.");
       return;
    };

    try {
      console.log(`Product ${productId} not found locally, fetching from Firestore...`);
      const productDoc = doc(db, 'products', productId);
      const docSnap = await getDoc(productDoc);
      if (docSnap.exists()) {
        console.log("Product found in Firestore.");
        const productData = { id: docSnap.id, ...docSnap.data() } as Product;
        return productData;
      } else {
        console.log("No such document in Firestore!");
        return undefined;
      }
    } catch (error) {
      console.error("Error getting product:", error);
      return undefined;
    }
  };

  const addColumn = async (columnName: string) => {
    const batch = writeBatch(db);
    const snapshot = await getDocsFromServer(productsCollectionRef);
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
    const snapshot = await getDocsFromServer(productsCollectionRef);
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

  const productKeys = useMemo(() => {
    if (products.length === 0) return ['id', 'name', 'category', 'brand', 'color', 'price', 'status'];
    const keys = new Set<string>();
    products.forEach(p => Object.keys(p).forEach(k => keys.add(k)));
    const fixedOrder = ['image', 'id', 'name', 'category', 'brand', 'color', 'price', 'status'];
    const dynamicKeys = Array.from(keys).filter(k => !fixedOrder.includes(k) && k !== 'description');
    return [...fixedOrder, ...dynamicKeys];
  }, [products]);

  return (
    <ProductContext.Provider value={{ products, productKeys, loading, addProduct, updateProduct, deleteProduct, getProduct, addColumn, deleteColumn }}>
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

    