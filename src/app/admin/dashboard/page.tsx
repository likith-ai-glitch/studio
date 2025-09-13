
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useProducts } from '@/context/product-context';
import { useOrders } from '@/context/order-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { MoreHorizontal, PlusCircle, IndianRupee, Package, ShoppingCart, ArrowUpDown, Loader2, PackageCheck, PackageX, Trash2, Pencil, ArrowUp, ArrowDown, Columns, Settings, View, FilePlus } from 'lucide-react';
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
import { useQuote } from '@/context/quote-context';
import { useToast } from '@/hooks/use-toast';

export default function DashboardPage() {
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
  } = useProducts();
  const { orders } = useOrders();
  const { addItemToQuote, setIsQuoteSheetOpen } = useQuote();
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
  
  useEffect(() => {
    setLocalColumnOrder(productKeys);
  }, [productKeys]);

  useEffect(() => {
    setLocalHomePageOrder(homePageFieldOrder);
  }, [homePageFieldOrder]);

  // Clear selection when navigating away or data reloads
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
  
  const visibleProductKeys = useMemo(() => {
    return productKeys.filter(key => adminTableVisibleFields[key]);
  }, [productKeys, adminTableVisibleFields]);


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
            bValue = (b.qtyForQuote || 0) * (a.price || 0);
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

  const visibleFilteredProductIds = useMemo(() => sortedAndFilteredProducts.map(p => p.productId), [sortedAndFilteredProducts]);

  const allVisibleSelected = useMemo(() => {
    if (selectedProducts.length === 0) return false;
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

      <Card>
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <CardTitle>Product Master (prd_master)</CardTitle>
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <Input
                placeholder="Filter products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-auto md:w-48"
              />
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
                {productKeys.map(key => (
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
    </div>
  );
}
