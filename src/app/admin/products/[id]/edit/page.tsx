
'use client';

import { useEffect, useState } from 'react';
import { ProductForm } from '@/components/product-form';
import { useProducts } from '@/context/product-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter, useParams } from 'next/navigation';
import { notFound } from 'next/navigation';
import type { Product } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import * as z from 'zod';

const formSchema = z.object({
  id: z.string().min(3),
  name: z.string().min(2),
  price: z.coerce.number().min(0),
  category: z.string().min(2),
  brand: z.string().min(2),
  color: z.string().min(2),
  image: z.union([z.instanceof(File), z.string()]).optional(),
}).catchall(z.any());
type ProductFormValues = z.infer<typeof formSchema>;


export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const { getProduct, updateProduct } = useProducts();
  
  const id = params.id as string;
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchProduct = async () => {
      setLoading(true);
      const fetchedProduct = await getProduct(id);
      if (fetchedProduct) {
        setProduct(fetchedProduct);
      } else {
        notFound();
      }
      setLoading(false);
    };
    fetchProduct();
  }, [id, getProduct]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!product) {
    return notFound();
  }

  const handleSubmit = async (data: ProductFormValues, originalId?: string) => {
    if (!originalId) return;
    setIsSubmitting(true);
    try {
      await updateProduct(data, originalId);
      router.push('/admin');
      toast({
        title: 'Product Updated',
        description: `${data.name} has been successfully updated.`,
      });
    } catch(error) {
      console.error(error);
      toast({
        title: 'Error',
        description: 'Failed to update product.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
       <Card>
        <CardHeader>
          <CardTitle>Edit Product</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductForm initialData={product} onSubmit={handleSubmit} isSubmitting={isSubmitting} />
        </CardContent>
      </Card>
    </div>
  );
}
