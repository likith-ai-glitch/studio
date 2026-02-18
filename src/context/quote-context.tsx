
'use client';

import { createContext, useContext, useState, ReactNode, useMemo, useEffect } from 'react';
import type { Product, Quote as QuoteType, QuoteLifecycleStatus } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, getDocs, query, where, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export interface QuoteItem {
  id: string; 
  productId: string;
  name: string;
  price: number;
  quantity: number;
  brand: string;
  category: string;
  colour?: string;
  partName?: string;
  isMasterProduct?: boolean;
}

interface QuoteContextType {
  quote: QuoteType;
  isQuoteSheetOpen: boolean;
  setIsQuoteSheetOpen: (isOpen: boolean) => void;
  addItemToQuote: (item: QuoteItem) => void;
  updateItemQuantity: (itemId: string, quantity: number) => void;
  removeItemFromQuote: (itemId: string) => void;
  clearQuote: () => void;
  subTotal: number;
  grandTotal: number;
  updateQuoteField: (field: string, value: any) => void;
  updateIndicativePricingField: (field: string, value: number) => void;
  applyPriceList: (priceListKey: string, allProducts: Product[]) => void;
  saveQuoteToFirestore: () => Promise<void>;
  masterQuotes: QuoteType[];
  refreshMasterQuotes: () => Promise<void>;
}

const QuoteContext = createContext<QuoteContextType | undefined>(undefined);

const initialQuoteState: QuoteType = {
    quoteNumber: 'TQ-',
    items: [],
    status: 'Draft',
    type: 'Transaction',
    approvalStatus: 'Draft',
    indicativePricing: {
        additionalCost: 0,
    },
    discount: 0,
    tax: 0,
    isMaster: false,
    masterQuoteId: null,
    lifecycleStatus: null,
}

export function QuoteProvider({ children }: { children: ReactNode }) {
  const [quote, setQuote] = useState<QuoteType>(initialQuoteState);
  const [isQuoteSheetOpen, setIsQuoteSheetOpen] = useState(false);
  const [masterQuotes, setMasterQuotes] = useState<QuoteType[]>([]);
  const { toast } = useToast();

  const refreshMasterQuotes = async () => {
    try {
      const q = query(collection(db, 'quotes'), where('isMaster', '==', true));
      const querySnapshot = await getDocs(q);
      const quotes = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as QuoteType[];
      setMasterQuotes(quotes);
    } catch (error) {
      console.error("Error fetching master quotes:", error);
    }
  };

  useEffect(() => {
    refreshMasterQuotes();
  }, []);

  const addItemToQuote = (itemToAdd: QuoteItem) => {
    // Lifecycle Validation: Locked quotes cannot be edited
    if (quote.isMaster && quote.lifecycleStatus === 'Locked') {
        toast({ title: "Quote Locked", description: "Cannot add items to a locked Master Quote.", variant: "destructive" });
        return;
    }

    // Requirement: Master Quotes only allow Master Products
    if (quote.isMaster && !itemToAdd.isMasterProduct) {
        toast({ title: "Invalid Product", description: "Master Quotes only allow Master Products.", variant: "destructive" });
        return;
    }

    setQuote(prevQuote => {
      const existingItem = prevQuote.items.find(item => item.id === itemToAdd.id);
      if (existingItem) {
        const updatedItems = prevQuote.items.map(item =>
          item.id === itemToAdd.id ? { ...item, quantity: item.quantity + itemToAdd.quantity } : item
        );
        return { ...prevQuote, items: updatedItems };
      } else {
        return { ...prevQuote, items: [...prevQuote.items, itemToAdd] };
      }
    });
  };

  const updateItemQuantity = (itemId: string, quantity: number) => {
    if (quote.isMaster && quote.lifecycleStatus === 'Locked') return;
    
    if (quantity <= 0) {
      removeItemFromQuote(itemId);
    } else {
      setQuote(prevQuote => {
        const updatedItems = prevQuote.items.map(item => (item.id === itemId ? { ...item, quantity } : item));
        return { ...prevQuote, items: updatedItems };
      });
    }
  };

  const removeItemFromQuote = (itemId: string) => {
    // Lifecycle Validation: InProgress or Locked Master Quotes cannot remove items
    if (quote.isMaster && (quote.lifecycleStatus === 'InProgress' || quote.lifecycleStatus === 'Locked')) {
        toast({ title: "Restricted Action", description: "Cannot remove items from a Master Quote in Progress or Locked.", variant: "destructive" });
        return;
    }

    setQuote(prevQuote => {
        const updatedItems = prevQuote.items.filter(item => item.id !== itemId);
        return { ...prevQuote, items: updatedItems };
    });
  };
  
  const updateQuoteField = (field: string, value: any) => {
    if (quote.isMaster && quote.lifecycleStatus === 'Locked') return;

    setQuote(prevQuote => {
      const newQuote = { ...prevQuote, [field]: value };

      // Validation logic: masterQuoteId must be null if isMaster is true
      if (field === 'isMaster') {
          if (value === true) {
              newQuote.masterQuoteId = null;
              newQuote.lifecycleStatus = prevQuote.lifecycleStatus || 'Draft';
          } else {
              newQuote.lifecycleStatus = null;
          }
      }

      // Handle quote number prefix based on type
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
  
  const updateIndicativePricingField = (field: string, value: number) => {
    if (quote.isMaster && quote.lifecycleStatus === 'Locked') return;
    setQuote(prevQuote => ({
        ...prevQuote,
        indicativePricing: {
            ...prevQuote.indicativePricing,
            [field]: parseFloat(String(value)) || 0,
        }
    }));
  };

  const applyPriceList = (priceListKey: string, allProducts: Product[]) => {
    if (quote.isMaster && quote.lifecycleStatus === 'Locked') return;
    setQuote(prevQuote => {
        const updatedItems = prevQuote.items.map(item => {
            const product = allProducts.find(p => p.productId === item.productId);
            if (product) {
                const newPrice = priceListKey === 'none' 
                    ? (product.price || 0)
                    : (product[priceListKey as keyof Product] as number || product.price || 0);
                return { ...item, price: newPrice };
            }
            return item;
        });
        return { ...prevQuote, items: updatedItems };
    });
  };

  const subTotal = useMemo(() => {
    const itemsTotal = quote.items.reduce((total, item) => total + Number(item.price) * item.quantity, 0);
    const additionalCost = Number(quote.indicativePricing.additionalCost) || 0;
    return itemsTotal + additionalCost;
  }, [quote.items, quote.indicativePricing.additionalCost]);

  const grandTotal = useMemo(() => {
    const discountAmount = subTotal * ((quote.discount || 0) / 100);
    const taxableAmount = subTotal - discountAmount;
    const taxAmount = taxableAmount * ((quote.tax || 0) / 100);
    return taxableAmount + taxAmount;
  }, [subTotal, quote.discount, quote.tax]);

  const saveQuoteToFirestore = async () => {
    try {
      // Final Validation
      if (!quote.isMaster && quote.masterQuoteId) {
          // Check if trying to attach a quote that is already a master
          // (Logic handled in UI dropdown but good to have here)
      }

      const quoteToSave = {
        ...quote,
        Name: quote.quoteNumber,
        totalPrice: grandTotal,
        LastModifiedDate: serverTimestamp(),
        itemsCount: quote.items.length,
      };

      const docRef = await addDoc(collection(db, 'quotes'), quoteToSave);
      
      // Save Line Items
      for (const item of quote.items) {
          await addDoc(collection(db, 'quoteLineItems'), {
              ...item,
              QuoteId: docRef.id,
              UnitPrice: item.price,
              TotalPrice: item.price * item.quantity,
          });
      }

      toast({ title: "Quote Saved", description: "Quote successfully saved to Firestore." });
      clearQuote();
      setIsQuoteSheetOpen(false);
      refreshMasterQuotes();
    } catch (error: any) {
      console.error("Error saving quote:", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const clearQuote = () => {
    setQuote(initialQuoteState);
  }

  return (
    <QuoteContext.Provider value={{ 
        quote, 
        isQuoteSheetOpen, 
        setIsQuoteSheetOpen, 
        addItemToQuote, 
        updateItemQuantity, 
        removeItemFromQuote, 
        clearQuote, 
        subTotal, 
        grandTotal,
        updateQuoteField,
        updateIndicativePricingField,
        applyPriceList,
        saveQuoteToFirestore,
        masterQuotes,
        refreshMasterQuotes
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
