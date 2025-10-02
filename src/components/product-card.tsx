
'use client';

import Link from 'next/link';
import type { Product } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useProducts } from '@/context/product-context';
import { useToast } from '@/hooks/use-toast';
import { useQuote } from '@/context/quote-context';
import { useAuth } from '@/context/auth-context';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogFooter,
} from '@/components/ui/dialog';
import { AddressForm, AddressFormValues } from './address-form';
import { useState } from 'react';
import { useOrders } from '@/context/order-context';


interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { user } = useAuth();
  const { headerNames, homePageFieldOrder, homePageVisibleFields } = useProducts();
  const { toast } = useToast();
  const { addItemToQuote, setIsQuoteSheetOpen, buyNow: buyNowFromContext } = useQuote();
  const { addOrder } = useOrders();
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isBuyNowDialogOpen, setBuyNowDialogOpen] = useState(false);

  const isUnavailable = product.status === 'Unavailable';

  const productDetails = homePageFieldOrder
    .filter(key => homePageVisibleFields[key] && product[key] && !['productId', 'name', 'brand', 'status', 'startDate', 'lastUpdatedDate'].includes(key) )
    .map(key => ({
      label: headerNames[key] || key.charAt(0).toUpperCase() + key.slice(1),
      value: product[key],
    }));
    
  const handleAddToQuote = () => {
    if (isUnavailable) return;
    
    addItemToQuote({
        id: product.productId,
        productId: product.productId,
        name: product.name,
        price: Number(product.price) || 99.99, // Fallback price
        quantity: 1,
        brand: product.brand,
        category: product.category,
        colour: product.colour,
        partName: product.partName,
    });

    toast({
        title: "Added to quote",
        description: `${product.name} has been added to your quote.`
    });
    setIsQuoteSheetOpen(true);
  }
  
  const handlePlaceOrder = (customerData: AddressFormValues) => {
    addOrder(customerData, [{
        id: product.productId,
        name: product.name,
        price: Number(product.price) || 99.99,
        quantity: 1,
        brand: product.brand,
        category: product.category,
    }], Number(product.price) || 99.99);

    toast({
        title: "Order Placed!",
        description: "Thank you for your purchase. Your order is being processed."
    });
    setIsCheckoutOpen(false);
    setBuyNowDialogOpen(false);
  }

  const handleProceedToCheckout = () => {
    setIsCheckoutOpen(true);
  }

  return (
    <Card className="flex flex-col h-full overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
        <Link href={`/products/${product.productId}`} className="flex flex-col flex-grow bg-card rounded-lg">
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
                 {homePageVisibleFields.brand && <p className="text-sm text-muted-foreground">{product.brand}</p>}
                 {homePageVisibleFields.name && <CardTitle className="text-lg font-headline mt-1 line-clamp-2">{product.name}</CardTitle>}
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
           {user && (
            <Button variant="secondary" className="w-full" disabled={isUnavailable} onClick={handleAddToQuote}>
                Add to Quote
            </Button>
           )}
            <Dialog open={isBuyNowDialogOpen} onOpenChange={(open) => {
              setBuyNowDialogOpen(open);
              if (!open) setIsCheckoutOpen(false); // Reset checkout state on close
            }}>
                <DialogTrigger asChild>
                    <Button className="w-full" disabled={isUnavailable}>
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        Buy Now
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    {!isCheckoutOpen ? (
                        <>
                          <DialogHeader>
                              <DialogTitle>Item Added</DialogTitle>
                              <DialogDescription>
                                  {product.name} has been added to your cart.
                              </DialogDescription>
                          </DialogHeader>
                          <div className="py-4">
                            <p>Would you like to continue shopping or proceed to checkout?</p>
                          </div>
                          <DialogFooter className="sm:justify-between">
                              <DialogClose asChild>
                                <Button variant="outline">Continue Shopping</Button>
                              </DialogClose>
                              <Button onClick={handleProceedToCheckout}>Proceed to Checkout</Button>
                          </DialogFooter>
                        </>
                    ) : (
                        <>
                          <DialogHeader>
                            <DialogTitle>Shipping Information</DialogTitle>
                            <DialogDescription>
                              Provide your address to place the order for {product.name}.
                            </DialogDescription>
                          </DialogHeader>
                          <AddressForm onSubmit={handlePlaceOrder} />
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </CardFooter>
    </Card>
  );
}
