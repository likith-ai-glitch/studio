
'use client';

import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { db, storage } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, getDoc, writeBatch } from 'firebase/firestore';
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
  image: z.union([z.instanceof(File), z.string()]).optional(),
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

  const fetchProducts = useCallback(async (forceReset = false) => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(productsCollectionRef);
      if (querySnapshot.empty || forceReset) {
        if (forceReset) {
          const deleteBatch = writeBatch(db);
          querySnapshot.docs.forEach(doc => deleteBatch.delete(doc.ref));
          await deleteBatch.commit();
          console.log("Existing products cleared.");
        }
        console.log("Seeding database with initial products...");
        const seedBatch = writeBatch(db);
        initialProducts.forEach((product) => {
          const docRef = doc(db, "products", product.id);
          seedBatch.set(docRef, product);
        });
        await seedBatch.commit();
        setProducts(initialProducts);
      } else {
        const productsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
        setProducts(productsData);
      }
    } catch (error) {
      console.error("Error fetching/seeding products: ", error);
      toast({
        title: "Error",
        description: "Could not fetch or reset products.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchProducts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const uploadImageAndUpdate = async (id: string, file: File) => {
    try {
      const storageRef = ref(storage, `products/${id}/${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      const docRef = doc(db, 'products', id);
      await updateDoc(docRef, { image: downloadURL });

      setProducts((prev) => 
        prev.map((p) => (p.id === id ? { ...p, image: downloadURL } : p))
      );
    } catch (error) {
       console.error("Error in background image upload: ", error);
       toast({
        title: "Image Upload Failed",
        description: "The product was saved, but the image failed to upload in the background.",
        variant: "destructive",
      });
    }
  };
  
  const addProduct = async (productData: ProductFormValues) => {
    const newId = productData.id;
    const docRef = doc(db, 'products', newId);
    
    try {
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        toast({
          title: "Error",
          description: "A product with this ID already exists.",
          variant: "destructive",
        });
        throw new Error("Product ID already exists");
      }
      
      const imageFile = productData.image instanceof File ? productData.image : null;
      
      const newProductData: Product = {
        id: newId,
        name: productData.name,
        price: productData.price,
        category: productData.category,
        brand: productData.brand,
        color: productData.color,
        description: '', 
        image: 'https://placehold.co/600x400.png', // Start with a placeholder
      };

      await setDoc(docRef, newProductData);
      
      // Optimistically update UI
      setProducts((prev) => [...prev, newProductData]);
      toast({
        title: "Product Added",
        description: `${newProductData.name} has been saved. Image is uploading in the background.`,
      });

      if (imageFile) {
        // Don't wait for this to finish
        uploadImageAndUpdate(newId, imageFile);
      }
      
    } catch (error) {
       console.error("Error adding product: ", error);
       if (error.message !== "Product ID already exists") {
         toast({
          title: "Error",
          description: "Failed to add product.",
          variant: "destructive",
        });
       }
       // Re-throw to be caught by the form handler
      throw error;
    }
  };

  const updateProduct = async (productData: ProductFormValues, originalId: string) => {
    try {
        const newId = productData.id;
        const oldProduct = products.find(p => p.id === originalId);
        if (!oldProduct) throw new Error("Original product not found for update.");
        
        const imageFile = productData.image instanceof File ? productData.image : null;
        
        const updatedProductData: Partial<Product> = {
            id: newId,
            name: productData.name,
            price: productData.price,
            category: productData.category,
            brand: productData.brand,
            color: productData.color,
        };

        if (newId !== originalId) {
            const oldDocRef = doc(db, 'products', originalId);
            const newDocRef = doc(db, 'products', newId);
            const fullProductData = { ...oldProduct, ...updatedProductData, id: newId, image: oldProduct.image };
            // If ID changes, we must move the document. Image handling gets complex.
            // Simplest for now: Re-create and delete.
            await setDoc(newDocRef, fullProductData);
            await deleteDoc(oldDocRef);
            setProducts((prev) => [...prev.filter(p => p.id !== originalId), fullProductData]);
        } else {
            const docRef = doc(db, 'products', originalId);
            await updateDoc(docRef, updatedProductData);
            setProducts((prev) => prev.map((p) => (p.id === originalId ? { ...p, ...updatedProductData } : p)));
        }

        toast({
            title: "Product Updated",
            description: `${productData.name} has been saved. Image is processing.`,
        });

        if (imageFile) {
           if (oldProduct.image && !oldProduct.image.includes('placehold.co')) {
             try {
                // Parse the URL to get the storage path before deleting
                const imageRefPath = ref(storage, oldProduct.image).fullPath;
                if (imageRefPath) {
                    await deleteObject(ref(storage, imageRefPath));
                }
              } catch (e: any) {
                if (e.code !== 'storage/object-not-found') {
                    console.error("Could not delete old image:", e);
                }
              }
          }
          uploadImageAndUpdate(newId, imageFile);
        }
        
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
    const productDocRef = doc(db, 'products', productId);
    try {
      const product = products.find(p => p.id === productId);
      if (!product) throw new Error("Product not found");

      if (product.image && !product.image.includes('placehold.co')) {
        try {
          // Correctly create a storage reference from the URL
          const imageRef = ref(storage, product.image);
          await deleteObject(imageRef);
        } catch (storageError: any) {
          if (storageError.code === 'storage/object-not-found') {
             console.log("Image not found in storage, proceeding to delete Firestore doc.");
          } else {
             // Don't throw, just log, so Firestore deletion can proceed
             console.error("Could not delete image from storage. It may not exist.", storageError);
          }
        }
      }
      
      await deleteDoc(productDocRef);
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
    const localProduct = products.find(p => p.id === productId);
    if(localProduct) return localProduct;

    setLoading(true);
    try {
      const productDoc = doc(db, 'products', productId);
      const docSnap = await getDoc(productDoc);
      if (docSnap.exists()) {
        const productData = { id: docSnap.id, ...docSnap.data() } as Product;
        setProducts(p => {
          if (p.some(i => i.id === productId)) {
            return p.map(i => i.id === productId ? productData : i);
          }
          return [...p, productData];
        });
        return productData;
      } else {
        console.log("No such document!");
        return undefined;
      }
    } catch (error) {
      console.error("Error getting product:", error);
      return undefined;
    } finally {
        setLoading(false);
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
