

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

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      // Clear existing products in Firestore
      const existingProductsSnapshot = await getDocs(productsCollectionRef);
      const deleteBatch = writeBatch(db);
      existingProductsSnapshot.forEach(doc => {
        deleteBatch.delete(doc.ref);
      });
      await deleteBatch.commit();

      // Seed the database with initial products
      console.log("Database cleared. Re-seeding with initial products...");
      const seedBatch = writeBatch(db);
      initialProducts.forEach((product) => {
        const docRef = doc(db, "products", product.id);
        seedBatch.set(docRef, product);
      });
      await seedBatch.commit();
      console.log("Database re-seeded successfully.");

      // Fetch the newly seeded products
      const newSnapshot = await getDocs(productsCollectionRef);
      const productsData = newSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(productsData);

    } catch (error) {
      console.error("Error resetting products: ", error);
      toast({
        title: "Error",
        description: "Could not reset products in the database.",
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

  const addProduct = async (productData: ProductFormValues) => {
    try {
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
      if (productData.image && productData.image instanceof File) {
        const file = productData.image;
        const storageRef = ref(storage, `products/${newId}/${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        imageUrl = await getDownloadURL(snapshot.ref);
      }
      
      const newProductData: Product = {
        id: newId,
        name: productData.name,
        price: productData.price,
        category: productData.category,
        brand: productData.brand,
        color: productData.color,
        description: '', // Default empty description
        image: imageUrl,
      };

      await setDoc(docRef, newProductData);
      setProducts((prev) => [...prev, newProductData]);

      toast({
        title: "Product Added",
        description: `${newProductData.name} has been successfully added.`,
      });
      
    } catch (error) {
       console.error("Error adding product: ", error);
       if (error.message !== "Product ID already exists") {
         toast({
          title: "Error",
          description: "Failed to add product.",
          variant: "destructive",
        });
       }
      throw error;
    }
  };

  const updateProduct = async (productData: ProductFormValues, originalId: string) => {
    try {
        const newId = productData.id;
        const oldProduct = products.find(p => p.id === originalId);
        if (!oldProduct) throw new Error("Original product not found for update.");
        
        const docRef = doc(db, 'products', originalId);

        let imageUrl = oldProduct.image;
        if (productData.image && productData.image instanceof File) {
            const file = productData.image;
            // Delete old image if it's not a placeholder
            if (imageUrl && !imageUrl.includes('placehold.co')) {
                try {
                    const oldImageRef = ref(storage, imageUrl);
                    await deleteObject(oldImageRef);
                } catch (e: any) {
                    if (e.code !== 'storage/object-not-found') {
                        console.error("Could not delete old image:", e);
                    }
                }
            }
            const newStorageRef = ref(storage, `products/${originalId}/${file.name}`);
            const snapshot = await uploadBytes(newStorageRef, file);
            imageUrl = await getDownloadURL(snapshot.ref);
        } else if (typeof productData.image === 'string') {
          imageUrl = productData.image;
        }

        const updatedProductData: Partial<Product> = {
            name: productData.name,
            price: productData.price,
            category: productData.category,
            brand: productData.brand,
            color: productData.color,
            image: imageUrl,
        };

        if (newId !== originalId) {
            // ID has changed, which is a more complex operation (delete and add)
            const newDocRef = doc(db, 'products', newId);
            const fullNewProduct: Product = {
              ...oldProduct,
              ...updatedProductData,
              id: newId,
            };
            await setDoc(newDocRef, fullNewProduct);
            await deleteDoc(docRef);
            setProducts((prev) => prev.map((p) => (p.id === originalId ? fullNewProduct : p)));
        } else {
            // ID is the same, just update
            await updateDoc(docRef, updatedProductData);
            setProducts((prev) => prev.map((p) => (p.id === originalId ? { ...p, ...updatedProductData } : p)));
        }

        toast({
            title: "Product Updated",
            description: `${productData.name} has been updated.`,
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
    const productDocRef = doc(db, 'products', productId);
    try {
      const product = products.find(p => p.id === productId);
      if (!product) throw new Error("Product not found");

      if (product.image && !product.image.includes('placehold.co')) {
        try {
          const imageRef = ref(storage, product.image);
          await deleteObject(imageRef);
        } catch (storageError: any) {
          if (storageError.code === 'storage/object-not-found') {
             console.log("Image not found in storage, proceeding to delete Firestore doc.");
          } else {
            // Re-throw other storage errors
            throw storageError;
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
        return { id: docSnap.id, ...docSnap.data() } as Product;
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
