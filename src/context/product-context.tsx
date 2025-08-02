
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
  
  const uploadImage = async (id: string, file: File): Promise<string> => {
    const storageRef = ref(storage, `products/${id}/${file.name}`);
    const snapshot = await uploadBytes(storageRef, file);
    return getDownloadURL(snapshot.ref);
  };

  const addProduct = async (productData: ProductFormValues) => {
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

    const tempProductData: Product = {
      id: newId,
      name: productData.name,
      price: productData.price,
      category: productData.category,
      brand: productData.brand,
      color: productData.color,
      description: '', 
      image: productData.image instanceof File 
        ? URL.createObjectURL(productData.image) 
        : (productData.image || 'https://placehold.co/600x400.png'),
    };
    
    // Immediately update UI
    setProducts((prev) => [...prev, tempProductData]);

    try {
      let imageUrl = 'https://placehold.co/600x400.png';
      if (productData.image instanceof File) {
        imageUrl = await uploadImage(newId, productData.image);
      } else if (productData.image) {
        imageUrl = productData.image;
      }
      
      const finalProductData: Product = { ...tempProductData, image: imageUrl };

      await setDoc(docRef, finalProductData);
      
      // Update UI with final data
      setProducts((prev) => prev.map(p => p.id === newId ? finalProductData : p));
      
      toast({
        title: "Product Added",
        description: `${finalProductData.name} has been successfully added.`,
      });

    } catch (error) {
       console.error("Error adding product: ", error);
       // Revert optimistic update on error
       setProducts((prev) => prev.filter(p => p.id !== newId));
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
    const newId = productData.id;
    const oldProduct = products.find(p => p.id === originalId);
    if (!oldProduct) {
        toast({ title: "Error", description: "Product not found.", variant: "destructive" });
        throw new Error("Original product not found for update.");
    }
    
    const tempUpdatedData: Product = {
        ...oldProduct,
        id: newId,
        name: productData.name,
        price: productData.price,
        category: productData.category,
        brand: productData.brand,
        color: productData.color,
        image: productData.image instanceof File 
            ? URL.createObjectURL(productData.image) 
            : (productData.image || oldProduct.image),
    };

    // Optimistically update UI
    if (newId !== originalId) {
        setProducts((prev) => [...prev.filter(p => p.id !== originalId), tempUpdatedData]);
    } else {
        setProducts((prev) => prev.map((p) => (p.id === originalId ? tempUpdatedData : p)));
    }

    try {
        let imageUrl = oldProduct.image;
        if (productData.image instanceof File) {
            imageUrl = await uploadImage(newId, productData.image);
            if (oldProduct.image && !oldProduct.image.includes('placehold.co')) {
                try {
                    const imageRefPath = ref(storage, oldProduct.image).fullPath;
                    if (imageRefPath) await deleteObject(ref(storage, imageRefPath));
                } catch (e: any) {
                    if (e.code !== 'storage/object-not-found') console.error("Could not delete old image:", e);
                }
            }
        } else if (productData.image) {
            imageUrl = productData.image;
        }

        const finalProductData: Product = { ...tempUpdatedData, image: imageUrl };
        
        const dbUpdate = async () => {
          if (newId !== originalId) {
              const oldDocRef = doc(db, 'products', originalId);
              const newDocRef = doc(db, 'products', newId);
              await setDoc(newDocRef, finalProductData);
              await deleteDoc(oldDocRef);
          } else {
              const docRef = doc(db, 'products', originalId);
              await updateDoc(docRef, { ...finalProductData });
          }
        };

        await dbUpdate();

        // Final UI update with correct URL
        if (newId !== originalId) {
            setProducts((prev) => [...prev.filter(p => p.id !== newId), finalProductData]);
        } else {
            setProducts((prev) => prev.map((p) => (p.id === newId ? finalProductData : p)));
        }

        toast({
            title: "Product Updated",
            description: `${productData.name} has been saved.`,
        });
        
    } catch (error) {
        console.error("Error updating product: ", error);
        // Revert optimistic update on error
        setProducts(prev => prev.map(p => p.id === (newId !== originalId ? newId : originalId) ? oldProduct : p).filter(p => !!p));
        if(newId !== originalId){
            setProducts(prev => prev.filter(p => p.id !== newId));
        }

        toast({
            title: "Error",
            description: "Failed to update product.",
            variant: "destructive",
        });
        throw error;
    }
  };

  const deleteProduct = async (productId: string) => {
    const productToDelete = products.find(p => p.id === productId);
    if (!productToDelete) return;

    const originalProducts = [...products];
    setProducts((prev) => prev.filter((p) => p.id !== productId));

    const productDocRef = doc(db, 'products', productId);
    try {
      if (productToDelete.image && !productToDelete.image.includes('placehold.co')) {
        try {
          const imageRef = ref(storage, productToDelete.image);
          await deleteObject(imageRef);
        } catch (storageError: any) {
          if (storageError.code === 'storage/object-not-found') {
             console.log("Image not found in storage, proceeding to delete Firestore doc.");
          } else {
             console.error("Could not delete image from storage. It may not exist.", storageError);
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
      setProducts(originalProducts);
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
