
'use client';

import Link from 'next/link';
import type { Product } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useProducts } from '@/context/product-context';
import { useOrders } from '@/context/order-context';
import { useToast } from '@/hooks/use-toast';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { headerNames, homePageFieldOrder, homePageVisibleFields } = useProducts();
  const { addOrder } = useOrders();
  const { toast } = useToast();
  const isUnavailable = product.status === 'Unavailable';

  const productDetails = homePageFieldOrder
    .filter(key => homePageVisibleFields[key] && product[key] && !['id', 'name', 'brand', 'description', 'status', 'startDate', 'lastUpdatedDate'].includes(key) )
    .map(key => ({
      label: headerNames[key] || key.charAt(0).toUpperCase() + key.slice(1),
      value: product[key],
    }));
    
  const handleBuyNow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isUnavailable) return;
    
    // This is a simplified "buy now" flow for demonstration.
    // In a real app, you would likely go to a checkout page.
    const mockCustomer = {
      name: 'Test Customer',
      email: 'customer@example.com',
      phone: '555-555-5555',
      address: '123 Main St',
      city: 'Anytown',
      zip: '12345',
    };
    const orderItem = {
      id: product.id,
      name: product.name,
      quantity: 1,
      price: product.price || 99.99, // Fallback price
    };
    
    addOrder(mockCustomer, [orderItem], orderItem.price);

    toast({
        title: "Order Placed!",
        description: `${product.name} has been added to your orders.`
    });
  }

  return (
    <Card className="flex flex-col h-full overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
      <Link href={`/products/${product.id}`} className="flex flex-col h-full bg-card rounded-lg">
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
        <CardFooter className="p-4 pt-0 mt-auto flex gap-2">
           <Button asChild className="w-full" disabled={isUnavailable} variant={'secondary'}>
             <Link href={`/products/${product.id}`}>View Product</Link>
           </Button>
           <Button className="w-full" disabled={isUnavailable} onClick={handleBuyNow}>
            Buy Now
          </Button>
        </CardFooter>
      </Link>
    </Card>
  );
}
