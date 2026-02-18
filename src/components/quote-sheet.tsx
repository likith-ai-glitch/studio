
'use client';

import { useState, useMemo } from 'react';
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
import { Trash2, FileText, ShoppingCart, Loader2, FileDown, Save, CheckCircle2 } from 'lucide-react';
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
import { useProducts } from '@/context/product-context';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { generateDocumentAction } from '@/app/actions';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

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
    applyPriceList,
    saveQuoteToFirestore,
    masterQuotes
  } = useQuote();
  const { products, headerNames } = useProducts();
  const { addOrder } = useOrders();
  const { toast } = useToast();
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isConvertingPdf, setIsConvertingPdf] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedPriceList, setSelectedPriceList] = useState('none');

  const isLocked = quote.isMaster && quote.lifecycleStatus === 'Locked';

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
  
  const handleSaveQuote = async () => {
    setIsSaving(true);
    try {
        await saveQuoteToFirestore();
    } finally {
        setIsSaving(false);
    }
  };

  const handlePriceListChange = (priceListKey: string) => {
    setSelectedPriceList(priceListKey);
    applyPriceList(priceListKey, products);
  }

  const priceListOptions = useMemo(() => {
    return [
      'priceList1',
      'priceList2',
      'priceList3',
      'priceList4',
      'priceList5',
    ].map(key => ({
      key,
      name: headerNames[key] || key,
    }));
  }, [headerNames]);
  
  const totalDiscountAmount = useMemo(() => {
      return subTotal * ((quote.discount || 0) / 100);
  }, [subTotal, quote.discount]);

  const taxAmount = useMemo(() => {
    return (subTotal - totalDiscountAmount) * ((quote.tax || 0) / 100);
  }, [subTotal, totalDiscountAmount, quote.tax]);

  return (
    <Sheet open={isQuoteSheetOpen} onOpenChange={setIsQuoteSheetOpen}>
      <SheetContent className="flex w-full flex-col sm:max-w-3xl">
        <SheetHeader>
          <div className="flex justify-between items-center pr-8">
            <SheetTitle>Quote Builder</SheetTitle>
            <div className="flex items-center gap-2">
                {quote.items.length > 0 && (
                  <Button 
                    size="sm" 
                    variant="default"
                    onClick={handleSaveQuote} 
                    disabled={isSaving || isLocked}
                    className="h-8 px-3 bg-green-600 hover:bg-green-700 text-white"
                  >
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                    Save Quote
                  </Button>
                )}
                {quote.isMaster && (
                    <Badge variant={quote.lifecycleStatus === 'Locked' ? 'destructive' : 'secondary'}>
                        Master: {quote.lifecycleStatus}
                    </Badge>
                )}
            </div>
          </div>
        </SheetHeader>
        <Separator className="my-4" />
        
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
                      disabled={isLocked}
                      value={quote.quoteNumber}
                      onChange={(e) => updateQuoteField('quoteNumber', e.target.value)}
                    />
                 </div>

                 {/* Master Quote Relationship Controls */}
                 <div className="flex flex-col justify-center gap-2 pt-6">
                    <div className="flex items-center space-x-2">
                        <Checkbox 
                            id="isMaster" 
                            disabled={isLocked || (!!quote.masterQuoteId)}
                            checked={quote.isMaster} 
                            onCheckedChange={(checked) => updateQuoteField('isMaster', !!checked)} 
                        />
                        <Label htmlFor="isMaster">Mark as Master Quote</Label>
                    </div>
                 </div>

                 {quote.isMaster ? (
                    <div className="space-y-2">
                        <Label>Lifecycle Status</Label>
                        <Select disabled={isLocked} value={quote.lifecycleStatus || 'Draft'} onValueChange={(val) => updateQuoteField('lifecycleStatus', val)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Draft">Draft</SelectItem>
                                <SelectItem value="InProgress">InProgress</SelectItem>
                                <SelectItem value="Locked">Locked</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                 ) : (
                    <div className="space-y-2">
                        <Label>Attach to Master Quote</Label>
                        <Select disabled={isLocked} value={quote.masterQuoteId || 'none'} onValueChange={(val) => updateQuoteField('masterQuoteId', val === 'none' ? null : val)}>
                            <SelectTrigger><SelectValue placeholder="Select a Master Quote" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                {masterQuotes.map(mq => (
                                    <SelectItem key={mq.id} value={mq.id!}>{mq.Name || mq.quoteNumber}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                 )}

                 <div className="space-y-2">
                    <Label>Type</Label>
                    <Select disabled={isLocked} value={quote.type} onValueChange={(value) => updateQuoteField('type', value)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Master">Master</SelectItem>
                            <SelectItem value="Transaction">Transaction</SelectItem>
                        </SelectContent>
                    </Select>
                 </div>
                 
                 <div className="space-y-2">
                    <Label htmlFor="discount">Discount %</Label>
                    <Input 
                      id="discount"
                      type="number"
                      disabled={isLocked}
                      value={quote.discount}
                      onChange={(e) => updateQuoteField('discount', e.target.value)}
                    />
                 </div>
                  <div className="space-y-2">
                    <Label htmlFor="tax">GST %</Label>
                    <Input 
                      id="tax"
                      type="number"
                      disabled={isLocked}
                      value={quote.tax}
                      onChange={(e) => updateQuoteField('tax', e.target.value)}
                    />
                 </div>
                 <div className="space-y-2 md:col-span-3">
                    <Label>Apply Price Book</Label>
                    <Select disabled={isLocked} value={selectedPriceList} onValueChange={handlePriceListChange}>
                        <SelectTrigger><SelectValue placeholder="Select a price list" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">Default Prices</SelectItem>
                             {priceListOptions.map(option => (
                                <SelectItem key={option.key} value={option.key}>
                                    {option.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                 </div>
              </div>
              
              <Separator />

              <ScrollArea className="h-full -mx-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[250px] px-6">Product</TableHead>
                      <TableHead className="text-center">Qty</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      {!isLocked && <TableHead className="w-[50px]"></TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quote.items.map(item => (
                        <TableRow key={item.id}>
                          <TableCell className="px-6">
                            <div className="font-medium text-base mb-1">{item.name}</div>
                            <div className="flex gap-2">
                                <Badge variant="outline" className="text-[10px]">{item.productId}</Badge>
                                {item.isMasterProduct && <Badge variant="secondary" className="text-[10px] bg-blue-100 text-blue-700">Master Product</Badge>}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Input
                              type="number"
                              min="1"
                              disabled={isLocked}
                              value={item.quantity}
                              onChange={(e) => updateItemQuantity(item.id, parseInt(e.target.value) || 1)}
                              className="w-16 h-8 mx-auto"
                            />
                          </TableCell>
                          <TableCell className="text-right">₹{Number(item.price).toFixed(2)}</TableCell>
                          <TableCell className="text-right">₹{(Number(item.price) * item.quantity).toFixed(2)}</TableCell>
                          {!isLocked && (
                            <TableCell>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8" 
                                    disabled={quote.isMaster && (quote.lifecycleStatus === 'InProgress')}
                                    onClick={() => removeItemFromQuote(item.id)}
                                >
                                <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </TableCell>
                          )}
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
                 <Separator />
                <div className="flex justify-between font-bold text-xl">
                  <p>Grand Total</p>
                  <p>₹{grandTotal.toFixed(2)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <Button variant="outline" onClick={handleSaveQuote} disabled={isSaving || isLocked}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Quote
                </Button>
                <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
                    <DialogTrigger asChild>
                      <Button className="w-full">
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        Create Order
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Shipping Information</DialogTitle>
                      </DialogHeader>
                      <AddressForm onSubmit={handlePlaceOrder} />
                    </DialogContent>
                </Dialog>
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
