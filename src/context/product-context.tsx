

'use client';

import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { db, storage } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, getDoc, writeBatch } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { products as initialProducts } from '@/lib/products';
import type { Product } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

// We can't import this from product-form due to client/server boundary issues
const formSchema = z.object({
  id: z.string().min(3),
  name: z.string().min(2),
  price: z.coerce.number().min(0),
  category: z.string().min(2),
  brand: z.string().min(2),
  color: z.string().min(2),
  images: z.array(z.union([z.instanceof(File), z.string()])),
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

  const uploadImages = async (images: (File | string)[], productId: string): Promise<string[]> => {
      const imageUrls: string[] = [];
      for (const image of images) {
          if (typeof image === 'string') {
              imageUrls.push(image);
          } else {
              const storageRef = ref(storage, `products/${productId}/${image.name}`);
              await uploadBytes(storageRef, image);
              const downloadURL = await getDownloadURL(storageRef);
              imageUrls.push(downloadURL);
          }
      }
      return imageUrls;
  };


  const addProduct = async (productData: ProductFormValues) => {
    try {
      const imageUrls = await uploadImages(productData.images, productData.id);

      const newProduct: Product = {
        ...productData,
        images: imageUrls,
        description: '' // Default empty description
      };
      
      await setDoc(doc(db, "products", newProduct.id), newProduct);
      setProducts((prev) => [...prev, newProduct]);
      toast({
        title: "Product Added",
        description: `${newProduct.name} has been successfully added.`,
      });
    } catch (error) {
       console.error("Error adding product: ", error);
       toast({
        title: "Error",
        description: "Failed to add product.",
        variant: "destructive",
      });
      throw error; // re-throw to be caught in the form
    }
  };

  const updateProduct = async (productData: ProductFormValues, originalId: string) => {
    try {
        const imageUrls = await uploadImages(productData.images, productData.id);
        const existingProduct = await getProduct(originalId);

        const updatedProduct: Product = {
            ...productData,
            images: imageUrls,
            description: existingProduct?.description || '',
        };

        // If the ID has changed, delete old and create new.
        if (updatedProduct.id !== originalId) {
            const batch = writeBatch(db);
            const oldDocRef = doc(db, 'products', originalId);
            batch.delete(oldDocRef);
            const newDocRef = doc(db, 'products', updatedProduct.id);
            batch.set(newDocRef, updatedProduct);
            await batch.commit();
        } else {
            const productDoc = doc(db, 'products', updatedProduct.id);
            await updateDoc(productDoc, updatedProduct);
        }

        setProducts((prev) =>
            prev.map((p) => (p.id === originalId ? updatedProduct : p))
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
        throw error;
    }
  };

  const deleteProduct = async (productId: string) => {
    const productDoc = doc(db, 'products', productId);
    try {
      const product = products.find(p => p.id === productId);
      if (!product) throw new Error("Product not found");

      // Delete images from Firebase Storage
      for (const imageUrl of product.images) {
        try {
          const imageRef = ref(storage, imageUrl);
          await deleteObject(imageRef);
        } catch (storageError: any) {
            // It's okay if file doesn't exist (e.g. placehold.co images)
            if (storageError.code !== 'storage/object-not-found') {
                console.error("Could not delete image from storage:", storageError);
            }
        }
      }
      
      // Delete document from Firestore
      await deleteDoc(productDoc);
      setProducts((prev) => prev.filter((p) => p.id !== productId));
      
      toast({
        title: "Product Deleted",
        description: `${product.name} has been successfully deleted.`,
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

  const getProduct = async (productId: string): Promise<Product | undefined> => {
    // Try local state first for speed
    const localProduct = products.find(p => p.id === productId);
    if(localProduct) return localProduct;

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
