
'use client';

import { ProductForm } from '@/components/product-form';
import { useProducts } from '@/context/product-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter, useParams } from 'next/navigation';
import { notFound } from 'next/navigation';
import type { Product } from '@/lib/types';

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const { getProduct, updateProduct } = useProducts();
  
  const id = Number(params.id);
  const product = getProduct(id);

  if (!product) {
    notFound();
  }

  const handleSubmit = (data: Omit<Product, 'id'>) => {
    updateProduct({ ...data, id });
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
