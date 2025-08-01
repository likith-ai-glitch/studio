
'use client';

import { useCart } from '@/context/cart-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Trash2, ShoppingBag } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function CartPage() {
  const { cartItems, updateQuantity, removeFromCart, totalPrice, cartCount } = useCart();

  return (
    <div className="space-y-8">
      <header className="text-center">
        <h1 className="text-4xl font-bold font-headline">Your Shopping Cart</h1>
        <p className="text-lg text-muted-foreground mt-2">{cartCount} item(s) in your cart</p>
      </header>
      
      {cartItems.length > 0 ? (
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-4">
            {cartItems.map((item) => (
              <Card key={item.id} className="flex items-center p-4 shadow-sm">
                <Image src={item.image} alt={item.name} width={100} height={100} className="rounded-md object-cover" data-ai-hint={`${item.category.toLowerCase()} ${item.name.split(' ')[0].toLowerCase()}`} />
                <div className="ml-4 flex-grow">
                  <h2 className="font-semibold">{item.name}</h2>
                  <p className="text-sm text-muted-foreground">${item.price.toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateQuantity(item.id, parseInt(e.target.value, 10))}
                    className="w-16 text-center"
                  />
                  <Button variant="ghost" size="icon" onClick={() => removeFromCart(item.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          <div className="md:col-span-1">
            <Card className="sticky top-24 shadow-lg">
              <CardHeader>
                <CardTitle className="font-headline">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>${totalPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span>Free</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>${totalPrice.toFixed(2)}</span>
                </div>
              </CardContent>
              <CardFooter>
                <Button asChild size="lg" className="w-full bg-accent text-accent-foreground hover:bg-accent/80">
                  <Link href="/checkout">Proceed to Checkout</Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      ) : (
        <div className="text-center py-16 bg-card rounded-lg shadow-sm">
          <ShoppingBag className="mx-auto h-16 w-16 text-muted-foreground" />
          <h2 className="mt-6 text-2xl font-semibold">Your cart is empty</h2>
          <p className="mt-2 text-muted-foreground">Looks like you haven't added anything to your cart yet.</p>
          <Button asChild className="mt-6">
            <Link href="/">Continue Shopping</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
