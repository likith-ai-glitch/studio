
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
import Image from 'next/image';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

const formSchema = z.object({
  id: z.string().min(3, { message: 'Product ID must be at least 3 characters.' }),
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  price: z.coerce.number().min(0, { message: 'Price must be a positive number.' }),
  category: z.string().min(2, { message: 'Category must be at least 2 characters.' }),
  brand: z.string().min(2, { message: 'Brand must be at least 2 characters.' }),
  color: z.string().min(2, { message: 'Color must be at least 2 characters.' }),
  status: z.string().optional(),
  image: z.union([z.instanceof(File), z.string()]).optional(),
}).catchall(z.any());

type ProductFormValues = z.infer<typeof formSchema>;

interface ProductFormProps {
  initialData?: Product | null;
  onSubmit: (data: ProductFormValues, originalId?: string, onProgress?: (progress: number) => void) => Promise<void>;
  isSubmitting?: boolean;
}

export function ProductForm({ initialData, onSubmit, isSubmitting }: ProductFormProps) {
  const router = useRouter();
  const { productKeys } = useProducts();
  const [imagePreview, setImagePreview] = useState<string | null>(initialData?.image || null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

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
    defaultValues: initialData ? { ...defaultValues, image: undefined } : {
      id: '',
      name: '',
      price: 0,
      category: '',
      brand: '',
      color: '',
      status: 'Available',
      image: undefined,
    },
  });
  
  const { control, handleSubmit, watch } = form;

  const onFormSubmit = async (values: z.infer<typeof formSchema>) => {
    const onProgress = (progress: number) => {
      setUploadProgress(progress);
    };
    await onSubmit(values, initialData?.id, onProgress);
    setUploadProgress(null);
  }

  const watchedValues = watch();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setImagePreview(reader.result as string);
          };
          reader.readAsDataURL(file);
          form.setValue('image', file);
          setUploadProgress(0);
      }
  };

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
        
        <FormField
          control={control}
          name="image"
          render={({ field }) => (
              <FormItem>
                  <FormLabel>Product Image</FormLabel>
                  <FormControl>
                      <Input type="file" accept="image/*" onChange={handleImageChange} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                  {imagePreview && (
                      <div className="mt-4">
                          <Image src={imagePreview} alt="Image preview" width={200} height={200} className="rounded-md object-cover" />
                      </div>
                  )}
                  {uploadProgress !== null && (
                     <Progress value={uploadProgress} className="mt-2" />
                  )}
              </FormItem>
          )}
        />

        {Object.keys(watchedValues).map((key) => {
           if (key === 'description' || key === 'image') return null;
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
