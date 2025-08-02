
'use client';

import { ProductForm } from '@/components/product-form';
import { useProducts } from '@/context/product-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import type { Product } from '@/lib/types';

export default function NewProductPage() {
  const { addProduct } = useProducts();
  const router = useRouter();

  const handleSubmit = async (data: Product) => {
    await addProduct(data);
    router.push('/admin');
  };

  return (
    <div className="max-w-2xl mx-auto">
       <Card>
        <CardHeader>
          <CardTitle>Add New Product</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductForm onSubmit={handleSubmit} initialData={null} />
        </CardContent>
      </Card>
    </div>
  );
}
