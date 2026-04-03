'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, updateDoc, onSnapshot, getDocs, writeBatch } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ArrowLeft, Plus, Lock, History, Link2, ChevronDown, ChevronUp, Package, PlusCircle, Trash2, Link2Off } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuote } from '@/context/quote-context';
import type { Quote, QuoteLifecycleStatus } from '@/lib/types';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
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

export default function MasterQuoteDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { startNewChildQuote, loadQuoteForEditing } = useQuote();
  const [masterQuote, setMasterQuote] = useState<Quote | null>(null);
  const [childQuotes, setChildQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [expandedChildId, setExpandedChildId] = useState<string | null>(null);
  const [quoteToDelete, setQuoteToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const unsubMaster = onSnapshot(doc(db, 'quotes', id as string), (docSnap) => {
      if (docSnap.exists()) {
        setMasterQuote({ id: docSnap.id, ...docSnap.data() } as Quote);
      } else {
        toast({ title: "Error", description: "Master Quote not found", variant: "destructive" });
        router.push('/admin/master-quotes');
      }
      setLoading(false);
    });

    const qChild = query(collection(db, 'quotes'), where('masterQuoteId', '==', id));
    const unsubChild = onSnapshot(qChild, (snapshot) => {
      const quotes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Quote[];
      setChildQuotes(quotes);
    });

    return () => {
      unsubMaster();
      unsubChild();
    };
  }, [id, router, toast]);

  const handleUpdateLifecycle = async (status: QuoteLifecycleStatus) => {
    if (!id || !masterQuote) return;
    setIsUpdating(true);
    try {
      await updateDoc(doc(db, 'quotes', id as string), { lifecycleStatus: status });
      toast({ title: "Status Updated", description: `Lifecycle changed to ${status}` });
    } catch (error: any) {
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
  };

  const removeChildQuote = async (childId: string) => {
    if (masterQuote?.lifecycleStatus === 'Locked' || masterQuote?.lifecycleStatus === 'InProgress') {
      toast({ title: "Action Restricted", description: `Cannot detach quotes while ${masterQuote?.lifecycleStatus}.`, variant: "destructive" });
      return;
    }
    try {
      await updateDoc(doc(db, 'quotes', childId), { masterQuoteId: null });
      toast({ title: "Child Quote Detached", description: "The link has been successfully removed." });
      if (expandedChildId === childId) setExpandedChildId(null);
    } catch (error: any) {
      toast({ title: "Detachment Failed", description: error.message, variant: "destructive" });
    }
  };

  const deleteChildQuote = async () => {
    if (!quoteToDelete) return;
    setIsUpdating(true);
    try {
        const batch = writeBatch(db);
        
        // Delete child quote doc
        batch.delete(doc(db, 'quotes', quoteToDelete));
        
        // Delete child quote line items
        const qliQuery = query(collection(db, 'quoteLineItems'), where('QuoteId', '==', quoteToDelete));
        const qliSnap = await getDocs(qliQuery);
        qliSnap.forEach(d => batch.delete(d.ref));

        await batch.commit();
        toast({ title: "Quote Deleted", description: "The vendor quote and its products were removed." });
        if (expandedChildId === quoteToDelete) setExpandedChildId(null);
    } catch (error: any) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
        setIsUpdating(false);
        setQuoteToDelete(null);
    }
  };

  const handleCreateNewChild = () => {
    if (masterQuote) {
      startNewChildQuote(masterQuote.id!, masterQuote.Name || masterQuote.quoteNumber);
      router.push('/admin');
    }
  };

  const handleGoToDocumentsForLinking = () => {
    router.push(`/admin/documents?linkingTo=${id}`);
  };

  const toggleExpand = (childId: string) => {
    setExpandedChildId(expandedChildId === childId ? null : childId);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const isLocked = masterQuote?.lifecycleStatus === 'Locked';
  const isInProgress = masterQuote?.lifecycleStatus === 'InProgress';

  return (
    <div className="space-y-8 pb-20 max-w-5xl mx-auto">
      <header className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.push('/admin/master-quotes')}>
                <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
                <h1 className="text-3xl md:text-4xl font-bold font-headline">
                    Master Quote: {masterQuote?.Name || masterQuote?.quoteNumber}
                </h1>
                <p className="text-muted-foreground mt-1 text-sm font-mono">ID: {masterQuote?.id}</p>
            </div>
        </div>
        <div className="flex gap-4 items-center bg-card p-4 rounded-lg shadow-sm border w-full md:w-auto">
            <div className="text-right mr-4 flex-grow md:flex-grow-0">
                <Label className="text-xs uppercase text-muted-foreground">Lifecycle</Label>
                <p className="font-bold flex items-center gap-2 mt-1 justify-end">
                    {isLocked ? <Lock className="h-4 w-4 text-destructive" /> : <History className="h-4 w-4 text-secondary" />}
                    {masterQuote?.lifecycleStatus || 'Draft'}
                </p>
            </div>
            <Select 
                value={masterQuote?.lifecycleStatus || 'Draft'} 
                onValueChange={(val) => handleUpdateLifecycle(val as QuoteLifecycleStatus)} 
                disabled={isUpdating}
            >
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="Draft">Draft (Editable)</SelectItem>
                    <SelectItem value="InProgress">InProgress (Reviewing)</SelectItem>
                    <SelectItem value="Locked">Locked (Closed)</SelectItem>
                </SelectContent>
            </Select>
        </div>
      </header>

      <Card>
          <CardHeader>
              <CardTitle className="flex justify-between items-center text-lg">
                  Child Quotes ({childQuotes.length})
                  {!isLocked && (
                      <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={handleGoToDocumentsForLinking}>
                              <Link2 className="mr-2 h-4 w-4" />
                          </Button>
                          <Button size="sm" onClick={handleCreateNewChild}>
                              <Plus className="h-4 w-4" />
                          </Button>
                      </div>
                  )}
              </CardTitle>
          </CardHeader>
          <CardContent className="px-2">
              <AlertDialog>
                <div className="space-y-3">
                    {childQuotes.length > 0 ? childQuotes.map(quote => {
                        const isExpanded = expandedChildId === quote.id;
                        return (
                            <div key={quote.id} className={cn(
                                "border rounded-lg overflow-hidden transition-all",
                                isExpanded ? "ring-2 ring-primary/20 shadow-md bg-card" : "bg-muted/20"
                            )}>
                                <div 
                                    className="p-4 flex justify-between items-center cursor-pointer hover:bg-muted/40"
                                    onClick={() => toggleExpand(quote.id!)}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="bg-primary/10 p-2 rounded-full">
                                            <Package className="h-4 w-4 text-primary" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm">{quote.Name || quote.quoteNumber}</p>
                                            <p className="text-xs text-muted-foreground">₹{quote.totalPrice?.toFixed(2)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                                    </div>
                                </div>
                                
                                {isExpanded && (
                                    <div className="p-4 border-t bg-card space-y-4 animate-in slide-in-from-top-2">
                                        <div className="space-y-2">
                                            <p className="text-xs font-bold uppercase text-muted-foreground px-1">Quote Items</p>
                                            <div className="border rounded-md overflow-hidden">
                                                <Table>
                                                    <TableHeader className="bg-muted/50">
                                                        <TableRow className="h-8">
                                                            <TableHead className="text-[10px] h-8">Product / Brand</TableHead>
                                                            <TableHead className="text-[10px] text-center h-8">Qty</TableHead>
                                                            <TableHead className="text-[10px] text-right h-8">Price</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {quote.items.map((item, idx) => (
                                                            <TableRow key={idx} className="h-10">
                                                                <TableCell className="py-1 text-xs font-medium">
                                                                    <div>{item.name}</div>
                                                                    {item.brand && <div className="text-[10px] text-muted-foreground font-normal">{item.brand}</div>}
                                                                </TableCell>
                                                                <TableCell className="py-1 text-xs text-center">{item.quantity}</TableCell>
                                                                <TableCell className="py-1 text-xs text-right">₹{Number(item.price).toFixed(2)}</TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-2 pt-2">
                                            <div className="flex justify-between items-center px-1">
                                                <p className="text-sm font-bold">Total Quote Amount</p>
                                                <p className="text-lg font-bold text-primary">₹{quote.totalPrice?.toFixed(2)}</p>
                                            </div>
                                            <Separator className="my-2" />
                                            <div className="flex justify-between items-center gap-2">
                                                <Badge variant="outline">{quote.status}</Badge>
                                                <div className="flex gap-2">
                                                    {!isLocked && (
                                                        <Button variant="outline" size="sm" className="h-8" onClick={(e) => { e.stopPropagation(); loadQuoteForEditing(quote.id!); }}>
                                                            <PlusCircle className="mr-2 h-4 w-4" />
                                                            Add Products
                                                        </Button>
                                                    )}
                                                    {!isLocked && !isInProgress && (
                                                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); removeChildQuote(quote.id!); }} className="text-muted-foreground h-8 px-2">
                                                            <Link2Off className="mr-2 h-4 w-4" />
                                                            Detach
                                                        </Button>
                                                    )}
                                                    {!isLocked && (
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setQuoteToDelete(quote.id!); }} className="text-destructive h-8 px-2">
                                                                <Trash2 className="mr-2 h-4 w-4" />
                                                                Delete
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    }) : (
                        <div className="text-center py-10 text-sm text-muted-foreground border-2 border-dashed rounded-lg">
                            No vendor quotes linked yet.
                        </div>
                    )}
                </div>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Vendor Quote?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete this vendor submission and its line items. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setQuoteToDelete(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={deleteChildQuote} className="bg-destructive hover:bg-destructive/90" disabled={isUpdating}>
                            {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete Permanently"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
          </CardContent>
      </Card>
    </div>
  );
}
