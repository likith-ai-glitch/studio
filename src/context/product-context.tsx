
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
  image: z.union([z.instanceof(File), z.string()]),
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

  const fetchProducts = useCallback(async (force = false) => {
    if (!force && products.length > 0 && !loading) return;

    setLoading(true);
    try {
      const querySnapshot = await getDocs(productsCollectionRef);
       if (querySnapshot.empty) {
        console.log("No products found in Firestore, seeding database...");
        const batch = writeBatch(db);
        initialProducts.forEach((product) => {
          const docRef = doc(db, "products", product.id);
          batch.set(docRef, product);
        });
        await batch.commit();
        console.log("Database seeded successfully.");
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
  }, [toast, products.length, loading]);

  useEffect(() => {
    fetchProducts(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

 const uploadImageAndUpdateUrl = async (productId: string, file: File): Promise<void> => {
    const storageRef = ref(storage, `products/${productId}/${file.name}`);
    await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(storageRef);
    
    const docRef = doc(db, 'products', productId);
    await updateDoc(docRef, { image: downloadUrl });

    // Update local state
    setProducts(prev => 
      prev.map(p => p.id === productId ? { ...p, image: downloadUrl } : p)
    );
};


  const addProduct = async (productData: ProductFormValues) => {
    try {
      const tempImageUrl = 'https://placehold.co/600x400.png';

      const newProduct: Product = {
        id: productData.id,
        name: productData.name,
        price: productData.price,
        category: productData.category,
        brand: productData.brand,
        color: productData.color,
        description: '',
        image: tempImageUrl,
      };
      
      // Optimistically add product to state and Firestore
      setProducts((prev) => [...prev, newProduct]);
      await setDoc(doc(db, "products", newProduct.id), newProduct);
      
      toast({
        title: "Product Added",
        description: `${newProduct.name} has been added. Image is uploading in the background.`,
      });

      // Start image upload in the background
      if (productData.image instanceof File) {
        uploadImageAndUpdateUrl(newProduct.id, productData.image).catch(error => {
          console.error("Background image upload failed: ", error);
          toast({
            title: "Image Upload Failed",
            description: `Could not upload image for ${newProduct.name}.`,
            variant: "destructive",
          });
        });
      }

    } catch (error) {
       console.error("Error adding product: ", error);
       // Revert optimistic update on error
       setProducts(prev => prev.filter(p => p.id !== productData.id));
       toast({
        title: "Error",
        description: "Failed to add product.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateProduct = async (productData: ProductFormValues, originalId: string) => {
    try {
        const newId = productData.id;
        const oldProduct = products.find(p => p.id === originalId);
        if (!oldProduct) throw new Error("Original product not found for update.");

        const updatedProductData: Product = {
          ...oldProduct,
          id: newId,
          name: productData.name,
          price: productData.price,
          category: productData.category,
          brand: productData.brand,
          color: productData.color,
          image: productData.image instanceof File ? oldProduct.image : productData.image, // Keep old image for now if new one is being uploaded
        };

        // --- Optimistic UI Update ---
        if (newId !== originalId) {
            // ID change requires delete and set
            setProducts((prev) => [...prev.filter((p) => p.id !== originalId), updatedProductData]);
            await setDoc(doc(db, 'products', newId), updatedProductData);
            await deleteDoc(doc(db, 'products', originalId));
        } else {
            // No ID change, just update
            setProducts((prev) => prev.map((p) => (p.id === newId ? updatedProductData : p)));
            await updateDoc(doc(db, 'products', newId), updatedProductData);
        }

        toast({
            title: "Product Updated",
            description: `${updatedProductData.name} has been updated.`,
        });

        // --- Background Image Upload ---
        if (productData.image instanceof File) {
             uploadImageAndUpdateUrl(newId, productData.image).catch(error => {
                console.error("Background image upload failed: ", error);
                toast({
                    title: "Image Upload Failed",
                    description: `Could not upload new image for ${updatedProductData.name}.`,
                    variant: "destructive",
                });
             });
        }
        
    } catch (error) {
        console.error("Error updating product: ", error);
        // NOTE: A full rollback of optimistic UI here is complex. 
        // For now, we show an error and the user can refresh to see the true state.
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

      if (product.image && !product.image.includes('placehold.co')) {
          try {
            const imageRef = ref(storage, product.image);
            await deleteObject(imageRef);
          } catch (storageError: any) {
              if (storageError.code !== 'storage/object-not-found') {
                  console.error("Could not delete image from storage:", storageError);
              }
          }
        }
      
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
