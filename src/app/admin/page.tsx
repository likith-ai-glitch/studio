
'use client';

import React, { useState, useMemo } from 'react';
import { useProducts } from '@/context/product-context';
import { useOrders } from '@/context/order-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { MoreHorizontal, PlusCircle, IndianRupee, Package, ShoppingCart, ArrowUpDown, Loader2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
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
} from "@/components/ui/alert-dialog";
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { subDays, format } from 'date-fns';
import type { Product } from '@/lib/types';
import type { DropdownMenuItemProps } from '@radix-ui/react-dropdown-menu';

const AlertDialogTriggerMenuItem = React.forwardRef<HTMLDivElement, DropdownMenuItemProps>(
  (props, ref) => <DropdownMenuItem {...props} ref={ref} onSelect={(e) => e.preventDefault()} />
);
AlertDialogTriggerMenuItem.displayName = 'AlertDialogTriggerMenuItem';


export default function AdminPage() {
  const { products, deleteProduct, loading: productsLoading } = useProducts();
  const { orders } = useOrders();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Product | 'id' | null; direction: 'ascending' | 'descending' }>({ key: 'price', direction: 'ascending' });
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
  const totalSales = orders.length;

  const salesData = Array.from({ length: 7 }).map((_, i) => {
    const date = subDays(new Date(), i);
    const dailySales = orders
      .filter(order => format(order.orderDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd'))
      .reduce((sum, order) => sum + order.total, 0);
    return {
      name: format(date, 'MMM d'),
      total: dailySales,
    };
  }).reverse();

  const sortedAndFilteredProducts = useMemo(() => {
    let sortableProducts = [...products];

    if (searchTerm) {
        const lowercasedFilter = searchTerm.toLowerCase();
        sortableProducts = sortableProducts.filter(product => {
            return (
              product.id.toString().includes(lowercasedFilter) ||
              product.name.toLowerCase().includes(lowercasedFilter) ||
              product.category.toLowerCase().includes(lowercasedFilter) ||
              product.brand.toLowerCase().includes(lowercasedFilter) ||
              product.color.toLowerCase().includes(lowercasedFilter)
            );
        });
    }

    if (sortConfig.key) {
      sortableProducts.sort((a, b) => {
        const key = sortConfig.key as keyof Product; 
        if (a[key] < b[key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[key] > b[key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }

    return sortableProducts;
  }, [products, searchTerm, sortConfig]);

  const requestSort = (key: keyof Product | 'id') => {
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

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <h1 className="text-4xl font-bold font-headline">Dashboard</h1>
      </header>

      <Card>
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <CardTitle>Product List</CardTitle>
          <div className="flex items-center gap-4 w-full md:w-auto">
             <Input
                placeholder="Filter products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full md:w-64"
              />
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="hidden md:table-cell">Image</TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Color</TableHead>
                <TableHead className="hidden md:table-cell cursor-pointer" onClick={() => requestSort('price')}>
                  Price <ArrowUpDown className="inline-block ml-1 h-4 w-4" />
                </TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAndFilteredProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="hidden md:table-cell">
                    <Image
                      alt={product.name}
                      className="aspect-square rounded-md object-cover"
                      height="64"
                      src={product.image || 'https://placehold.co/64x64.png'}
                      width="64"
                    />
                  </TableCell>
                  <TableCell className="font-mono text-xs">{product.id.toString().substring(0, 8)}...</TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>{product.category}</TableCell>
                  <TableCell>{product.brand}</TableCell>
                  <TableCell>{product.color}</TableCell>
                  <TableCell className="hidden md:table-cell">₹{product.price.toFixed(2)}</TableCell>
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
                           <Link href={`/admin/products/${product.id}/edit`}>Edit</Link>
                        </DropdownMenuItem>
                        <AlertDialogTriggerMenuItem className="text-destructive" onClick={() => setDeleteTarget(product.id.toString())}>
                          Delete
                        </AlertDialogTriggerMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          )}
        </CardContent>
      </Card>
      
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the product.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
      </div>

       <Card>
        <CardHeader>
          <CardTitle>Sales This Week</CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={salesData}>
               <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
               <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value}`} />
               <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 'var(--radius)',
                }}
                labelStyle={{
                   color: 'hsl(var(--foreground))'
                }}
               />
              <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4, fill: 'hsl(var(--primary))' }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      
    </div>
  );
}
