
'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

export interface QuoteItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  brand: string;
  category: string;
}

interface QuoteContextType {
  quote: QuoteItem[];
  isQuoteSheetOpen: boolean;
  setIsQuoteSheetOpen: (isOpen: boolean) => void;
  addItemToQuote: (item: QuoteItem) => void;
  buyNow: (item: QuoteItem) => void;
  updateItemQuantity: (itemId: string, quantity: number) => void;
  removeItemFromQuote: (itemId: string) => void;
  clearQuote: () => void;
  quoteTotal: number;
}

const QuoteContext = createContext<QuoteContextType | undefined>(undefined);

export function QuoteProvider({ children }: { children: ReactNode }) {
  const [quote, setQuote] = useState<QuoteItem[]>([]);
  const [isQuoteSheetOpen, setIsQuoteSheetOpen] = useState(false);

  const addItemToQuote = (itemToAdd: QuoteItem) => {
    setQuote(prevQuote => {
      const existingItem = prevQuote.find(item => item.id === itemToAdd.id);
      if (existingItem) {
        // Item exists, update quantity
        return prevQuote.map(item =>
          item.id === itemToAdd.id ? { ...item, quantity: item.quantity + itemToAdd.quantity } : item
        );
      } else {
        // Item does not exist, add it
        return [...prevQuote, itemToAdd];
      }
    });
  };

  const buyNow = (item: QuoteItem) => {
    setQuote([item]);
    setIsQuoteSheetOpen(true);
  }

  const updateItemQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItemFromQuote(itemId);
    } else {
      setQuote(prevQuote =>
        prevQuote.map(item => (item.id === itemId ? { ...item, quantity } : item))
      );
    }
  };

  const removeItemFromQuote = (itemId: string) => {
    setQuote(prevQuote => prevQuote.filter(item => item.id !== itemId));
  };
  
  const clearQuote = () => {
    setQuote([]);
  }

  const quoteTotal = quote.reduce((total, item) => total + Number(item.price) * item.quantity, 0);

  return (
    <QuoteContext.Provider value={{ quote, isQuoteSheetOpen, setIsQuoteSheetOpen, addItemToQuote, buyNow, updateItemQuantity, removeItemFromQuote, clearQuote, quoteTotal }}>
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
