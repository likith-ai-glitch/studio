
'use client';

import { useState } from 'react';
import { useCart } from '@/context/cart-context';
import { useOrders } from '@/context/order-context';
import { useToast } from '@/hooks/use-toast';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { AddressForm, type AddressFormValues } from './address-form';
import { Trash2, Package, ShoppingCart } from 'lucide-react';

export function Cart() {
  const { cart, isCartOpen, setIsCartOpen, updateItemQuantity, removeItemFromCart, cartTotal, clearCart } = useCart();
  const { addOrder } = useOrders();
  const { toast } = useToast();
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const handlePlaceOrder = (addressData: AddressFormValues) => {
    const customer = {
      name: addressData.name,
      email: addressData.email,
      phone: addressData.phone,
      address: addressData.address,
      city: addressData.city,
      zip: addressData.zip,
    };

    const orderItems = cart.map(item => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
    }));
    
    addOrder(customer, orderItems, cartTotal);

    toast({
        title: "Order Placed!",
        description: `Your order has been successfully placed.`
    });
    
    clearCart();
    setIsCartOpen(false);
    setIsCheckingOut(false);
  }

  return (
    <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
      <SheetContent className="flex w-full flex-col pr-0 sm:max-w-lg">
        <SheetHeader className="px-6">
          <SheetTitle>Shopping Cart</SheetTitle>
        </SheetHeader>
        <Separator />
        {cart.length > 0 ? (
            isCheckingOut ? (
                <div className="flex-1 overflow-y-auto">
                    <div className="p-6">
                        <h3 className="text-lg font-medium mb-4">Shipping Details</h3>
                         <AddressForm onSubmit={handlePlaceOrder} />
                         <Button variant="link" onClick={() => setIsCheckingOut(false)} className="mt-4 w-full">Back to Cart</Button>
                    </div>
                </div>
            ) : (
                <>
                <ScrollArea className="flex-1">
                    <div className="flex flex-col gap-6 p-6">
                    {cart.map(item => (
                        <div key={item.id} className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="flex h-16 w-16 items-center justify-center rounded-md border bg-muted">
                                    <Package className="h-8 w-8 text-muted-foreground" />
                                </div>
                                <div>
                                    <p className="font-medium line-clamp-1">{item.name}</p>
                                    <p className="text-sm text-muted-foreground">₹{item.price.toFixed(2)}</p>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <div className="flex items-center gap-2">
                                     <Input
                                        type="number"
                                        min="1"
                                        value={item.quantity}
                                        onChange={(e) => updateItemQuantity(item.id, parseInt(e.target.value) || 1)}
                                        className="h-8 w-16 text-center"
                                    />
                                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => removeItemFromCart(item.id)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                                <p className="font-semibold">₹{(item.price * item.quantity).toFixed(2)}</p>
                            </div>
                        </div>
                    ))}
                    </div>
                </ScrollArea>
                <Separator />
                <SheetFooter className="px-6 py-4 bg-card mt-auto space-y-4">
                    <div className="flex justify-between text-lg font-semibold">
                        <p>Total</p>
                        <p>₹{cartTotal.toFixed(2)}</p>
                    </div>
                    <div className="flex flex-col gap-2">
                         <Button onClick={() => setIsCheckingOut(true)}>Proceed to Checkout</Button>
                         <SheetClose asChild>
                            <Button variant="outline">Continue Shopping</Button>
                         </SheetClose>
                    </div>
                </SheetFooter>
                </>
            )
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <ShoppingCart className="h-16 w-16 text-muted-foreground" />
            <p className="text-xl font-semibold">Your cart is empty</p>
            <SheetClose asChild>
                <Button>Start Shopping</Button>
            </SheetClose>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
