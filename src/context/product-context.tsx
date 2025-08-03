
'use client';

import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { db, storage } from '@/lib/firebase';
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc, getDoc, writeBatch, getDocsFromServer, query } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
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
});
type ProductFormValues = z.infer<typeof formSchema>;


interface ProductContextType {
  products: Product[];
  loading: boolean;
  addProduct: (productData: ProductFormValues) => Promise<void>;
  updateProduct: (productData: ProductFormValues, originalId: string) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  getProduct: (productId: string) => Promise<Product | undefined>;
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
  
  const addProduct = async (productData: ProductFormValues): Promise<void> => {
    const newId = productData.id;
    const docRef = doc(db, 'products', newId);

    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      toast({
        title: "Error",
        description: "A product with this ID already exists.",
        variant: "destructive",
      });
      throw new Error("Product ID already exists");
    }
    
    let imageUrl = 'https://placehold.co/600x400.png';
    
    const newProduct: Product = {
      id: newId,
      name: productData.name,
      price: productData.price,
      category: productData.category,
      brand: productData.brand,
      color: productData.color,
      description: 'A great product.', // default description
      image: imageUrl,
    };
    
    await setDoc(docRef, newProduct);
    toast({
      title: 'Product Added',
      description: `${newProduct.name} has been successfully added.`,
    });
  };

  const updateProduct = async (productData: ProductFormValues, originalId: string): Promise<void> => {
      const oldProduct = products.find(p => p.id === originalId);
      if (!oldProduct) {
          toast({ title: "Error", description: "Product not found.", variant: "destructive" });
          throw new Error("Original product not found for update.");
      }
      
      const newId = productData.id;
      
      let imageUrl = oldProduct.image;
      
      const updatedProductData: Omit<Product, 'id'> = {
        name: productData.name,
        price: productData.price,
        category: productData.category,
        brand: productData.brand,
        color: productData.color,
        description: oldProduct.description,
        image: imageUrl,
      };
      
      if (newId !== originalId) {
          const oldDocRef = doc(db, 'products', originalId);
          const newDocRef = doc(db, 'products', newId);
          await setDoc(newDocRef, updatedProductData);
          await deleteDoc(oldDocRef);
      } else {
          const docRef = doc(db, 'products', originalId);
          await updateDoc(docRef, updatedProductData);
      }
      toast({
          title: 'Product Updated',
          description: `${productData.name} has been successfully updated.`,
      });
  };

  const deleteProduct = async (productId: string) => {
    const productToDelete = products.find(p => p.id === productId);
    if (!productToDelete) return;
    
    const originalProducts = products;
    setProducts(prev => prev.filter(p => p.id !== productId));
    
    const productDocRef = doc(db, 'products', productId);
    try {
      if (productToDelete.image && !productToDelete.image.includes('placehold.co') && !productToDelete.image.startsWith('blob:')) {
        try {
          const imageRef = ref(storage, productToDelete.image);
          await deleteObject(imageRef);
        } catch (storageError: any) {
          if (storageError.code === 'storage/object-not-found') {
             console.log("Image not found in storage, proceeding to delete Firestore doc.");
          } else {
             throw storageError; // Rethrow other storage errors
          }
        }
      }
      
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
