
'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { Product } from '@/lib/types';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Upload } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useProducts } from '@/context/product-context';

const formSchema = z.object({
  id: z.string().min(3, { message: 'Product ID must be at least 3 characters.' }),
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  price: z.coerce.number().min(0, { message: 'Price must be a positive number.' }),
  category: z.string().min(2, { message: 'Category must be at least 2 characters.' }),
  brand: z.string().min(2, { message: 'Brand must be at least 2 characters.' }),
  color: z.string().min(2, { message: 'Color must be at least 2 characters.' }),
}).catchall(z.any());

interface ProductFormProps {
  initialData?: Product | null;
  onSubmit: (data: z.infer<typeof formSchema>, originalId?: string) => void;
  isSubmitting?: boolean;
}

export function ProductForm({ initialData, onSubmit, isSubmitting }: ProductFormProps) {
  const router = useRouter();
  const { productKeys } = useProducts();

  const defaultValues = productKeys.reduce((acc, key) => {
    if (initialData && initialData[key] !== undefined) {
      acc[key] = initialData[key];
    } else {
       acc[key] = '';
    }
    return acc;
  }, {} as Record<string, any>);


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ? defaultValues : {
      id: '',
      name: '',
      price: 0,
      category: '',
      brand: '',
      color: '',
    },
  });
  
  const { control, handleSubmit, watch } = form;

  const onFormSubmit = (values: z.infer<typeof formSchema>) => {
    onSubmit(values, initialData?.id);
  }

  const watchedValues = watch();

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
        {Object.keys(watchedValues).map((key) => {
           if (key === 'description' || key === 'image') return null;
            return (
                <FormField
                  key={key}
                  control={control}
                  name={key}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{key.charAt(0).toUpperCase() + key.slice(1)}</FormLabel>
                      <FormControl>
                        {key === 'price' ? (
                          <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">₹</span>
                            <Input type="number" {...field} className="pl-7" />
                          </div>
                        ) : (
                          <Input {...field} />
                        )}
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            )
        })}
        
        <div className="flex gap-4">
          <Button type="submit" className="flex-grow" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : (initialData ? 'Save Changes' : 'Create Product')}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}
