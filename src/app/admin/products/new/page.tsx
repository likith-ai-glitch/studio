
'use client';

import { useState } from 'react';
import { ProductForm } from '@/components/product-form';
import { useProducts } from '@/context/product-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';

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


export default function NewProductPage() {
  const { addProduct } = useProducts();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (data: ProductFormValues, originalId?: string, onProgress?: (progress: number) => void) => {
    setIsSubmitting(true);
    
    const { id: toastId } = toast({
      title: 'Adding Product...',
      description: `${data.name} is being added to the store.`,
    });

    try {
      await addProduct(data, toastId, onProgress);
      toast({
        id: toastId,
        title: 'Product Added',
        description: `${data.name} has been successfully added.`,
      });
      router.push('/admin');
    } catch (error: any) {
        toast({
          id: toastId,
          title: "Error adding product",
          description: error.message,
          variant: 'destructive',
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
       <Card>
        <CardHeader>
          <CardTitle>Add New Product</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductForm onSubmit={handleSubmit} initialData={null} isSubmitting={isSubmitting} />
        </CardContent>
      </Card>
    </div>
  );
}
