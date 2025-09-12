
'use client';

import { createContext, useContext, useState, ReactNode, useMemo } from 'react';

export interface QuoteItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  brand: string;
  category: string;
}

export type QuoteStatus = 'Draft' | 'InProgress' | 'Final';
export type QuoteType = 'Master' | 'Transaction';
export type QuoteApprovalStatus = 'Draft' | 'SentForApproval' | 'Approved';

export interface Quote {
  items: QuoteItem[];
  status: QuoteStatus;
  type: QuoteType;
  approvalStatus: QuoteApprovalStatus;
  indicativePricing: number;
  priceList: string;
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
  quoteTotal: number;
  updateQuoteField: (field: keyof Omit<Quote, 'items'>, value: any) => void;
}

const QuoteContext = createContext<QuoteContextType | undefined>(undefined);

const initialQuoteState: Quote = {
    items: [],
    status: 'Draft',
    type: 'Transaction',
    approvalStatus: 'Draft',
    indicativePricing: 0,
    priceList: '',
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
  
  const updateQuoteField = (field: keyof Omit<Quote, 'items'>, value: any) => {
    setQuote(prevQuote => ({
      ...prevQuote,
      [field]: value
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

  const quoteTotal = useMemo(() => {
    return quote.items.reduce((total, item) => total + Number(item.price) * item.quantity, 0)
  }, [quote.items]);

  return (
    <QuoteContext.Provider value={{ quote, isQuoteSheetOpen, setIsQuoteSheetOpen, addItemToQuote, buyNow, updateItemQuantity, removeItemFromQuote, clearQuote, quoteTotal, updateQuoteField }}>
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
