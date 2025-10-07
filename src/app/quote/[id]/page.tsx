
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, notFound } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Quote } from '@/context/quote-context';
import type { Product as ProductType } from '@/lib/types';
import { ProductCard } from '@/components/product-card';
import { Loader2, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// We need to transform QuoteItem to a full Product for the ProductCard
const quoteItemToProduct = (item: Quote['items'][0]): ProductType => {
  return {
    productId: item.productId,
    name: item.name,
    brand: item.brand,
    category: item.category,
    status: 'Available', // Assume available for viewing
    price: item.price,
    colour: item.colour,
    partName: item.partName,
    quantity: item.quantity,
  };
};

export default function PublicQuotePage() {
  const params = useParams();
  const id = params.id as string;
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchQuote = useCallback(async (quoteId: string) => {
    if (!quoteId) {
      setLoading(false);
      setQuote(null);
      return;
    }
    setLoading(true);
    try {
        const quoteDocRef = doc(db, 'quotes', quoteId);
        const quoteSnap = await getDoc(quoteDocRef);
    
        if (quoteSnap.exists()) {
          setQuote(quoteSnap.data() as Quote);
        } else {
          console.error(`Quote with ID ${quoteId} not found.`);
          setQuote(null); // Explicitly set to null if not found
        }
    } catch (error) {
        console.error("Error fetching quote:", error);
        setQuote(null);
    } finally {
        setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (id) {
      fetchQuote(id);
    } else {
      setLoading(false);
    }
  }, [id, fetchQuote]);


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-20rem)]">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (!quote) {
    return notFound();
  }

  const products = quote.items.map(quoteItemToProduct);

  const subTotal = quote.items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const indicativeTotal = Object.values(quote.indicativePricing || {}).reduce((acc, val) => acc + (Number(val) || 0), 0);
  const quoteSubTotal = subTotal + indicativeTotal;
  const discountAmount = quoteSubTotal * ((quote.discount || 0) / 100);
  const totalAfterDiscount = quoteSubTotal - discountAmount;
  const taxAmount = totalAfterDiscount * ((quote.tax || 0) / 100);
  const grandTotal = totalAfterDiscount + taxAmount;

  return (
    <div className="space-y-8">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-3xl font-headline">
            <FileText className="h-8 w-8 text-primary" />
            <span>Quote Details</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div><strong className="block text-muted-foreground">Quote ID:</strong> {quote.quoteId}</div>
                <div><strong className="block text-muted-foreground">Status:</strong> {quote.status}</div>
                <div><strong className="block text-muted-foreground">Type:</strong> {quote.type}</div>
                <div><strong className="block text-muted-foreground">Grand Total:</strong> <span className="font-bold">₹{grandTotal.toFixed(2)}</span></div>
            </div>
        </CardContent>
      </Card>
      
      <h2 className="text-3xl font-bold font-headline text-center">Products in this Quote</h2>

      {products.length > 0 ? (
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map(product => (
                <ProductCard key={product.productId} product={product} />
            ))}
        </div>
      ) : (
         <div className="flex flex-col items-center justify-center h-64 bg-card rounded-lg">
            <p className="text-xl text-muted-foreground">No products found in this quote.</p>
        </div>
      )}
    </div>
  );
}
