

'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { Product } from '@/lib/types';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

const formSchema = z.object({
  id: z.string().min(3, { message: 'Product ID must be at least 3 characters.' }),
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  price: z.coerce.number().min(0, { message: 'Price must be a positive number.' }),
  category: z.string().min(2, { message: 'Category must be at least 2 characters.' }),
  brand: z.string().min(2, { message: 'Brand must be at least 2 characters.' }),
  color: z.string().min(2, { message: 'Color must be at least 2 characters.' }),
  images: z.string().min(1, { message: 'Please provide at least one image URL.' }),
});

type ProductFormValues = Omit<Product, 'description' | 'images'> & { images: string };

interface ProductFormProps {
  initialData?: Product | null;
  onSubmit: (data: Product, originalId?: string) => void;
}

export function ProductForm({ initialData, onSubmit }: ProductFormProps) {
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ? {
      ...initialData,
      images: initialData.images?.join(', ') || '',
    } : {
      id: '',
      name: '',
      price: 0,
      category: '',
      brand: '',
      color: '',
      images: '',
    },
  });

  const onFormSubmit = (values: z.infer<typeof formSchema>) => {
    const imagesAsArray = values.images.split(',').map(url => url.trim()).filter(url => url);
    
    onSubmit({
      ...values,
      images: imagesAsArray,
      description: initialData?.description || '' 
    }, initialData?.id);
  }

  const imagePreview = form.watch('images')?.split(',')[0]?.trim();

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Product ID</FormLabel>
              <FormControl>
                <Input placeholder="e.g. P1001010" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Product Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Acoustic Guitar" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
         <FormField
          control={form.control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Price</FormLabel>
              <FormControl>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">₹</span>
                  <Input type="number" placeholder="e.g. 249.99" className="pl-7" {...field} />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
         <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Instruments" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="brand"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Brand</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Fender" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="color"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Color</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Blue" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="images"
          render={({ field }) => (
             <FormItem>
              <FormLabel>Product Images</FormLabel>
              <FormControl>
                 <Textarea 
                  placeholder="Enter image URLs, separated by commas"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {imagePreview && (
          <div className="flex justify-center">
            <Image
              src={imagePreview}
              alt="Product preview"
              width={200}
              height={200}
              className="rounded-lg object-cover"
            />
          </div>
        )}

        <div className="flex gap-4">
          <Button type="submit" className="flex-grow">
            {initialData ? 'Save Changes' : 'Create Product'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}
