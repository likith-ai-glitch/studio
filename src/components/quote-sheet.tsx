
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
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Trash2, FileText, ShoppingCart, Send, Loader2 } from 'lucide-react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { sendQuote } from '@/ai/flows/send-quote-flow';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function QuoteSheet() {
  const { 
    quote, 
    isQuoteSheetOpen, 
    setIsQuoteSheetOpen, 
    updateItemQuantity, 
    removeItemFromQuote, 
    subTotal,
    grandTotal, 
    clearQuote,
    updateQuoteField,
    updateIndicativePricingField,
  } = useQuote();
  const { addOrder } = useOrders();
  const { toast } = useToast();
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const notificationsCollectionRef = collection(db, 'notifications');


  const handlePlaceOrder = (customerData: AddressFormValues) => {
    if (!quote.items) return;
    addOrder(customerData, quote.items, grandTotal);
    toast({
        title: "Order Placed!",
        description: "Thank you for your purchase. Your order is being processed."
    });
    clearQuote();
    setIsCheckoutOpen(false);
    setIsQuoteSheetOpen(false);
  }
  
  const handleSendQuote = async () => {
    setIsSending(true);
    const { id: toastId } = toast({
      title: 'Sending Quote...',
      description: 'Generating quote details and preparing to send.',
    });
    try {
      const emailContent = await sendQuote(quote);

      await addDoc(notificationsCollectionRef, {
        customer: {
          email: 'customer@example.com', // Placeholder email
        },
        emailSubject: emailContent.emailSubject,
        emailBody: emailContent.emailBody,
        sentAt: serverTimestamp(),
        quoteId: `quote_${Date.now()}`,
      });

      updateQuoteField('approvalStatus', 'SentForApproval');
      
      toast({
        id: toastId,
        title: 'Quote Sent!',
        description: 'The quote has been generated and logged for sending.',
      });

    } catch (error) {
      console.error("Error sending quote:", error);
      toast({
        id: toastId,
        title: 'Error',
        description: 'Could not send the quote.',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  }

  return (
    <Sheet open={isQuoteSheetOpen} onOpenChange={setIsQuoteSheetOpen}>
      <SheetContent className="flex w-full flex-col sm:max-w-3xl">
        <SheetHeader>
          <SheetTitle>Quote Builder</SheetTitle>
        </SheetHeader>
        <Separator />
        {quote.items && quote.items.length > 0 ? (
           <>
            <div className="flex-1 overflow-hidden flex flex-col gap-4">
              {/* Quote Management Section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-1">
                 <div className="space-y-2">
                    <Label htmlFor="quoteNumber">Quote Number</Label>
                    <Input
                      id="quoteNumber"
                      type="text"
                      value={quote.quoteNumber}
                      onChange={(e) => updateQuoteField('quoteNumber', e.target.value)}
                      placeholder="e.g. Q-12345"
                    />
                 </div>
                 <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={quote.status} onValueChange={(value) => updateQuoteField('status', value)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Draft">Draft</SelectItem>
                            <SelectItem value="InProgress">In Progress</SelectItem>
                            <SelectItem value="Final">Final</SelectItem>
                        </SelectContent>
                    </Select>
                 </div>
                 <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={quote.type} onValueChange={(value) => updateQuoteField('type', value)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Master">Master</SelectItem>
                            <SelectItem value="Transaction">Transaction</SelectItem>
                        </SelectContent>
                    </Select>
                 </div>
                 <div className="space-y-2">
                    <Label>Approval Status</Label>
                    <Select value={quote.approvalStatus} onValueChange={(value) => updateQuoteField('approvalStatus', value)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Draft">Draft</SelectItem>
                            <SelectItem value="SentForApproval">Sent For Approval</SelectItem>
                            <SelectItem value="Approved">Approved</SelectItem>
                        </SelectContent>
                    </Select>
                 </div>
                  <div className="space-y-2">
                    <Label htmlFor="shipping">Shipping & installation</Label>
                    <Input 
                      id="shipping"
                      type="number"
                      value={quote.indicativePricing.shippingAndInstallation}
                      onChange={(e) => updateIndicativePricingField('shippingAndInstallation', parseFloat(e.target.value) || 0)}
                      placeholder="e.g. 5000.00"
                    />
                 </div>
                 <div className="space-y-2">
                    <Label htmlFor="discount">Discount %</Label>
                    <Input 
                      id="discount"
                      type="number"
                      value={quote.discount}
                      onChange={(e) => updateQuoteField('discount', parseFloat(e.target.value) || 0)}
                      placeholder="e.g. 10"
                    />
                 </div>
                  <div className="space-y-2">
                    <Label htmlFor="tax">GST %</Label>
                    <Input 
                      id="tax"
                      type="number"
                      value={quote.tax}
                      onChange={(e) => updateQuoteField('tax', parseFloat(e.target.value) || 0)}
                      placeholder="e.g. 18"
                    />
                 </div>
              </div>
              <Separator />
              <ScrollArea className="h-full -mx-6">
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
                    {quote.items.map(item => (
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
              <div className="space-y-2 text-lg">
                <div className="flex justify-between font-semibold">
                  <p>Subtotal</p>
                  <p>₹{subTotal.toFixed(2)}</p>
                </div>
                {quote.discount > 0 && (
                   <div className="flex justify-between text-sm text-muted-foreground">
                    <p>Discount ({quote.discount || 0}%)</p>
                    <p>- ₹{(subTotal * (quote.discount || 0) / 100).toFixed(2)}</p>
                  </div>
                )}
                {quote.tax > 0 && (
                   <div className="flex justify-between text-sm text-muted-foreground">
                    <p>GST ({quote.tax || 0}%)</p>
                    <p>+ ₹{(subTotal * (1 - (quote.discount || 0) / 100) * ((quote.tax || 0) / 100)).toFixed(2)}</p>
                  </div>
                )}
                 <Separator />
                <div className="flex justify-between font-bold text-xl">
                  <p>Grand Total</p>
                  <p>₹{grandTotal.toFixed(2)}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <Button onClick={handleSendQuote} disabled={isSending}>
                    {isSending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Send className="mr-2 h-4 w-4" />
                    )}
                    Send to Customer
                </Button>
                <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        Create Order
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Shipping Information</DialogTitle>
                        <DialogDescription>
                          Provide customer details to create an order from this quote.
                        </DialogDescription>
                      </DialogHeader>
                      <AddressForm onSubmit={handlePlaceOrder} />
                    </DialogContent>
                </Dialog>
              </div>
               <SheetClose asChild>
                  <Button variant="outline">Continue Browsing</Button>
                </SheetClose>
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
