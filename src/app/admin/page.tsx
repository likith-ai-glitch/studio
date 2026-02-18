
'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useProducts } from '@/context/product-context';
import { useOrders } from '@/context/order-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { MoreHorizontal, PlusCircle, IndianRupee, Package, ShoppingCart, ArrowUpDown, Loader2, PackageCheck, PackageX, Trash2, Pencil, ArrowUp, ArrowDown, Columns, Settings, View, Copy, FilePlus, Upload, Download, BookCopy, Percent, RefreshCw, AlertCircle, CheckCircle, DatabaseZap, Info, X, Save } from 'lucide-react';
import Link from 'next/link';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
    DropdownMenuCheckboxItem,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
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
import type { Product } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ProductCompare } from '@/components/product-compare';
import { useQuote } from '@/context/quote-context';
import { useToast } from '@/hooks/use-toast';
import Papa from 'papaparse';
import { ScrollArea } from '@/components/ui/scroll-area';
import { debounce } from 'lodash';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, Timestamp, where, getDocs } from 'firebase/firestore';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface QuoteLineItem {
    Id: string;
    Quantity: number;
    UnitPrice: number;
    TotalPrice: number;
    Description: string | null;
}

interface QuoteRecord {
    Id: string;
    Name: string;
    Status: string;
    TotalPrice: number;
    LastModifiedDate: Date;
    lineItems: QuoteLineItem[];
}

function QuotesDashboard() {
  const [quotes, setQuotes] = useState<QuoteRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const quotesQuery = query(collection(db, 'quotes'), orderBy('LastModifiedDate', 'desc'));

    const unsubscribeQuotes = onSnapshot(quotesQuery, async (quotesSnapshot) => {
      if (quotesSnapshot.empty) {
        setQuotes([]);
        setLoading(false);
        return;
      }
      
      const quotesDataPromises = quotesSnapshot.docs.map(async (quoteDoc) => {
        const quoteData = quoteDoc.data();
        
        // Safety check for LastModifiedDate to avoid runtime errors
        let lastModified: Date;
        if (quoteData.LastModifiedDate && typeof quoteData.LastModifiedDate.toDate === 'function') {
          lastModified = quoteData.LastModifiedDate.toDate();
        } else if (quoteData.LastModifiedDate instanceof Date) {
          lastModified = quoteData.LastModifiedDate;
        } else {
          lastModified = new Date();
        }

        // Fetch associated line items
        const lineItemsQuery = query(collection(db, 'quoteLineItems'), where('QuoteId', '==', quoteDoc.id));
        const lineItemsSnapshot = await getDocs(lineItemsQuery);
        const lineItems = lineItemsSnapshot.docs.map(doc => doc.data() as QuoteLineItem);

        return {
          Id: quoteDoc.id,
          Name: quoteData.Name || quoteData.quoteNumber || 'Untitled Quote',
          Status: quoteData.Status || quoteData.status || 'Draft',
          TotalPrice: quoteData.TotalPrice || quoteData.totalPrice || 0,
          LastModifiedDate: lastModified,
          lineItems: lineItems
        } as QuoteRecord;
      });

      const resolvedQuotes = await Promise.all(quotesDataPromises);
      setQuotes(resolvedQuotes);
      setLoading(false);

    }, (err) => {
      console.error("Error fetching quotes:", err);
      setError("Failed to fetch quotes. Check permissions or connection.");
      setLoading(false);
    });

    return () => {
        unsubscribeQuotes();
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DatabaseZap className="h-6 w-6"/> Salesforce Quotes Dashboard
        </CardTitle>
        <p className="text-sm text-muted-foreground">Real-time view of Quotes and Quote Line Items from Firestore.</p>
      </CardHeader>
      <CardContent>
          {error && (
            <div className="text-center py-10 text-destructive">
              <AlertCircle className="mx-auto h-10 w-10 mb-2" />
              <p className="font-semibold">An Error Occurred</p>
              <p className="text-sm">{error}</p>
            </div>
          )}
          {!error && loading && (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          {!error && !loading && quotes.length === 0 && (
              <div className="text-center py-10 text-muted-foreground">
                <p>No quotes found in Firestore.</p>
                <p className="text-sm">Run the Salesforce sync to populate this dashboard.</p>
            </div>
          )}
          {!error && !loading && quotes.length > 0 && (
             <Accordion type="single" collapsible className="w-full space-y-2">
                {quotes.map(quote => (
                    <AccordionItem key={quote.Id} value={quote.Id} className="border rounded-lg bg-background">
                         <AccordionTrigger className="px-4 py-3 hover:no-underline">
                            <div className="flex justify-between w-full items-center gap-4 text-sm">
                               <div className="font-medium text-left">{quote.Name} <span className="text-xs text-muted-foreground font-mono">({quote.Id})</span></div>
                               <Badge variant={quote.Status === 'Accepted' ? 'secondary' : 'outline'}>{quote.Status}</Badge>
                               <div className="font-semibold text-primary">₹{quote.TotalPrice.toFixed(2)}</div>
                               <div className="text-muted-foreground">{format(quote.LastModifiedDate, 'PP')}</div>
                            </div>
                         </AccordionTrigger>
                         <AccordionContent className="px-4 pb-4">
                            {quote.lineItems.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Line Item ID</TableHead>
                                            <TableHead>Description</TableHead>
                                            <TableHead className="text-right">Quantity</TableHead>
                                            <TableHead className="text-right">Unit Price</TableHead>
                                            <TableHead className="text-right">Total Price</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {quote.lineItems.map(item => (
                                            <TableRow key={item.Id}>
                                                <TableCell className="font-mono text-xs">{item.Id}</TableCell>
                                                <TableCell>{item.Description || 'N/A'}</TableCell>
                                                <TableCell className="text-right">{item.Quantity}</TableCell>
                                                <TableCell className="text-right">₹{item.UnitPrice.toFixed(2)}</TableCell>
                                                <TableCell className="text-right font-medium">₹{item.TotalPrice.toFixed(2)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div className="text-center py-4 text-muted-foreground">No line items for this quote.</div>
                            )}
                         </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
          )}
      </CardContent>
    </Card>
  );
}


function PriceBookTable() {
  const { products, loading, updateProductField, headerNames, renameColumn } = useProducts();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [percentages, setPercentages] = useState<Record<string, Record<string, number>>>({});
  const [columnToRename, setColumnToRename] = useState<string | null>(null);
  const [newHeaderName, setNewHeaderName] = useState('');


  const priceFields: (keyof Product)[] = useMemo(() => 
    ['priceList1', 'priceList2', 'priceList3', 'priceList4', 'priceList5'], 
  []);

  const filteredProducts = useMemo(() => {
    return products.filter((product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.productId && product.productId.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [products, searchTerm]);

  useEffect(() => {
    const newPercentages: Record<string, Record<string, number>> = {};
    products.forEach(product => {
      newPercentages[product.productId] = {};
      const basePrice = product.priceList1 || 0;
      if (basePrice > 0) {
        for (let i = 2; i <= 5; i++) {
          const field = `priceList${i}` as keyof Product;
          const price = product[field] as number || 0;
          const percentage = (price / basePrice * 100) - 100;
          newPercentages[product.productId][field] = parseFloat(percentage.toFixed(2));
        }
      } else {
         for (let i = 2; i <= 5; i++) {
            const field = `priceList${i}` as keyof Product;
            newPercentages[product.productId][field] = 0;
         }
      }
    });
    setPercentages(newPercentages);
  }, [products]);

  const debouncedUpdate = useMemo(
    () =>
      debounce(async (productId: string, field: string, value: number) => {
        try {
          await updateProductField(productId, field, value);
        } catch (error: any) {
          toast({
            title: 'Error updating price',
            description: error.message,
            variant: 'destructive',
          });
        }
      }, 500),
    [updateProductField, toast]
  );

  const handlePriceChange = (productId: string, field: string, value: string) => {
    const price = parseFloat(value);
    if (!isNaN(price) && price >= 0) {
      debouncedUpdate(productId, field, price);
    } else if (value === '') {
      debouncedUpdate(productId, field, 0);
    }
  };
  
  const handlePercentageChange = (productId: string, field: string, percentageStr: string) => {
    const percentage = parseFloat(percentageStr);
    const product = products.find(p => p.productId === productId);
    if (!product || isNaN(percentage)) return;

    setPercentages(prev => ({
        ...prev,
        [productId]: {
            ...prev[productId],
            [field]: percentage
        }
    }));
    
    const basePrice = product.priceList1 || 0;
    const newPrice = basePrice * (1 + percentage / 100);
    debouncedUpdate(productId, field, parseFloat(newPrice.toFixed(2)));
  }

  const handleActivePriceChange = async (productId: string, activePriceList: string) => {
    const product = products.find(p => p.productId === productId);
    if (!product) return;

    const newPrice = product[activePriceList as keyof Product] as number || 0;

    await updateProductField(productId, 'price', newPrice);
    await updateProductField(productId, 'activePriceList', activePriceList);
  };
  
  const handleRenameColumn = () => {
    if (columnToRename && newHeaderName.trim()) {
      renameColumn(columnToRename, newHeaderName.trim());
      setColumnToRename(null);
      setNewHeaderName('');
    }
  };

  const renderPriceHeader = (field: string, defaultName: string) => {
    const headerText = headerNames[field] || defaultName;
    return (
        <TableHead key={field} className="text-right min-w-[250px]">
            <div className="flex items-center justify-end gap-2">
                <span>{headerText}</span>
                <Dialog open={columnToRename === field} onOpenChange={(isOpen) => !isOpen && setColumnToRename(null)}>
                    <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                            setColumnToRename(field);
                            setNewHeaderName(headerText);
                        }}>
                            <Pencil className="h-3 w-3" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Rename Column</DialogTitle>
                            <DialogDescription>
                                Change the display name for the &quot;{field}&quot; column.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                            <Input
                                value={newHeaderName}
                                onChange={(e) => setNewHeaderName(e.target.value)}
                                placeholder="Enter new column name"
                            />
                        </div>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button variant="outline">Cancel</Button>
                            </DialogClose>
                            <Button onClick={handleRenameColumn}>Save</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </TableHead>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <CardTitle className="flex items-center gap-2">
            <BookCopy className="h-6 w-6"/> Price Book
          </CardTitle>
          <Input
            placeholder="Filter products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-auto md:w-64"
          />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="relative w-full overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[150px]">Product ID</TableHead>
                  <TableHead className="min-w-[250px]">Name</TableHead>
                  {renderPriceHeader('priceList1', 'Standard Price')}
                  {priceFields.slice(1).map((field, index) => renderPriceHeader(field, `Price List ${index + 2}`))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length > 0 ? (
                  filteredProducts.map((product) => (
                    <TableRow key={product.productId}>
                      <TableCell className="font-mono text-xs">{product.productId}</TableCell>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell className="text-right">
                          <RadioGroup value={product.activePriceList || 'priceList1'} onValueChange={(value) => handleActivePriceChange(product.productId, value)}>
                            <div className="flex items-center justify-end gap-2">
                              <RadioGroupItem value="priceList1" id={`${product.productId}-pl1`} />
                              <Input
                                type="number"
                                defaultValue={product.priceList1 || '0'}
                                onChange={(e) => handlePriceChange(product.productId, 'priceList1', e.target.value)}
                                className="w-28 text-right"
                                placeholder="0.00"
                                min="0"
                                step="0.01"
                              />
                            </div>
                          </RadioGroup>
                      </TableCell>
                      {priceFields.slice(1).map((field) => (
                        <TableCell key={field as string} className="text-right">
                           <RadioGroup value={product.activePriceList || 'priceList1'} onValueChange={(value) => handleActivePriceChange(product.productId, value)}>
                            <div className="flex items-center justify-end gap-2">
                              <RadioGroupItem value={field as string} id={`${product.productId}-${field as string}`} />
                              <span className="font-medium w-24 text-left">
                                  ₹{Number(product[field as keyof Product] || '0').toFixed(2)}
                              </span>
                              <div className="relative w-24">
                                <Input
                                  type="number"
                                  value={percentages[product.productId]?.[field as string] ?? '0'}
                                  onChange={(e) => handlePercentageChange(product.productId, field as string, e.target.value)}
                                  className="w-full text-right pr-6"
                                  placeholder="0"
                                  step="0.1"
                                  disabled={!product.priceList1 || product.priceList1 <= 0}
                                />
                                <Percent className="absolute right-1.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              </div>
                            </div>
                           </RadioGroup>
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={priceFields.length + 2} className="text-center h-24">
                      No products found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminPage() {
  const { 
    products, 
    deleteProduct, 
    addColumn, 
    deleteColumn, 
    loading: productsLoading, 
    productKeys, 
    setColumnOrder: setContextColumnOrder, 
    headerNames, 
    renameColumn,
    homePageFieldOrder,
    setHomePageFieldOrder,
    homePageVisibleFields,
    toggleHomePageFieldVisibility,
    adminTableVisibleFields,
    toggleAdminTableFieldVisibility,
    updateProductField,
    selectedProducts,
    toggleProductSelection,
    toggleSelectAllProducts,
    clearSelection,
    addProductsBulk,
  } = useProducts();
  const { orders } = useOrders();
  const { addItemToQuote, setIsQuoteSheetOpen, quote, clearQuote, saveQuoteToFirestore } = useQuote();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Product | string | null; direction: 'ascending' | 'descending' }>({ key: 'name', direction: 'ascending' });
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  
  const [newColumnName, setNewColumnName] = useState('');
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [isAddColumnDialogOpen, setAddColumnDialogOpen] = useState(false);

  const [columnToDelete, setColumnToDelete] = useState('');
  const [isDeletingColumn, setIsDeletingColumn] = useState(false);
  const [isDeleteColumnDialogOpen, setDeleteColumnDialogOpen] = useState(false);

  const [columnToRename, setColumnToRename] = useState<string | null>(null);
  const [newHeaderName, setNewHeaderName] = useState('');
  
  const [isReorderDialogOpen, setReorderDialogOpen] = useState(false);
  const [localColumnOrder, setLocalColumnOrder] = useState(productKeys);

  const [isHomePageSettingsOpen, setIsHomePageSettingsOpen] = useState(false);
  const [localHomePageOrder, setLocalHomePageOrder] = useState(homePageFieldOrder);
  
  const [isCompareDialogOpen, setCompareDialogOpen] = useState(false);
  
  const [isExportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportFields, setExportFields] = useState<Record<string, boolean>>({});
  
  const [isImportDialogOpen, setImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStep, setImportStep] = useState<'selectFile' | 'mapFields'>('selectFile');
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});


  useEffect(() => {
    setLocalColumnOrder(productKeys);
    setExportFields(productKeys.reduce((acc, key) => ({ ...acc, [key]: true }), {}));
  }, [productKeys]);

  useEffect(() => {
    setLocalHomePageOrder(homePageFieldOrder);
  }, [homePageFieldOrder]);

  useEffect(() => {
    return () => {
      clearSelection();
    };
  }, [clearSelection]);


  const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total), 0);
  const totalSales = orders.length;

  const availableProducts = useMemo(() => {
    return products.filter(p => p.status === 'Available').length;
  }, [products]);

  const unavailableProducts = useMemo(() => {
    return products.filter(p => p.status === 'Unavailable').length;
  }, [products]);

  const deletableColumns = useMemo(() => {
    return productKeys.filter(k => k !== 'productId' && k !== 'quoteTotal');
  }, [productKeys]);
  
  const homePageConfigurableFields = useMemo(() => {
    return productKeys.filter(k => !['productId', 'quoteTotal'].includes(k));
  }, [productKeys]);
  
  const masterTableKeys = useMemo(() => {
    const priceListColumns = ['priceList1', 'priceList2', 'priceList3', 'priceList4', 'priceList5', 'activePriceList'];
    return productKeys.filter(key => !priceListColumns.includes(key));
  }, [productKeys]);

  const visibleProductKeys = useMemo(() => {
    return masterTableKeys.filter(key => adminTableVisibleFields[key]);
  }, [masterTableKeys, adminTableVisibleFields]);


  const sortedAndFilteredProducts = useMemo(() => {
    let sortableProducts = [...products];

    if (searchTerm) {
        const lowercasedFilter = searchTerm.toLowerCase();
        sortableProducts = sortableProducts.filter(product => {
            return Object.values(product).some(value => 
                String(value).toLowerCase().includes(lowercasedFilter)
            );
        });
    }

    if (sortConfig.key) {
      sortableProducts.sort((a, b) => {
        const key = sortConfig.key as string;

        let aValue, bValue;

        if (key === 'quoteTotal') {
            aValue = (a.qtyForQuote || 0) * (a.price || 0);
            bValue = (b.qtyForQuote || 0) * (b.price || 0);
        } else {
            aValue = a[key as keyof Product] ?? '';
            bValue = b[key as keyof Product] ?? '';
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }

    return sortableProducts;
  }, [products, searchTerm, sortConfig]);

  const requestSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const handleDelete = () => {
    if (deleteTarget) {
        deleteProduct(deleteTarget);
        setDeleteTarget(null);
    }
  }

  const handleAddColumn = async () => {
    if (!newColumnName.trim()) return;
    setIsAddingColumn(true);
    try {
      await addColumn(newColumnName.trim());
      setNewColumnName('');
      setAddColumnDialogOpen(false);
    } catch(error) {
       console.error(error);
    } finally {
       setIsAddingColumn(false);
    }
  }

  const handleDeleteColumn = async () => {
    if (!columnToDelete) return;
    setIsDeletingColumn(true);
    try {
      await deleteColumn(columnToDelete);
      setColumnToDelete('');
      setDeleteColumnDialogOpen(false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsDeletingColumn(false);
    }
  };

  const handleRenameColumn = () => {
    if (columnToRename && newHeaderName.trim()) {
      renameColumn(columnToRename, newHeaderName.trim());
      setColumnToRename(null);
      setNewHeaderName('');
    }
  };
  
  const moveColumn = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...localColumnOrder];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex >= 0 && newIndex < newOrder.length) {
      const temp = newOrder[index];
      newOrder[index] = newOrder[newIndex];
      newOrder[newIndex] = temp;
      setLocalColumnOrder(newOrder);
    }
  };

  const handleSaveColumnOrder = () => {
    setContextColumnOrder(localColumnOrder);
    setReorderDialogOpen(false);
  };
  
  const moveHomePageField = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...localHomePageOrder];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex >= 0 && newIndex < newOrder.length) {
      const temp = newOrder[index];
      newOrder[index] = newOrder[newIndex];
      newOrder[newIndex] = temp;
      setLocalHomePageOrder(newOrder);
    }
  };

  const handleSaveHomePageOrder = () => {
    setHomePageFieldOrder(localHomePageOrder);
    setIsHomePageSettingsOpen(false);
  };
  
  const handleQtyChange = (productId: string, newQty: string) => {
    const quantity = parseInt(newQty, 10);
    if (!isNaN(quantity) && quantity >= 0) {
        updateProductField(productId, 'qtyForQuote', quantity);
    }
  }

  const handleAddToQuote = (product: Product) => {
    if (product.status === 'Unavailable') {
        toast({
            title: "Product Unavailable",
            description: `${product.name} cannot be added to the quote.`,
            variant: "destructive"
        });
        return;
    };
    
    addItemToQuote({
        id: product.productId,
        productId: product.productId,
        name: product.name,
        price: Number(product.price) || 99.99, // Fallback price
        quantity: 1,
        brand: product.brand,
        category: product.category,
        colour: product.colour,
        partName: product.partName,
    });

    toast({
        title: "Added to quote",
        description: `${product.name} has been added to your quote.`
    });
    setIsQuoteSheetOpen(true);
  }

  const handleExport = () => {
    const productsToExport = selectedProducts.length > 0
      ? products.filter(p => selectedProducts.includes(p.productId))
      : products;

    const fieldsToExport = productKeys.filter(key => exportFields[key]);
    const header = fieldsToExport.map(key => headerNames[key] || key);
    
    const csvRows = [
      header.join(','),
      ...productsToExport.map(product => 
        fieldsToExport.map(field => {
          let value;
          if (field === 'quoteTotal') {
            value = (product.qtyForQuote || 0) * (product.price || 0);
          } else {
            value = product[field as keyof Product] as any;
          }
          
          if (value === null || value === undefined) {
            value = '';
          } else if (typeof value === 'string' && value.includes(',')) {
            value = `"${value}"`;
          } else if (value instanceof Date) {
            value = value.toISOString();
          }
          return value;
        }).join(',')
      )
    ];

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'products.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setExportDialogOpen(false);
  };
  
  const resetImportState = () => {
    setImportFile(null);
    setCsvHeaders([]);
    setCsvData([]);
    setFieldMapping({});
    setImportStep('selectFile');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      setImportFile(file);
      setIsImporting(true);

      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.meta.fields) {
            setCsvHeaders(results.meta.fields);
            setCsvData(results.data);
            
            const initialMapping: Record<string, string> = {};
            const productKeysLower = productKeys.map(k => k.toLowerCase());
            results.meta.fields.forEach(header => {
              const headerLower = header.toLowerCase();
              const matchIndex = productKeysLower.indexOf(headerLower);
              if (matchIndex > -1) {
                initialMapping[header] = productKeys[matchIndex];
              } else {
                initialMapping[header] = 'none';
              }
            });
            setFieldMapping(initialMapping);
            setImportStep('mapFields');
          }
          setIsImporting(false);
        },
        error: (error: any) => {
          toast({
            title: "CSV Parsing Failed",
            description: error.message,
            variant: "destructive",
          });
          setIsImporting(false);
        }
      });
    }
  };

  const handleImport = async () => {
    setIsImporting(true);

    const mappedData = csvData.map(row => {
      const newRow: Record<string, any> = {};
      for (const csvHeader in fieldMapping) {
        const productField = fieldMapping[csvHeader];
        if (productField && productField !== 'none' && row[csvHeader] !== undefined) {
          newRow[productField] = row[csvHeader];
        }
      }
      return newRow;
    });

    try {
      await addProductsBulk(mappedData);
      toast({
        title: "Import Successful",
        description: `${mappedData.length} products have been imported or updated.`,
      });
    } catch (error: any) {
      toast({
        title: "Import Failed",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
      resetImportState();
      setImportDialogOpen(false);
    }
  };


  const renderHeader = (key: string) => {
    const headerText = headerNames[key] || (key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'));
    const isCalculated = key === 'quoteTotal';

    return (
        <TableHead key={key}>
            <div className="flex items-center gap-2">
                <button className="flex items-center gap-1" onClick={() => requestSort(key)}>
                    {headerText} <ArrowUpDown className="inline-block h-4 w-4" />
                </button>
                {!isCalculated && (
                  <Dialog open={columnToRename === key} onOpenChange={(isOpen) => !isOpen && setColumnToRename(null)}>
                      <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                              setColumnToRename(key);
                              setNewHeaderName(headerText);
                          }}>
                              <Pencil className="h-3 w-3" />
                          </Button>
                      </DialogTrigger>
                      <DialogContent>
                          <DialogHeader>
                              <DialogTitle>Rename Column</DialogTitle>
                              <DialogDescription>
                                  Change the display name for the &quot;{key}&quot; column.
                              </DialogDescription>
                          </DialogHeader>
                          <div className="py-4">
                              <Input
                                  value={newHeaderName}
                                  onChange={(e) => setNewHeaderName(e.target.value)}
                                  placeholder="Enter new column name"
                              />
                          </div>
                          <DialogFooter>
                              <DialogClose asChild>
                                  <Button variant="outline">Cancel</Button>
                              </DialogClose>
                              <Button onClick={handleRenameColumn}>Save</Button>
                          </DialogFooter>
                      </DialogContent>
                  </Dialog>
                )}
            </div>
        </TableHead>
    );
};

  const handleSaveActiveQuote = async () => {
    setIsSaving(true);
    try {
        await saveQuoteToFirestore();
    } finally {
        setIsSaving(false);
    }
  };

  const visibleFilteredProductIds = useMemo(() => sortedAndFilteredProducts.map(p => p.productId), [sortedAndFilteredProducts]);

  const allVisibleSelected = useMemo(() => {
    if (selectedProducts.length === 0 || visibleFilteredProductIds.length === 0) return false;
    return visibleFilteredProductIds.every(id => selectedProducts.includes(id));
  }, [selectedProducts, visibleFilteredProductIds]);

  const handleSelectAllToggle = () => {
    toggleSelectAllProducts(visibleFilteredProductIds);
  };

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <h1 className="text-4xl font-bold font-headline">Dashboard</h1>
      </header>

      {quote.masterQuoteId && (
        <Alert className="bg-primary/10 border-primary">
          <Info className="h-4 w-4 text-primary" />
          <AlertTitle className="font-bold">Building Child Quote</AlertTitle>
          <AlertDescription className="flex justify-between items-center">
            You are currently selecting products to build a comparison quote for a Master Baseline.
            <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleSaveActiveQuote} disabled={isSaving || quote.items.length === 0} className="bg-green-600 hover:bg-green-700 text-white border-none">
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                    Save Quote
                </Button>
                <Button variant="ghost" size="sm" onClick={() => clearQuote()} className="text-primary hover:text-primary">
                    <X className="h-4 w-4 mr-1" /> Cancel
                </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Revenue
            </CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Total revenue from all sales
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Sales
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{totalSales}</div>
            <p className="text-xs text-muted-foreground">
              Total number of orders placed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products.length}</div>
            <p className="text-xs text-muted-foreground">
              Total number of products in store
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <PackageCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{availableProducts}</div>
            <p className="text-xs text-muted-foreground">
              Products marked as available
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unavailable</CardTitle>
            <PackageX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unavailableProducts}</div>
            <p className="text-xs text-muted-foreground">
              Products marked as unavailable
            </p>
          </CardContent>
        </Card>
      </div>

      <QuotesDashboard />

      <Card>
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <CardTitle>Product Master (prd_master)</CardTitle>
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {quote.items.length > 0 && (
                <Button 
                    size="sm" 
                    onClick={handleSaveActiveQuote} 
                    disabled={isSaving}
                    className="bg-green-600 hover:bg-green-700 text-white"
                >
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Quote ({quote.items.length})
                </Button>
            )}
            <Input
                placeholder="Filter products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-auto md:w-48"
              />
            <Dialog open={isImportDialogOpen} onOpenChange={(isOpen) => { setImportDialogOpen(isOpen); if (!isOpen) resetImportState(); }}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Upload className="mr-2 h-4 w-4" />
                  Import
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle>Import Products</DialogTitle>
                  {importStep === 'selectFile' && (
                    <DialogDescription>
                      Upload a CSV file to add or update products. The first row must be headers.
                    </DialogDescription>
                  )}
                  {importStep === 'mapFields' && (
                    <DialogDescription>
                      Map the columns from your CSV file to the corresponding product fields. Unmapped fields will be ignored.
                    </DialogDescription>
                  )}
                </DialogHeader>

                {importStep === 'selectFile' ? (
                  <div className="py-4 flex flex-col items-center justify-center border-2 border-dashed rounded-lg h-48">
                    <Input type="file" accept=".csv" onChange={handleFileSelect} ref={fileInputRef} className="hidden" id="csv-upload" />
                    <Label htmlFor="csv-upload" className="cursor-pointer">
                      <div className="text-center">
                        <Upload className="mx-auto h-10 w-10 text-muted-foreground" />
                        {isImporting ? <p className="mt-2">Analyzing file...</p> : (importFile ? <p className="mt-2 font-medium">{importFile.name}</p> : <p className="mt-2">Click to browse or drag & drop CSV file</p>)}
                      </div>
                    </Label>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="font-semibold">Map your fields:</p>
                    <ScrollArea className="h-64">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-1">
                      {csvHeaders.map(header => (
                        <div key={header} className="space-y-2">
                          <Label htmlFor={`map-${header}`}>{header}</Label>
                          <Select
                            value={fieldMapping[header]}
                            onValueChange={(value) => setFieldMapping(prev => ({ ...prev, [header]: value }))}
                          >
                            <SelectTrigger id={`map-${header}`}>
                              <SelectValue placeholder="Select a field" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Ignore this field</SelectItem>
                              <DropdownMenuSeparator />
                              {productKeys.filter(k => k !== 'quoteTotal').map(key => (
                                <SelectItem key={key} value={key}>{headerNames[key] || key}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground truncate">
                            Preview: {csvData[0]?.[header]}
                          </p>
                        </div>
                      ))}
                    </div>
                    </ScrollArea>
                  </div>
                )}

                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline" disabled={isImporting}>Cancel</Button>
                  </DialogClose>
                  {importStep === 'mapFields' && (
                    <Button onClick={handleImport} disabled={isImporting}>
                      {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Import Data
                    </Button>
                  )}
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={isExportDialogOpen} onOpenChange={setExportDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Export Products</DialogTitle>
                  <DialogDescription>
                    {selectedProducts.length > 0
                      ? `You are about to export ${selectedProducts.length} selected product(s). `
                      : `You are about to export all ${products.length} products. `
                    }
                    Select the fields you want to include in the CSV file.
                  </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-80 my-4">
                  <div className="space-y-2 pr-6">
                    {productKeys.map(key => (
                      <div key={key} className="flex items-center gap-2">
                        <Checkbox
                          id={`export-${key}`}
                          checked={!!exportFields[key]}
                          onCheckedChange={(checked) => setExportFields(prev => ({...prev, [key]: !!checked}))}
                        />
                        <Label htmlFor={`export-${key}`} className="font-normal">{headerNames[key] || key}</Label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button onClick={handleExport}>Export CSV</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog open={isCompareDialogOpen} onOpenChange={setCompareDialogOpen}>
              <DialogTrigger asChild>
                  <Button size="sm" variant="outline" disabled={selectedProducts.length === 0}>
                      <Copy className="mr-2 h-4 w-4" />
                      Compare Selected ({selectedProducts.length})
                  </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl h-[90vh]">
                  <DialogHeader>
                      <DialogTitle>Compare Products</DialogTitle>
                      <DialogDescription>
                          View selected products side-by-side.
                      </DialogDescription>
                  </DialogHeader>
                  <ProductCompare productIds={selectedProducts} />
                  <DialogFooter>
                      <DialogClose asChild>
                          <Button>Close</Button>
                      </DialogClose>
                  </DialogFooter>
              </DialogContent>
            </Dialog>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline">
                  <View className="mr-2 h-4 w-4" />
                  View
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {masterTableKeys.map(key => (
                  <DropdownMenuCheckboxItem
                    key={key}
                    checked={!!adminTableVisibleFields[key]}
                    onCheckedChange={() => toggleAdminTableFieldVisibility(key)}
                    onSelect={(e) => e.preventDefault()}
                  >
                    {headerNames[key] || key}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Dialog open={isAddColumnDialogOpen} onOpenChange={setAddColumnDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Column
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Column</DialogTitle>
                  <DialogDescription>
                    Enter a name for the new column. This will be added to all existing products.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <Input 
                    placeholder="e.g. SKU, Stock, etc."
                    value={newColumnName}
                    onChange={(e) => setNewColumnName(e.target.value)}
                  />
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline" disabled={isAddingColumn}>Cancel</Button>
                    </DialogClose>
                    <Button onClick={handleAddColumn} disabled={isAddingColumn}>
                        {isAddingColumn && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Add Column
                    </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={isDeleteColumnDialogOpen} onOpenChange={setDeleteColumnDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="destructive" disabled={deletableColumns.length === 0}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Column
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete Column</DialogTitle>
                  <DialogDescription>
                    Select the column you want to permanently delete from all products. This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <Select value={columnToDelete} onValueChange={setColumnToDelete}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a column to delete" />
                    </SelectTrigger>
                    <SelectContent>
                      {deletableColumns.map(col => (
                        <SelectItem key={col} value={col}>{headerNames[col] || col}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline" disabled={isDeletingColumn}>Cancel</Button>
                  </DialogClose>
                  <Button onClick={handleDeleteColumn} disabled={isDeletingColumn || !columnToDelete} variant="destructive">
                    {isDeletingColumn && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Delete Column
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={isReorderDialogOpen} onOpenChange={setReorderDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Columns className="mr-2 h-4 w-4" />
                  Reorder
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Reorder Columns</DialogTitle>
                  <DialogDescription>
                    Click the arrows to change the order of the columns.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-2 max-h-96 overflow-y-auto">
                  {localColumnOrder.map((key, index) => (
                    <div key={key} className="flex items-center justify-between p-2 border rounded-md">
                      <span className="font-medium">{headerNames[key] || key}</span>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveColumn(index, 'up')} disabled={index === 0}>
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveColumn(index, 'down')} disabled={index === localColumnOrder.length - 1}>
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button onClick={handleSaveColumnOrder}>Save Order</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            <Dialog open={isHomePageSettingsOpen} onOpenChange={setIsHomePageSettingsOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Settings className="mr-2 h-4 w-4" />
                  Home Page View
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Customize Home Page View</DialogTitle>
                  <DialogDescription>
                    Choose which product fields to display on the home page cards and in what order.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-8 py-4">
                    <div className="space-y-4">
                        <h4 className="font-semibold">Visible Fields</h4>
                        <div className="space-y-2">
                          {homePageConfigurableFields.map((key) => (
                                <div key={key} className="flex items-center space-x-2">
                                <Checkbox
                                    id={`visibility-${key}`}
                                    checked={!!homePageVisibleFields[key]}
                                    onCheckedChange={() => toggleHomePageFieldVisibility(key)}
                                />
                                <Label htmlFor={`visibility-${key}`} className="font-normal">
                                    {headerNames[key] || key}
                                </Label>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-4">
                        <h4 className="font-semibold">Field Order</h4>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {localHomePageOrder.map((key, index) => (
                                <div key={key} className="flex items-center justify-between p-2 border rounded-md">
                                <span className="font-medium">{headerNames[key] || key}</span>
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveHomePageField(index, 'up')} disabled={index === 0}>
                                    <ArrowUp className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveHomePageField(index, 'down')} disabled={index === localHomePageOrder.length - 1}>
                                    <ArrowDown className="h-4 w-4" />
                                    </Button>
                                </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button onClick={handleSaveHomePageOrder}>Save Settings</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button asChild size="sm">
              <Link href="/admin/products/new">
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Product
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
            {productsLoading ? (
                <div className="flex justify-center items-center h-48">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
              <AlertDialog>
                <div className="relative w-full overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead padding="checkbox">
                        <Checkbox
                           checked={allVisibleSelected}
                           onCheckedChange={handleSelectAllToggle}
                           aria-label="Select all"
                        />
                      </TableHead>
                      {visibleProductKeys.map(key => renderHeader(key))}
                      <TableHead>
                        <span className="sr-only">Actions</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedAndFilteredProducts.map((product) => (
                      <TableRow 
                        key={product.productId}
                        data-state={selectedProducts.includes(product.productId) && "selected"}
                      >
                         <TableCell padding="checkbox">
                            <Checkbox
                              checked={selectedProducts.includes(product.productId)}
                              onCheckedChange={() => toggleProductSelection(product.productId)}
                              aria-label="Select row"
                            />
                        </TableCell>
                        {visibleProductKeys.map(key => {
                          if (key === 'qtyForQuote') {
                            return (
                              <TableCell key={key}>
                                <Input 
                                  type="number"
                                  min="0"
                                  defaultValue={product.qtyForQuote || 0}
                                  onBlur={(e) => handleQtyChange(product.productId, e.target.value)}
                                  className="w-20"
                                />
                              </TableCell>
                            );
                          }
                          if (key === 'quoteTotal') {
                             const quoteTotal = (product.qtyForQuote || 0) * (product.price || 0);
                             return (
                               <TableCell key={key} className="text-right">
                                  {quoteTotal > 0 ? `₹${quoteTotal.toFixed(2)}` : '-'}
                                </TableCell>
                             )
                          }
                          return (
                            <TableCell key={key} className={key === 'productId' ? 'font-mono text-xs' : ''}>
                               {String(product[key as keyof Product] ?? '')}
                            </TableCell>
                          )
                        })}
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button aria-haspopup="true" size="icon" variant="ghost">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Toggle menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem asChild>
                                <Link href={`/admin/products/${product.productId}/edit`}>Edit</Link>
                              </DropdownMenuItem>
                               <DropdownMenuItem onSelect={() => handleAddToQuote(product as Product)}>
                                <FilePlus className="mr-2 h-4 w-4" />
                                Add to Quote
                              </DropdownMenuItem>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem className="text-destructive" onSelect={(e) => {e.preventDefault(); setDeleteTarget(product.productId);}}>
                                  Delete
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
                
                <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the product.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => setDeleteTarget(null)}>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                          Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
        </CardContent>
      </Card>
      
      <PriceBookTable />
    </div>
  );
}
