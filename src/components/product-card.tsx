
'use client';

import Link from 'next/link';
import type { Product } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { useProducts } from '@/context/product-context';

interface ProductCardProps {
  product: Product;
  hideWishlistButton?: boolean;
}

export function ProductCard({ product, hideWishlistButton = false }: ProductCardProps) {
  const router = useRouter();
  const { headerNames } = useProducts();
  const isUnavailable = product.status === 'Unavailable';

  const hiddenFields = ['id', 'name', 'brand', 'description', 'status', 'startDate', 'lastUpdatedDate'];
  const productDetails = Object.entries(product)
    .filter(([key, value]) => !hiddenFields.includes(key) && value)
    .map(([key, value]) => ({
      label: headerNames[key] || key.charAt(0).toUpperCase() + key.slice(1),
      value: value,
    }));

  return (
    <Card className="flex flex-col h-full overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
      <Link href={`/products/${product.id}`} className="flex flex-col h-full">
        <CardHeader className="p-0">
          <div className="relative">
            <div className={cn("flex items-center justify-center bg-muted w-full h-48", isUnavailable && "grayscale")}>
                 <Package className="w-24 h-24 text-muted-foreground" />
            </div>
            {isUnavailable && (
                <Badge variant="destructive" className="absolute top-2 left-2">Unavailable</Badge>
            )}
          </div>
          <div className="p-4">
            <p className="text-sm text-muted-foreground">{product.brand}</p>
            <CardTitle className="text-lg font-headline mt-1 line-clamp-2">{product.name}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex-grow p-4 pt-0 space-y-2">
          {productDetails.map(detail => (
            <div key={detail.label} className="text-sm">
              <span className="font-semibold">{detail.label}: </span>
              <span className="text-muted-foreground">{String(detail.value)}</span>
            </div>
          ))}
        </CardContent>
        <CardFooter className="p-4 pt-0 mt-auto">
           <Button className="w-full" disabled={isUnavailable} variant={'secondary'}>
            View Product
          </Button>
        </CardFooter>
      </Link>
    </Card>
  );
}
