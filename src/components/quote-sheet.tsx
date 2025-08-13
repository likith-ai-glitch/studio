
'use client';

import { useState } from 'react';
import { useQuote } from '@/context/quote-context';
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
import { Trash2, FileText, ShoppingCart } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export function QuoteSheet() {
  const { quote, isQuoteSheetOpen, setIsQuoteSheetOpen, updateItemQuantity, removeItemFromQuote, quoteTotal } = useQuote();

  return (
    <Sheet open={isQuoteSheetOpen} onOpenChange={setIsQuoteSheetOpen}>
      <SheetContent className="flex w-full flex-col sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Quote Builder</SheetTitle>
        </SheetHeader>
        <Separator />
        {quote.length > 0 ? (
          <>
            <ScrollArea className="flex-1 -mx-6">
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
            <Separator />
            <SheetFooter className="mt-auto flex-col space-y-4">
              <div className="flex justify-between text-lg font-semibold">
                <p>Total</p>
                <p>₹{quoteTotal.toFixed(2)}</p>
              </div>
              <div className="flex flex-col gap-2">
                 <Button disabled>
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Proceed to Checkout
                </Button>
                <SheetClose asChild>
                  <Button variant="outline">Continue Browsing</Button>
                </SheetClose>
              </div>
            </SheetFooter>
          </>
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
