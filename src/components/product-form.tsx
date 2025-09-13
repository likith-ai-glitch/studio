
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
import { useMemo, useEffect } from 'react';
import { Loader2, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Timestamp } from 'firebase/firestore';


const formSchema = z.object({
  productId: z.string().min(3, { message: 'Product ID must be at least 3 characters.' }),
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  brand: z.string().min(2, { message: 'Brand must be at least 2 characters.' }),
  category: z.string().min(2, { message: 'Category must be at least 2 characters.' }),
  status: z.string().optional(),
  startDate: z.date().optional().nullable(),
  lastUpdatedDate: z.date().optional().nullable(),
}).catchall(z.any());

type ProductFormValues = z.infer<typeof formSchema>;

interface ProductFormProps {
  initialData?: Product | null;
  onSubmit: (data: ProductFormValues, originalProductId?: string) => Promise<void>;
  isSubmitting?: boolean;
}

export function ProductForm({ initialData, onSubmit, isSubmitting }: ProductFormProps) {
  const router = useRouter();
  const { productKeys, headerNames } = useProducts();

  const defaultValues = useMemo(() => {
    const baseValues: Record<string, any> = {};
    productKeys.forEach(key => {
        let value = initialData?.[key as keyof Product];
        if (value instanceof Timestamp) {
            value = value.toDate();
        }
        baseValues[key] = value ?? '';
    });
    if (!initialData) {
        baseValues['status'] = 'Available';
    }
    return baseValues;
  }, [initialData, productKeys]);


  const form = useForm<ProductFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });
  
  const { control, handleSubmit, reset, setValue, watch } = form;

  useEffect(() => {
    reset(defaultValues);
  }, [initialData, defaultValues, reset]);

  const onFormSubmit = async (values: ProductFormValues) => {
    await onSubmit(values, initialData?.productId);
  }

  const getLabel = (key: string) => {
     const customLabel = headerNames[key] || (key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'));
     if (key === 'productId') return 'Product ID';
     return customLabel;
  }
  
  const isValueValidDate = (value: any): value is Date =>
    value instanceof Date && !isNaN(value.getTime());

  const filteredKeys = productKeys.filter(key => key !== 'id');

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
        
        {filteredKeys.map((key) => {
            const label = getLabel(key);
            
            if (key === 'startDate' || key === 'lastUpdatedDate') {
              const dateValue = watch(key);
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
                              {isValueValidDate(field.value) ? (
                                format(field.value, "PPP p")
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
                            selected={isValueValidDate(field.value) ? field.value : undefined}
                            onSelect={(day) => {
                                const newDate = day || new Date();
                                const oldDate = isValueValidDate(field.value) ? field.value : new Date();
                                newDate.setHours(oldDate.getHours());
                                newDate.setMinutes(oldDate.getMinutes());
                                field.onChange(newDate);
                            }}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <div className="flex items-center gap-2 pt-2">
                        <FormLabel htmlFor={`${key}-time`} className="text-sm">Time:</FormLabel>
                        <Input
                            id={`${key}-time`}
                            type="time"
                            defaultValue={isValueValidDate(dateValue) ? format(dateValue, 'HH:mm') : ''}
                            disabled={!dateValue || isSubmitting}
                            className="w-auto"
                            onChange={(e) => {
                                const time = e.target.value;
                                if (isValueValidDate(dateValue) && time) {
                                    const [hours, minutes] = time.split(':').map(Number);
                                    const newDate = new Date(dateValue);
                                    newDate.setHours(hours, minutes, 0, 0); // Also reset seconds and ms
                                    setValue(key, newDate, { shouldDirty: true });
                                }
                            }}
                        />
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )
            }
            
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
            
            return (
                <FormField
                  key={key}
                  control={control}
                  name={key}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{label}</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''} disabled={isSubmitting} />
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
          <Button type="button" variant="outline" onClick={() => router.push('/admin/dashboard')} disabled={isSubmitting}>
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}
