
'use client';

import { useProducts } from '@/context/product-context';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Product } from '@/lib/types';
import { Input } from './ui/input';

interface ProductCompareProps {
  productIds: string[];
}

export function ProductCompare({ productIds }: ProductCompareProps) {
  const { products, productKeys, headerNames, updateProductField } = useProducts();

  const selectedProducts = products.filter(p => productIds.includes(p.productId));

  const handleQtyChange = (productId: string, newQty: string) => {
    const quantity = parseInt(newQty, 10);
    if (!isNaN(quantity) && quantity >= 0) {
        updateProductField(productId, 'qtyForQuote', quantity);
    }
  }

  const renderValue = (product: Product, key: string) => {
    if (key === 'qtyForQuote') {
        return (
            <Input 
              type="number"
              min="0"
              defaultValue={product.qtyForQuote || 0}
              onBlur={(e) => handleQtyChange(product.productId, e.target.value)}
              className="w-20"
            />
        );
    }
    if (key === 'quoteTotal') {
        const quoteTotal = (product.qtyForQuote || 0) * (product.price || 0);
        return quoteTotal > 0 ? `₹${quoteTotal.toFixed(2)}` : '-';
    }
    return String(product[key as keyof Product] ?? 'N/A');
  };

  return (
    <ScrollArea className="h-full w-full">
      <Table>
        <TableHeader className="sticky top-0 bg-background">
          <TableRow>
            <TableHead className="w-[150px] font-bold">Feature</TableHead>
            {selectedProducts.map(product => (
              <TableHead key={product.productId} className="font-bold">{product.name}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {productKeys.map(key => (
            <TableRow key={key}>
              <TableCell className="font-semibold text-muted-foreground">{headerNames[key] || key}</TableCell>
              {selectedProducts.map(product => (
                <TableCell key={product.productId}>{renderValue(product, key)}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}
