
'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Product } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useProducts } from '@/context/product-context';
import { useState, useEffect, useMemo } from 'react';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  id: z.string().min(3, { message: 'Product ID must be at least 3 characters.' }),
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  price: z.coerce.number().min(0, { message: 'Price must be a positive number.' }),
  category: z.string().min(2, { message: 'Category must be at least 2 characters.' }),
  brand: z.string().min(2, { message: 'Brand must be at least 2 characters.' }),
  color: z.string().min(2, { message: 'Color must be at least 2 characters.' }),
  status: z.string().optional(),
}).catchall(z.any());

type ProductFormValues = z.infer<typeof formSchema>;

interface ProductFormProps {
  initialData?: Product | null;
  onSubmit: (data: ProductFormValues, originalId?: string) => Promise<void>;
  isSubmitting?: boolean;
}

export function ProductForm({ initialData, onSubmit, isSubmitting }: ProductFormProps) {
  const router = useRouter();
  const { productKeys } = useProducts();

  const defaultValues = useMemo(() => {
    const baseValues: Record<string, any> = {
      id: '',
      name: '',
      price: 0,
      category: '',
      brand: '',
      color: '',
      status: 'Available',
    };

    if (!initialData) {
      return baseValues;
    }
    
    const values = productKeys.reduce((acc, key) => {
      if (initialData[key] !== undefined) {
        acc[key] = initialData[key];
      } else {
         acc[key] = '';
      }
      return acc;
    }, {} as Record<string, any>);
    
    return values;
  }, [initialData, productKeys]);


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });
  
  const { control, handleSubmit, watch, reset } = form;

  useEffect(() => {
    reset(defaultValues);
  }, [initialData, defaultValues, reset]);

  const onFormSubmit = async (values: z.infer<typeof formSchema>) => {
    await onSubmit(values, initialData?.id);
  }

  const watchedValues = watch();

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
        
        {Object.keys(watchedValues).map((key) => {
           if (key === 'description') return null;
            if (key === 'status') {
              return (
                 <FormField
                  key={key}
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                       <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Available">Available</SelectItem>
                          <SelectItem value="Unavailable">Unavailable</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )
            }
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
                            <Input type="number" {...field} className="pl-7" disabled={isSubmitting} />
                          </div>
                        ) : (
                          <Input {...field} disabled={(key === 'id' && !!initialData) || isSubmitting} />
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
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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

    