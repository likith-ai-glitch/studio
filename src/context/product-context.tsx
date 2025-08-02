

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
      const querySnapshot = await getDocs(productsCollectionRef);
      if (querySnapshot.empty) {
        console.log("No products found. Seeding database...");
        const batch = writeBatch(db);
        initialProducts.forEach((product) => {
          const docRef = doc(db, "products", product.id);
          batch.set(docRef, product);
        });
        await batch.commit();
        setProducts(initialProducts);
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

      // Prepare product data without the image
      const newProductData: Product = {
        id: newId,
        name: productData.name,
        price: productData.price,
        category: productData.category,
        brand: productData.brand,
        color: productData.color,
        description: '', // Default empty description
        image: 'https://placehold.co/600x400.png', // Placeholder image
      };

      // Save the text data first for an instant UI update
      await setDoc(docRef, newProductData);
      setProducts((prev) => [...prev, newProductData]);

      toast({
        title: "Product Added",
        description: `${newProductData.name} has been saved. Image is uploading in the background.`,
      });

      // Now, handle image upload in the background
      if (productData.image && productData.image instanceof File) {
        const file = productData.image;
        const storageRef = ref(storage, `products/${newId}/${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        const imageUrl = await getDownloadURL(snapshot.ref);

        // Update the document with the final image URL
        await updateDoc(docRef, { image: imageUrl });
        // Update local state to show the new image without a refresh
        setProducts((prev) => 
          prev.map(p => p.id === newId ? { ...p, image: imageUrl } : p)
        );
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
      throw error;
    }
  };

  const updateProduct = async (productData: ProductFormValues, originalId: string) => {
    try {
        const newId = productData.id;
        const oldProduct = products.find(p => p.id === originalId);
        if (!oldProduct) throw new Error("Original product not found for update.");
        
        let docRef = doc(db, 'products', originalId);

        // Prepare data for immediate update
        const updatedProductData: Partial<Product> = {
            name: productData.name,
            price: productData.price,
            category: productData.category,
            brand: productData.brand,
            color: productData.color,
        };

        // Handle ID change
        if (newId !== originalId) {
            const newDocRef = doc(db, 'products', newId);
            const fullNewProduct: Product = {
              ...oldProduct,
              ...updatedProductData,
              id: newId,
            };
            await setDoc(newDocRef, fullNewProduct);
            await deleteDoc(docRef);
            docRef = newDocRef; // Future updates (like image) should point to the new doc
            setProducts((prev) => prev.map((p) => (p.id === originalId ? fullNewProduct : p)));
        } else {
            await updateDoc(docRef, updatedProductData);
            setProducts((prev) => prev.map((p) => (p.id === originalId ? { ...p, ...updatedProductData } : p)));
        }

        toast({
            title: "Product Updated",
            description: `${productData.name} has been updated.`,
        });

        // Handle image upload in the background
        if (productData.image && productData.image instanceof File) {
            const file = productData.image;
            toast({ title: "Uploading image...", description: `New image for ${productData.name} is uploading.` });
            
            // Delete old image if it's not a placeholder
            if (oldProduct.image && !oldProduct.image.includes('placehold.co')) {
                try {
                    const oldImageRef = ref(storage, oldProduct.image);
                    await deleteObject(oldImageRef);
                } catch (e: any) {
                    if (e.code !== 'storage/object-not-found') {
                        console.error("Could not delete old image:", e);
                    }
                }
            }
            
            const newStorageRef = ref(storage, `products/${newId}/${file.name}`);
            const snapshot = await uploadBytes(newStorageRef, file);
            const imageUrl = await getDownloadURL(snapshot.ref);

            // Update with the new image URL
            await updateDoc(docRef, { image: imageUrl });
            setProducts((prev) => prev.map((p) => (p.id === newId ? { ...p, image: imageUrl } : p)));
             toast({ title: "Image Uploaded!", description: `New image for ${productData.name} is live.` });
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
          // IMPORTANT: Create a storage reference from the URL before deleting
          const imageRef = ref(storage, product.image);
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

    