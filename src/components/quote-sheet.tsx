
'use client';

import { useState } from 'react';
import { useQuote } from '@/context/quote-context';
import { useOrders } from '@/context/order-context';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Trash2, FileText, ShoppingCart } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AddressForm, type AddressFormValues } from './address-form';
import { useToast } from '@/hooks/use-toast';


export function QuoteSheet() {
  const { quote, isQuoteSheetOpen, setIsQuoteSheetOpen, updateItemQuantity, removeItemFromQuote, quoteTotal, clearQuote } = useQuote();
  const { addOrder } = useOrders();
  const { toast } = useToast();
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  const handlePlaceOrder = (customerData: AddressFormValues) => {
    addOrder(customerData, quote, quoteTotal);
    toast({
        title: "Order Placed!",
        description: "Thank you for your purchase. Your order is being processed."
    });
    clearQuote();
    setIsCheckoutOpen(false);
    setIsQuoteSheetOpen(false);
  }

  return (
    <Sheet open={isQuoteSheetOpen} onOpenChange={setIsQuoteSheetOpen}>
      <SheetContent className="flex w-full flex-col sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Quote Builder</SheetTitle>
        </SheetHeader>
        <Separator />
        {quote.length > 0 ? (
           <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
            <div className="flex flex-1 flex-col justify-between overflow-hidden">
              <ScrollArea className="-mx-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-center">Qty</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quote.map(item => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="font-medium">{item.name}</div>
                          <div className="text-xs text-muted-foreground">
                            <p>Brand: {item.brand}</p>
                            <p>Category: {item.category}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItemQuantity(item.id, parseInt(e.target.value) || 1)}
                            className="w-16 h-8 mx-auto"
                          />
                        </TableCell>
                        <TableCell className="text-right">₹{Number(item.price).toFixed(2)}</TableCell>
                        <TableCell className="text-right">₹{(Number(item.price) * item.quantity).toFixed(2)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeItemFromQuote(item.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
            
            <SheetFooter className="mt-auto flex-col space-y-4 pt-4 border-t">
              <div className="flex justify-between text-lg font-semibold">
                <p>Total</p>
                <p>₹{quoteTotal.toFixed(2)}</p>
              </div>
              <div className="flex flex-col gap-2">
                <DialogTrigger asChild>
                  <Button>
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Proceed to Checkout
                  </Button>
                </DialogTrigger>
                <SheetClose asChild>
                  <Button variant="outline">Continue Browsing</Button>
                </SheetClose>
              </div>
            </SheetFooter>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>Shipping Information</DialogTitle>
                <DialogDescription>
                  Please provide your details to place the order.
                </DialogDescription>
              </DialogHeader>
              <AddressForm onSubmit={handlePlaceOrder} />
            </DialogContent>
          </Dialog>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <FileText className="h-16 w-16 text-muted-foreground" />
            <p className="text-xl font-semibold">Your quote is empty</p>
            <p className="text-sm text-muted-foreground">Add products to build your quote.</p>
            <SheetClose asChild>
              <Button>Start Browsing</Button>
            </SheetClose>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
