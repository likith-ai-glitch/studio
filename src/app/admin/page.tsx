
'use client';

import React, { useState, useMemo } from 'react';
import { useProducts } from '@/context/product-context';
import { useOrders } from '@/context/order-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { MoreHorizontal, PlusCircle, IndianRupee, Package, ShoppingCart, ArrowUpDown, Loader2, PackageCheck, PackageX } from 'lucide-react';
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
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { subDays, format } from 'date-fns';
import type { Product } from '@/lib/types';
import type { DropdownMenuItemProps } from '@radix-ui/react-dropdown-menu';

const AlertDialogTriggerMenuItem = React.forwardRef<HTMLDivElement, DropdownMenuItemProps>(
  (props, ref) => <DropdownMenuItem {...props} ref={ref} onSelect={(e) => e.preventDefault()} />
);
AlertDialogTriggerMenuItem.displayName = 'AlertDialogTriggerMenuItem';


export default function AdminPage() {
  const { products, deleteProduct, addColumn, loading: productsLoading } = useProducts();
  const { orders } = useOrders();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Product | string | null; direction: 'ascending' | 'descending' }>({ key: 'price', direction: 'ascending' });
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [newColumnName, setNewColumnName] = useState('');
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [isAddColumnDialogOpen, setAddColumnDialogOpen] = useState(false);

  const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
  const totalSales = orders.length;

  const availableProducts = useMemo(() => {
    return products.filter(p => p.status === 'Available').length;
  }, [products]);
  const unavailableProducts = products.length - availableProducts;

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

  const productKeys = useMemo(() => {
    if (products.length === 0) return [];
    const keys = new Set<string>();
    products.forEach(p => Object.keys(p).forEach(k => keys.add(k)));
    const fixedOrder = ['id', 'name', 'category', 'brand', 'color', 'price'];
    const dynamicKeys = Array.from(keys).filter(k => !fixedOrder.includes(k) && k !== 'description' && k !== 'image');
    return [...fixedOrder, ...dynamicKeys];
  }, [products]);

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
        const aValue = a[key as keyof Product] ?? '';
        const bValue = b[key as keyof Product] ?? '';

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

  const renderHeader = (key: string) => (
    <TableHead>
        <button className="flex items-center gap-1" onClick={() => requestSort(key)}>
            {key.charAt(0).toUpperCase() + key.slice(1)} <ArrowUpDown className="inline-block h-4 w-4" />
        </button>
    </TableHead>
  );

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <h1 className="text-4xl font-bold font-headline">Dashboard</h1>
      </header>

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
               Products not available
            </p>
          </CardContent>
        </Card>
      </div>

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
                {productKeys.map(key => renderHeader(key))}
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAndFilteredProducts.map((product) => (
                <TableRow key={product.id}>
                  {productKeys.map(key => (
                     <TableCell key={key} className={key === 'id' ? 'font-mono text-xs' : ''}>
                       {key === 'id' ? product.id.substring(0,8) + '...' : String(product[key as keyof Product] ?? '')}
                     </TableCell>
                  ))}
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
