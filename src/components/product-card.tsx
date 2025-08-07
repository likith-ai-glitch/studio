
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
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { AddressForm, type AddressFormValues } from './address-form';


interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { headerNames, homePageFieldOrder, homePageVisibleFields } = useProducts();
  const { addOrder } = useOrders();
  const { toast } = useToast();
  const [isAddressDialogOpen, setAddressDialogOpen] = useState(false);
  const isUnavailable = product.status === 'Unavailable';

  const productDetails = homePageFieldOrder
    .filter(key => homePageVisibleFields[key] && product[key] && !['partId', 'productId', 'name', 'brand', 'status', 'startDate', 'lastUpdatedDate'].includes(key) )
    .map(key => ({
      label: headerNames[key] || key.charAt(0).toUpperCase() + key.slice(1),
      value: product[key],
    }));
    
  const handlePlaceOrder = (addressData: AddressFormValues) => {
    if (isUnavailable) return;
    
    const customer = {
      name: addressData.name,
      email: addressData.email,
      phone: addressData.phone,
      address: addressData.address,
      city: addressData.city,
      zip: addressData.zip,
    };

    const orderItem = {
      id: product.partId,
      name: product.name,
      quantity: 1,
      price: product.price || 99.99, // Fallback price
    };
    
    const total = Number(orderItem.price) * orderItem.quantity;
    addOrder(customer, [orderItem], total);

    toast({
        title: "Order Placed!",
        description: `${product.name} has been added to your orders.`
    });
    setAddressDialogOpen(false);
  }

  return (
    <Card className="flex flex-col h-full overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
        <Link href={`/products/${product.partId}`} className="flex flex-col flex-grow bg-card rounded-lg">
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
        </Link>
        <CardFooter className="p-4 pt-0 mt-auto flex gap-2">
            <Dialog open={isAddressDialogOpen} onOpenChange={setAddressDialogOpen}>
                <DialogTrigger asChild>
                    <Button className="w-full" disabled={isUnavailable}>
                        Buy Now
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Shipping Address</DialogTitle>
                        <DialogDescription>
                            Please provide your shipping details to complete the order for {product.name}.
                        </DialogDescription>
                    </DialogHeader>
                    <AddressForm onSubmit={handlePlaceOrder} />
                </DialogContent>
            </Dialog>
        </CardFooter>
    </Card>
  );
}
