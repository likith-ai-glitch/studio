'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useProducts } from '@/context/product-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Loader2, Pencil, BookCopy, Percent } from 'lucide-react';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { debounce } from 'lodash';

export function PriceBookTable() {
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
      debounce(async (productId: string, field: string, value: number, activePriceList?: string) => {
        try {
          const updates: Record<string, any> = { [field]: value };
          // Sync with the main unit price if this is the active price list
          if (activePriceList === field) {
            updates.price = value;
          }
          await updateProductField(productId, updates);
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

  const handlePriceChange = (productId: string, field: string, value: string, activePriceList: string) => {
    const price = parseFloat(value);
    if (!isNaN(price) && price >= 0) {
      debouncedUpdate(productId, field, price, activePriceList);
    } else if (value === '') {
      debouncedUpdate(productId, field, 0, activePriceList);
    }
  };
  
  const handlePercentageChange = (productId: string, field: string, percentageStr: string, activePriceList: string) => {
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
    debouncedUpdate(productId, field, parseFloat(newPrice.toFixed(2)), activePriceList);
  }

  const handleActivePriceChange = async (productId: string, activePriceList: string) => {
    const product = products.find(p => p.productId === productId);
    if (!product) return;

    const newPrice = product[activePriceList as keyof Product] as number || 0;

    // Batch update both active state and the main price field
    await updateProductField(productId, {
        price: newPrice,
        activePriceList: activePriceList
    });
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
                <button 
                    className="p-1 hover:bg-muted rounded-full text-muted-foreground transition-colors"
                    onClick={() => {
                        setColumnToRename(field);
                        setNewHeaderName(headerText);
                    }}
                >
                    <Pencil className="h-3 w-3" />
                </button>
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
                                onChange={(e) => handlePriceChange(product.productId, 'priceList1', e.target.value, product.activePriceList)}
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
                                  onChange={(e) => handlePercentageChange(product.productId, field as string, e.target.value, product.activePriceList)}
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

      {/* Rename Column Dialog */}
      <Dialog open={!!columnToRename} onOpenChange={(isOpen) => !isOpen && setColumnToRename(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Rename Column</DialogTitle>
                <DialogDescription>
                    Change the display name for this price list.
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
    </Card>
  );
}
