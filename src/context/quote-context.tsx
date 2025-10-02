
'use client';

import { createContext, useContext, useState, ReactNode, useMemo } from 'react';

export interface QuoteItem {
  id: string; // Internal ID for the quote item, typically same as productId
  productId: string;
  name: string;
  price: number;
  quantity: number;
  brand: string;
  category: string;
  colour?: string;
  partName?: string;
}


export type QuoteStatus = 'Draft' | 'InProgress' | 'Final';
export type QuoteType = 'Master' | 'Transaction';
export type QuoteApprovalStatus = 'Draft' | 'SentForApproval' | 'Approved';

export interface IndicativePricing {
    totalProductPrice: number;
    additionalCost: number;
}

export interface Quote {
  quoteNumber: string;
  items: QuoteItem[];
  status: QuoteStatus;
  type: QuoteType;
  approvalStatus: QuoteApprovalStatus;
  indicativePricing: IndicativePricing;
  discount: number;
  tax: number; // Represents GST %
}

interface QuoteContextType {
  quote: Quote;
  isQuoteSheetOpen: boolean;
  setIsQuoteSheetOpen: (isOpen: boolean) => void;
  addItemToQuote: (item: QuoteItem) => void;
  buyNow: (item: QuoteItem) => void;
  updateItemQuantity: (itemId: string, quantity: number) => void;
  removeItemFromQuote: (itemId: string) => void;
  clearQuote: () => void;
  subTotal: number;
  grandTotal: number;
  updateQuoteField: (field: keyof Omit<Quote, 'items' | 'indicativePricing'>, value: any) => void;
  updateIndicativePricingField: (field: keyof IndicativePricing, value: number) => void;
}

const QuoteContext = createContext<QuoteContextType | undefined>(undefined);

const initialQuoteState: Quote = {
    quoteNumber: 'TQ-',
    items: [],
    status: 'Draft',
    type: 'Transaction',
    approvalStatus: 'Draft',
    indicativePricing: {
        totalProductPrice: 0,
        additionalCost: 0,
    },
    discount: 0,
    tax: 0,
}

export function QuoteProvider({ children }: { children: ReactNode }) {
  const [quote, setQuote] = useState<Quote>(initialQuoteState);
  const [isQuoteSheetOpen, setIsQuoteSheetOpen] = useState(false);

  const addItemToQuote = (itemToAdd: QuoteItem) => {
    setQuote(prevQuote => {
      const existingItem = prevQuote.items.find(item => item.id === itemToAdd.id);
      if (existingItem) {
        // Item exists, update quantity
        const updatedItems = prevQuote.items.map(item =>
          item.id === itemToAdd.id ? { ...item, quantity: item.quantity + itemToAdd.quantity } : item
        );
        return { ...prevQuote, items: updatedItems };
      } else {
        // Item does not exist, add it
        const newItems = [...prevQuote.items, itemToAdd];
        return { ...prevQuote, items: newItems };
      }
    });
  };

  const buyNow = (item: QuoteItem) => {
    // This function can be used for other checkout flows if needed,
    // but the primary "Buy Now" is now handled in ProductCard.
    // For now, it will just open the quote sheet with the item.
    addItemToQuote(item);
    setIsQuoteSheetOpen(true);
  }

  const updateItemQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItemFromQuote(itemId);
    } else {
      setQuote(prevQuote => {
        const updatedItems = prevQuote.items.map(item => (item.id === itemId ? { ...item, quantity } : item));
        return { ...prevQuote, items: updatedItems };
      });
    }
  };
  
  const updateQuoteField = (field: keyof Omit<Quote, 'items' | 'indicativePricing'>, value: any) => {
    setQuote(prevQuote => {
      const newQuote = { ...prevQuote, [field]: value };
      if (field === 'type') {
        const prefix = value === 'Master' ? 'MQ-' : 'TQ-';
        const currentNumber = newQuote.quoteNumber;
        if (currentNumber.startsWith('MQ-') || currentNumber.startsWith('TQ-')) {
            newQuote.quoteNumber = prefix + currentNumber.substring(3);
        } else {
            newQuote.quoteNumber = prefix + currentNumber;
        }
      }
      return newQuote;
    });
  };
  
  const updateIndicativePricingField = (field: keyof IndicativePricing, value: number) => {
    setQuote(prevQuote => ({
        ...prevQuote,
        indicativePricing: {
            ...prevQuote.indicativePricing,
            [field]: value,
        }
    }));
  };

  const removeItemFromQuote = (itemId: string) => {
    setQuote(prevQuote => {
        const updatedItems = prevQuote.items.filter(item => item.id !== itemId);
        return { ...prevQuote, items: updatedItems };
    });
  };
  
  const clearQuote = () => {
    setQuote(initialQuoteState);
  }

  const subTotal = useMemo(() => {
    const itemsTotal = quote.items.reduce((total, item) => total + Number(item.price) * item.quantity, 0);
    const indicativeTotal = Object.values(quote.indicativePricing).reduce((sum, value) => sum + (Number(value) || 0), 0);
    return itemsTotal + indicativeTotal;
  }, [quote.items, quote.indicativePricing]);

  const grandTotal = useMemo(() => {
    const totalAfterDiscount = subTotal * (1 - ((quote.discount || 0) / 100));
    const taxAmount = totalAfterDiscount * ((quote.tax || 0) / 100);
    return totalAfterDiscount + taxAmount;
  }, [subTotal, quote.discount, quote.tax]);

  return (
    <QuoteContext.Provider value={{ 
        quote, 
        isQuoteSheetOpen, 
        setIsQuoteSheetOpen, 
        addItemToQuote, 
        buyNow, 
        updateItemQuantity, 
        removeItemFromQuote, 
        clearQuote, 
        subTotal, 
        grandTotal,
        updateQuoteField,
        updateIndicativePricingField,
    }}>
      {children}
    </QuoteContext.Provider>
  );
}

export function useQuote() {
  const context = useContext(QuoteContext);
  if (context === undefined) {
    throw new Error('useQuote must be used within a QuoteProvider');
  }
  return context;
}
