
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import type { Product } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useProducts } from '@/context/product-context';
import { useState, useEffect, useMemo } from 'react';
import { Loader2, CalendarIcon } from 'lucide-react';
import { Textarea } from './ui/textarea';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  id: z.string().min(3, { message: 'Product ID must be at least 3 characters.' }),
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  description: z.string().min(10, { message: 'Description must be at least 10 characters.' }),
  brand: z.string().min(2, { message: 'Brand must be at least 2 characters.' }),
  category: z.string().min(2, { message: 'Category must be at least 2 characters.' }),
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
  const { productKeys, headerNames } = useProducts();

  const defaultValues = useMemo(() => {
    const baseValues: Record<string, any> = {
      id: '',
      name: '',
      description: '',
      brand: '',
      category: '',
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
  
  const { control, handleSubmit, reset } = form;

  useEffect(() => {
    reset(defaultValues);
  }, [initialData, defaultValues, reset]);

  const onFormSubmit = async (values: z.infer<typeof formSchema>) => {
    const dataWithDates = { ...values };
    productKeys.forEach(key => {
      if (key === 'startDate' || key === 'lastUpdatedDate') {
        if (values[key] instanceof Date) {
          dataWithDates[key] = format(values[key], 'yyyy-MM-dd');
        }
      }
    });
    await onSubmit(dataWithDates, initialData?.id);
  }

  const getLabel = (key: string) => {
    return headerNames[key] || (key.charAt(0).toUpperCase() + key.slice(1));
  }

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
        
        {productKeys.map((key) => {
            const label = getLabel(key);
            if (key === 'status') {
              return (
                 <FormField
                  key={key}
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{label}</FormLabel>
                       <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value} disabled={isSubmitting}>
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
             if (key === 'description') {
              return (
                <FormField
                  key={key}
                  control={control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{label}</FormLabel>
                      <FormControl>
                        <Textarea {...field} disabled={isSubmitting} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )
            }
             if (key === 'startDate' || key === 'lastUpdatedDate') {
              return (
                <FormField
                  key={key}
                  control={control}
                  name={key}
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>{label}</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                              disabled={isSubmitting}
                            >
                              {field.value ? (
                                format(new Date(field.value), "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
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
                      <FormLabel>{label}</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={(key === 'id' && !!initialData) || isSubmitting} />
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
