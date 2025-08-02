

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
import { X, Upload } from 'lucide-react';
import { useState, useEffect } from 'react';

const formSchema = z.object({
  id: z.string().min(3, { message: 'Product ID must be at least 3 characters.' }),
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  price: z.coerce.number().min(0, { message: 'Price must be a positive number.' }),
  category: z.string().min(2, { message: 'Category must be at least 2 characters.' }),
  brand: z.string().min(2, { message: 'Brand must be at least 2 characters.' }),
  color: z.string().min(2, { message: 'Color must be at least 2 characters.' }),
  image: z.union([z.instanceof(File), z.string()]).refine(val => val, { message: 'Please provide an image.'}),
});

interface ProductFormProps {
  initialData?: Product | null;
  onSubmit: (data: z.infer<typeof formSchema>, originalId?: string) => void;
  isSubmitting?: boolean;
}

export function ProductForm({ initialData, onSubmit, isSubmitting }: ProductFormProps) {
  const router = useRouter();
  const [imagePreview, setImagePreview] = useState<string | null>(initialData?.image || null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id: initialData?.id || '',
      name: initialData?.name || '',
      price: initialData?.price || 0,
      category: initialData?.category || '',
      brand: initialData?.brand || '',
      color: initialData?.color || '',
      image: initialData?.image || undefined,
    },
  });

  const { control, handleSubmit, watch, setValue } = form;
  const currentImage = watch('image');
  
  useEffect(() => {
    let previewUrl: string | null = null;
    if (currentImage) {
        if (typeof currentImage === 'string') {
            previewUrl = currentImage;
        } else if (currentImage instanceof File) {
            previewUrl = URL.createObjectURL(currentImage);
        }
    }
    setImagePreview(previewUrl);

    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [currentImage]);

  const onFormSubmit = (values: z.infer<typeof formSchema>) => {
    onSubmit(values, initialData?.id);
  }

  const handleRemoveImage = () => {
    setValue('image', undefined, { shouldValidate: true });
  };
  
  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
        <FormField
          control={control}
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
          control={control}
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
          control={control}
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
          control={control}
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
          control={control}
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
          control={control}
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
        
        <Controller
          control={control}
          name="image"
          render={({ field: { onChange, value }, fieldState }) => (
            <FormItem>
              <FormLabel>Product Image</FormLabel>
              <FormControl>
                 <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted hover:bg-muted/80">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                    <p className="mb-2 text-sm text-muted-foreground">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground">SVG, PNG, JPG or GIF</p>
                  </div>
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        onChange(file);
                      }
                    }}
                  />
                </label>
              </FormControl>
              <FormMessage>{fieldState.error?.message}</FormMessage>
            </FormItem>
          )}
        />

        {imagePreview && (
          <div className="w-32 h-32 relative">
            <Image
              src={imagePreview}
              alt="Product preview"
              fill
              className="rounded-lg object-cover"
            />
             <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
              onClick={handleRemoveImage}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

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
