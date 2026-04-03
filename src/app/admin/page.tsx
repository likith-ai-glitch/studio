'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useProducts } from '@/context/product-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { MoreHorizontal, PlusCircle, ArrowUpDown, Loader2, Trash2, Pencil, ArrowUp, ArrowDown, Columns, Settings, View, Copy, Upload, Download, X, Save } from 'lucide-react';
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
import { ProductCompare } from '@/components/product-compare';
import { useQuote } from '@/context/quote-context';
import { useToast } from '@/hooks/use-toast';
import Papa from 'papaparse';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { PriceBookTable } from '@/components/price-book-table';

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
    selectedProducts,
    toggleProductSelection,
    toggleSelectAllProducts,
    clearSelection,
    addProductsBulk,
  } = useProducts();
  const { quote, clearQuote, saveQuoteToFirestore } = useQuote();
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

  const deletableColumns = useMemo(() => {
    return productKeys.filter(k => k !== 'productId' && k !== 'quoteTotal' && k !== 'qtyForQuote');
  }, [productKeys]);
  
  const homePageConfigurableFields = useMemo(() => {
    return productKeys.filter(k => !['productId', 'quoteTotal', 'qtyForQuote'].includes(k));
  }, [productKeys]);
  
  const masterTableKeys = useMemo(() => {
    const priceListColumns = ['priceList1', 'priceList2', 'priceList3', 'priceList4', 'priceList5', 'activePriceList'];
    const quoteColumns = ['qtyForQuote', 'quoteTotal'];
    return productKeys.filter(key => !priceListColumns.includes(key) && !quoteColumns.includes(key));
  }, [productKeys]);

  const visibleProductKeys = useMemo(() => {
    return masterTableKeys.filter(key => adminTableVisibleFields[key]);
  }, [masterTableKeys, adminTableVisibleFields]);

  const isBuildingQuote = !!(quote.masterQuoteId || quote.isMaster);

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

    if (quote.isMaster) {
      sortableProducts = sortableProducts.filter(p => p.isMasterProduct === true);
    }

    return sortableProducts;
  }, [products, searchTerm, sortConfig, quote.isMaster]);

  const handleProductSelection = useCallback((productId: string) => {
      toggleProductSelection(productId);
  }, [toggleProductSelection]);

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
          let value = product[field as keyof Product] as any;
          
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
        description: `${mappedData.length} products imported.`,
      });
    } catch (error: any) {
      toast({
        title: "Import Failed",
        description: error.message,
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

    return (
        <TableHead key={key}>
            <div className="flex items-center gap-2">
                <button className="flex items-center gap-1" onClick={() => requestSort(key)}>
                    {headerText} <ArrowUpDown className="inline-block h-4 w-4" />
                </button>
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
                        </DialogHeader>
                        <div className="py-4">
                            <Input
                                value={newHeaderName}
                                onChange={(e) => setNewHeaderName(e.target.value)}
                                placeholder="New column name"
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
      {quote.masterQuoteId && (
        <Alert className="bg-primary/10 border-primary ring-1 ring-primary/20">
          <Info className="h-4 w-4 text-primary" />
          <AlertTitle className="font-bold text-primary">Building Vendor Child Quote</AlertTitle>
          <AlertDescription className="flex justify-between items-center text-primary-foreground">
            <span className="text-muted-foreground">Select multiple products below or set quantities. Click Save to link this quote to the Master.</span>
            <div className="flex gap-2">
                <Button variant="default" size="sm" onClick={handleSaveActiveQuote} disabled={isSaving || quote.items.length === 0} className="bg-green-600 hover:bg-green-700 text-white font-bold border-none">
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                    Save Quote ({quote.items.length})
                </Button>
                <Button variant="outline" size="sm" onClick={() => clearQuote()} className="border-primary text-primary hover:bg-primary/20">
                    <X className="h-4 w-4 mr-1" /> Cancel
                </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {quote.isMaster && (
        <Alert className="bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertTitle className="font-bold text-blue-800">Building Master Quote</AlertTitle>
          <AlertDescription className="text-blue-700">
            Only <strong>Master Products</strong> are visible in the table below. Set quantities to add them to your baseline.
          </AlertDescription>
        </Alert>
      )}

      <Card className={cn(isBuildingQuote && "border-primary ring-1 ring-primary/20 shadow-md")}>
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <CardTitle>Product Master (prd_master)</CardTitle>
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {isBuildingQuote && (
                <Button 
                    size="sm" 
                    onClick={handleSaveActiveQuote} 
                    disabled={isSaving || quote.items.length === 0}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold"
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
                </DialogHeader>

                {importStep === 'selectFile' ? (
                  <div className="py-4 flex flex-col items-center justify-center border-2 border-dashed rounded-lg h-48">
                    <Input type="file" accept=".csv" onChange={handleFileSelect} ref={fileInputRef} className="hidden" id="csv-upload" />
                    <Label htmlFor="csv-upload" className="cursor-pointer">
                      <div className="text-center">
                        <Upload className="mx-auto h-10 w-10 text-muted-foreground" />
                        {isImporting ? <p className="mt-2">Analyzing...</p> : (importFile ? <p className="mt-2 font-medium">{importFile.name}</p> : <p className="mt-2">Drop CSV here</p>)}
                      </div>
                    </Label>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="font-semibold">Map fields:</p>
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
                              <SelectValue placeholder="Select field" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Ignore</SelectItem>
                              <DropdownMenuSeparator />
                              {productKeys.filter(k => k !== 'quoteTotal' && k !== 'qtyForQuote').map(key => (
                                <SelectItem key={key} value={key}>{headerNames[key] || key}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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
                      Import
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
                      Compare ({selectedProducts.length})
                  </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl h-[90vh]">
                  <DialogHeader>
                      <DialogTitle>Compare Products</DialogTitle>
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
                <DropdownMenuLabel>Columns</DropdownMenuLabel>
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
                    Add Col
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New Column</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                  <Input 
                    placeholder="Column Name"
                    value={newColumnName}
                    onChange={(e) => setNewColumnName(e.target.value)}
                  />
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline" disabled={isAddingColumn}>Cancel</Button>
                    </DialogClose>
                    <Button onClick={handleAddColumn} disabled={isAddingColumn}>
                        Add Column
                    </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={isDeleteColumnDialogOpen} onOpenChange={setDeleteColumnDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="destructive" disabled={deletableColumns.length === 0}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Del Col
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete Column</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                  <Select value={columnToDelete} onValueChange={setColumnToDelete}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select column" />
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
                    Delete
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
                </DialogHeader>
                <div className="py-4 space-y-2 max-h-96 overflow-y-auto">
                  {localColumnOrder.map((key, index) => (
                    <div key={key} className="flex items-center justify-between p-2 border rounded-md">
                      <span className="font-medium">{headerNames[key] || key}</span>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveColumn(index, 'up')} disabled={index === 0}>
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveHomePageField(index, 'down')} disabled={index === localColumnOrder.length - 1}>
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
                  Home Settings
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Customize Home Page</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-8 py-4">
                    <div className="space-y-4">
                        <h4 className="font-semibold">Visibility</h4>
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
                        <h4 className="font-semibold">Order</h4>
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
                    {sortedAndFilteredProducts.map((product) => {
                      const isSelected = selectedProducts.includes(product.productId);

                      return (
                        <TableRow 
                          key={product.productId}
                          data-state={isSelected && "selected"}
                        >
                           <TableCell padding="checkbox">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => handleProductSelection(product.productId)}
                                aria-label="Select row"
                              />
                          </TableCell>
                          {visibleProductKeys.map(key => {
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
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem asChild>
                                  <Link href={`/admin/products/${product.productId}/edit`}>Edit</Link>
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
                      );
                    })}
                  </TableBody>
                </Table>
                </div>
                
                <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete the product.
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
