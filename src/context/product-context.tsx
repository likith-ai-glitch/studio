

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

  const fetchProducts = useCallback(async (force = false) => {
    if (!force && products.length > 0 && !loading) return;

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
  }, [toast, products.length, loading]);

  useEffect(() => {
    fetchProducts(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

 const uploadImagesAndUpdateUrls = async (productId: string, files: File[], existingImageUrls: string[] = []) => {
    const uploadPromises = files.map(async (file) => {
        const storageRef = ref(storage, `products/${productId}/${file.name}`);
        await uploadBytes(storageRef, file);
        return getDownloadURL(storageRef);
    });

    try {
        const newImageUrls = await Promise.all(uploadPromises);
        const allImageUrls = [...existingImageUrls, ...newImageUrls];

        const productDocRef = doc(db, 'products', productId);
        await updateDoc(productDocRef, { images: allImageUrls });

        // Update local state after URLs are finalized
        setProducts(prevProducts =>
            prevProducts.map(p =>
                p.id === productId ? { ...p, images: allImageUrls } : p
            )
        );
    } catch (error) {
        console.error("Error during image upload and URL update:", error);
        toast({
            title: "Image Upload Failed",
            description: "Some images could not be uploaded. Please try editing the product again.",
            variant: "destructive",
        });
    }
};


  const addProduct = async (productData: ProductFormValues) => {
    try {
      const newImageFiles = productData.images.filter(img => img instanceof File) as File[];

      const newProduct: Product = {
        ...productData,
        images: [], // Start with no images, they will be added as they upload
        description: '' // Default empty description
      };
      
      // Immediately save the product with no images
      await setDoc(doc(db, "products", newProduct.id), newProduct);
      
      // Optimistically update the local state
      setProducts((prev) => [...prev, newProduct]);
      
      toast({
        title: "Product Added",
        description: `${newProduct.name} has been added. Images are uploading in the background.`,
      });
      
      // Start uploads in the background, don't await them here
      if (newImageFiles.length > 0) {
        uploadImagesAndUpdateUrls(newProduct.id, newImageFiles);
      }

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
        const existingImageUrls = productData.images.filter(img => typeof img === 'string') as string[];
        const newImageFiles = productData.images.filter(img => img instanceof File) as File[];
        const existingProduct = await getProduct(originalId);

        const updatedProductData: Omit<Product, 'description'> & { description?: string } = {
            ...productData,
            images: existingImageUrls,
        };
        // Preserve existing description if it's there
        if(existingProduct?.description) {
            updatedProductData.description = existingProduct.description;
        }


        const updateAndUpload = async () => {
            const docRef = doc(db, 'products', updatedProductData.id);
             // Use updateDoc instead of setDoc to avoid overwriting description if it's not in updatedProductData
            await updateDoc(docRef, { ...updatedProductData });

            // Optimistically update local state with the data we know
            setProducts((prev) =>
                prev.map((p) => (p.id === originalId ? { ...p, ...updatedProductData, id: updatedProductData.id } as Product : p))
            );

            toast({
                title: "Product Updated",
                description: `${updatedProductData.name} has been updated. New images are uploading.`,
            });
            
            // Upload new images in the background and update URLs
            if (newImageFiles.length > 0) {
              uploadImagesAndUpdateUrls(updatedProductData.id, newImageFiles, existingImageUrls);
            }
        }

        // If the ID has changed, we need to do a delete-and-create operation
        if (updatedProductData.id !== originalId) {
            const oldProductData = await getProduct(originalId);
            if (!oldProductData) throw new Error("Original product not found for ID change.");

            // Create new doc with full data
            const newDocData: Product = {
              ...oldProductData,
              ...updatedProductData,
              id: updatedProductData.id, // ensure new ID is used
            };
            const newDocRef = doc(db, "products", newDocData.id);
            await setDoc(newDocRef, newDocData);
            
            // Delete the old document
            const oldDocRef = doc(db, 'products', originalId);
            await deleteDoc(oldDocRef);

            // Optimistically update local state
            setProducts((prev) => [
              ...prev.filter(p => p.id !== originalId),
              newDocData
            ]);
            
            toast({
                title: "Product ID Changed",
                description: `Product updated with new ID: ${newDocData.id}.`,
            });

             // Upload new images in the background and update URLs for the NEW document ID
            if (newImageFiles.length > 0) {
              uploadImagesAndUpdateUrls(newDocData.id, newImageFiles, existingImageUrls);
            }
        } else {
            await updateAndUpload();
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
    const productDoc = doc(db, 'products', productId);
    try {
      const product = products.find(p => p.id === productId);
      if (!product) throw new Error("Product not found");

      // Delete images from Firebase Storage
      if (product.images && product.images.length > 0) {
        for (const imageUrl of product.images) {
          try {
            const imageRef = ref(storage, imageUrl);
            await deleteObject(imageRef);
          } catch (storageError: any) {
              // It's okay if file doesn't exist (e.g. placehold.co images or if deletion fails)
              if (storageError.code !== 'storage/object-not-found') {
                  console.error("Could not delete image from storage:", storageError);
              }
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
