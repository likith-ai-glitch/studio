
'use client';

import React, { useState, useMemo } from 'react';
import { useProducts } from '@/context/product-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { debounce } from 'lodash';

export default function PriceBookPage() {
  const { products, loading, updateProductField } = useProducts();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');

  const priceFields: (keyof typeof products[0])[] = useMemo(() => 
    ['priceList1', 'priceList2', 'priceList3', 'priceList4', 'priceList5'], 
  []);

  const filteredProducts = useMemo(() => {
    return products.filter((product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.productId.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm]);

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

  const handlePriceChange = (
    productId: string,
    field: string,
    value: string
  ) => {
    const price = parseFloat(value);
    if (!isNaN(price) && price >= 0) {
      debouncedUpdate(productId, field, price);
    } else if (value === '') {
      debouncedUpdate(productId, field, 0);
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-4xl font-bold font-headline">Price Book</h1>
        <p className="text-lg text-muted-foreground mt-2">Manage different price lists for your products.</p>
      </header>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Product Prices</CardTitle>
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
                    {priceFields.map((field, index) => (
                      <TableHead key={field} className="text-right min-w-[150px]">
                        Price List {index + 1}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.length > 0 ? (
                    filteredProducts.map((product) => (
                      <TableRow key={product.productId}>
                        <TableCell className="font-mono text-xs">{product.productId}</TableCell>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        {priceFields.map((field) => (
                          <TableCell key={field} className="text-right">
                            <Input
                              type="number"
                              defaultValue={product[field] || ''}
                              onChange={(e) => handlePriceChange(product.productId, field, e.target.value)}
                              className="w-28 text-right ml-auto"
                              placeholder="0.00"
                              min="0"
                              step="0.01"
                            />
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
    </div>
  );
}
