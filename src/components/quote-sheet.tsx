
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
import { ProductCompare } from './product-compare';
import { Trash2, Package, FileText, NotepadText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"

export function QuoteSheet() {
  const { quote, isQuoteSheetOpen, setIsQuoteSheetOpen, updateItemQuantity, removeItemFromQuote, quoteTotal, clearQuote } = useQuote();
  const [isViewingQuote, setIsViewingQuote] = useState(false);

  const productIdsForCompare = quote.map(item => item.id);

  return (
    <Sheet open={isQuoteSheetOpen} onOpenChange={(isOpen) => {
        setIsQuoteSheetOpen(isOpen);
        if (!isOpen) {
            setIsViewingQuote(false);
        }
    }}>
      <SheetContent className="flex w-full flex-col pr-0 sm:max-w-lg">
        <SheetHeader className="px-6">
          <SheetTitle>Quote Builder</SheetTitle>
        </SheetHeader>
        <Separator />
        {quote.length > 0 ? (
            <>
            <ScrollArea className="flex-1">
                <div className="flex flex-col gap-6 p-6">
                {quote.map(item => (
                    <div key={item.id} className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="flex h-16 w-16 items-center justify-center rounded-md border bg-muted">
                                <Package className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <div>
                                <p className="font-medium line-clamp-1">{item.name}</p>
                                <p className="text-sm text-muted-foreground">₹{Number(item.price).toFixed(2)}</p>
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
                                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => removeItemFromQuote(item.id)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </div>
                            <p className="font-semibold">₹{(Number(item.price) * item.quantity).toFixed(2)}</p>
                        </div>
                    </div>
                ))}
                </div>
            </ScrollArea>
            <Separator />
            <SheetFooter className="px-6 py-4 bg-card mt-auto space-y-4">
                <div className="flex justify-between text-lg font-semibold">
                    <p>Total</p>
                    <p>₹{quoteTotal.toFixed(2)}</p>
                </div>
                <div className="flex flex-col gap-2">
                     <Dialog>
                        <DialogTrigger asChild>
                            <Button>
                                <NotepadText className="mr-2"/>
                                View Quote
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl h-[90vh]">
                            <DialogHeader>
                                <DialogTitle>Quote Comparison</DialogTitle>
                                <DialogDescription>
                                    Here is a side-by-side comparison of the products in your quote. You can adjust quantities here as well.
                                </DialogDescription>
                            </DialogHeader>
                            <ProductCompare productIds={productIdsForCompare} />
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button>Close</Button>
                                </DialogClose>
                            </DialogFooter>
                        </DialogContent>
                     </Dialog>
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
            <SheetClose asChild>
                <Button>Start Building a Quote</Button>
            </SheetClose>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
