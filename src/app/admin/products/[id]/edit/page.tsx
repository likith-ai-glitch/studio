
'use client';

import { useEffect, useState } from 'react';
import { ProductForm } from '@/components/product-form';
import { useProducts } from '@/context/product-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter, useParams } from 'next/navigation';
import { notFound } from 'next/navigation';
import type { Product } from '@/lib/types';
import { Loader2 } from 'lucide-react';

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const { getProduct, updateProduct } = useProducts();
  
  const id = params.id as string;
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

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
    // This will be caught by notFound() in useEffect, but as a fallback
    return notFound();
  }

  const handleSubmit = async (data: Omit<Product, 'id'>) => {
    await updateProduct({ ...data, id });
    router.push('/admin');
  };

  return (
    <div className="max-w-2xl mx-auto">
       <Card>
        <CardHeader>
          <CardTitle>Edit Product</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductForm initialData={product} onSubmit={handleSubmit} />
        </CardContent>
      </Card>
    </div>
  );
}
