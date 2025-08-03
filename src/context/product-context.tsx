
'use client';

import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { db, storage } from '@/lib/firebase';
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc, getDoc, writeBatch, getDocs } from 'firebase/firestore';
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

  useEffect(() => {
    const initializeProducts = async () => {
        setLoading(true);
        const querySnapshot = await getDocs(productsCollectionRef);
        if (querySnapshot.empty) {
            console.log("Seeding database with initial products...");
            const seedBatch = writeBatch(db);
            initialProducts.forEach((product) => {
                const docRef = doc(db, "products", product.id);
                seedBatch.set(docRef, product);
            });
            await seedBatch.commit();
        }

        const unsubscribe = onSnapshot(productsCollectionRef, (snapshot) => {
            const productsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
            setProducts(productsData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching products with snapshot: ", error);
            toast({
                title: "Error",
                description: "Could not connect to Firestore.",
                variant: "destructive",
            });
            setLoading(false);
        });

        return unsubscribe;
    };

    const unsubscribePromise = initializeProducts();

    return () => {
        unsubscribePromise.then(unsubscribe => {
            if (unsubscribe) {
                unsubscribe();
            }
        }).catch(err => console.error("Error during unsubscribe cleanup:", err));
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
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
      description: 'A great product.',
      image: productData.image instanceof File ? URL.createObjectURL(productData.image) : 'https://placehold.co/600x400.png',
    };
    
    // Optimistically update UI
    setProducts((prev) => [...prev, tempProductData]);

    try {
      // Save text data first
      const productToSave = { ...tempProductData, image: 'https://placehold.co/600x400.png' };
      await setDoc(docRef, productToSave);

      if (productData.image instanceof File) {
        // Upload image in the background
        const storageRef = ref(storage, `products/${newId}/${productData.image.name}`);
        uploadBytes(storageRef, productData.image).then(snapshot => {
            getDownloadURL(snapshot.ref).then(async (imageUrl) => {
                const finalProductData = { ...tempProductData, image: imageUrl };
                // Update firestore with final image URL
                await updateDoc(docRef, { image: imageUrl });
                // Update local state with final image URL for consistency
                setProducts((prev) => prev.map(p => p.id === newId ? finalProductData : p));
            });
        });
      }
      
      toast({
        title: "Product Added",
        description: `${productData.name} has been successfully added.`,
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
      
      const tempProductData: Product = {
          ...oldProduct,
          id: newId,
          name: productData.name,
          price: productData.price,
          category: productData.category,
          brand: productData.brand,
          color: productData.color,
          image: productData.image instanceof File ? URL.createObjectURL(productData.image) : oldProduct.image,
      };

      // Optimistically update UI
      setProducts(prev => prev.map(p => (p.id === originalId ? tempProductData : p)));


      try {
          const productToSave = { ...tempProductData, image: oldProduct.image };
          // Handle ID change
          if (newId !== originalId) {
              const oldDocRef = doc(db, 'products', originalId);
              const newDocRef = doc(db, 'products', newId);
              await setDoc(newDocRef, productToSave);
              await deleteDoc(oldDocRef);
          } else {
              const docRef = doc(db, 'products', originalId);
              await updateDoc(docRef, productToSave);
          }


          if (productData.image instanceof File) {
            const imageFile = productData.image;
            const storageRef = ref(storage, `products/${newId}/${imageFile.name}`);
            
            // Upload in background
            uploadBytes(storageRef, imageFile).then(snapshot => {
                getDownloadURL(snapshot.ref).then(async (newImageUrl) => {
                    const finalProductData = { ...tempProductData, image: newImageUrl };
                    const docRefToUpdate = doc(db, 'products', newId);
                    await updateDoc(docRefToUpdate, { image: newImageUrl });

                     // Update local state with final image URL for consistency
                    setProducts((prev) => prev.map(p => p.id === newId ? finalProductData : p));
                    
                    // Delete old image if it was not a placeholder
                    if (oldProduct.image && !oldProduct.image.includes('placehold.co') && oldProduct.image !== newImageUrl) {
                        try {
                            const imageRefPath = ref(storage, oldProduct.image).fullPath;
                            if (imageRefPath) await deleteObject(ref(storage, imageRefPath));
                        } catch (e: any) {
                            if (e.code !== 'storage/object-not-found') console.error("Could not delete old image:", e);
                        }
                    }
                })
            })
          }

          toast({
              title: "Product Updated",
              description: `${productData.name} has been saved.`,
          });
          
      } catch (error) {
          console.error("Error updating product: ", error);
          // Revert optimistic update
          setProducts(prev => prev.map(p => (p.id === newId ? oldProduct : p)));
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

    // Optimistic deletion
    const originalProducts = products;
    setProducts(prev => prev.filter(p => p.id !== productId));

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
      // Revert on error
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

    if (loading) return; // Don't fetch if initial load is happening

    try {
      const productDoc = doc(db, 'products', productId);
      const docSnap = await getDoc(productDoc);
      if (docSnap.exists()) {
        const productData = { id: docSnap.id, ...docSnap.data() } as Product;
        return productData;
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
