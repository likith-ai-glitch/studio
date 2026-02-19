
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, onSnapshot } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ArrowLeft, Plus, CheckCircle2, Lock, History, Search, FilePlus, Link2, ChevronDown, ChevronUp, Package, PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuote } from '@/context/quote-context';
import type { Quote, QuoteLifecycleStatus } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

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
    if (masterQuote?.lifecycleStatus === 'Locked') {
      toast({ title: "Master Locked", description: "Cannot detach quotes while locked.", variant: "destructive" });
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

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.push('/admin/master-quotes')}>
                <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
                <h1 className="text-3xl md:text-4xl font-bold font-headline">
                    Master Quote: {masterQuote?.Name || masterQuote?.quoteNumber}
                </h1>
                <p className="text-muted-foreground mt-1">ID: {masterQuote?.id}</p>
            </div>
        </div>
        <div className="flex gap-4 items-center bg-card p-4 rounded-lg shadow-sm border w-full md:w-auto">
            <div className="text-right mr-4 flex-grow md:flex-grow-0">
                <Label className="text-xs uppercase text-muted-foreground">Lifecycle</Label>
                <p className="font-bold flex items-center gap-2 mt-1 justify-end">
                    {masterQuote?.lifecycleStatus === 'Locked' ? <Lock className="h-4 w-4 text-destructive" /> : <History className="h-4 w-4 text-secondary" />}
                    {masterQuote?.lifecycleStatus || 'Draft'}
                </p>
            </div>
            <Select 
                value={masterQuote?.lifecycleStatus || 'Draft'} 
                onValueChange={(val) => handleUpdateLifecycle(val as QuoteLifecycleStatus)} 
                disabled={isUpdating}
            >
                <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="Draft">Draft (Editable)</SelectItem>
                    <SelectItem value="InProgress">InProgress</SelectItem>
                    <SelectItem value="Locked">Locked (Read-Only)</SelectItem>
                </SelectContent>
            </Select>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" /> Master Baseline Products
            </CardTitle>
            <CardDescription>
                BASELINE: These products define the core requirements for vendor comparison.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Product Name</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {masterQuote?.items.map((item, idx) => (
                        <TableRow key={idx}>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell className="text-right">₹{Number(item.price).toFixed(2)}</TableCell>
                            <TableCell className="text-right font-semibold">₹{(Number(item.price) * item.quantity).toFixed(2)}</TableCell>
                        </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-bold">
                        <TableCell colSpan={3} className="text-right">Master Quote Total:</TableCell>
                        <TableCell className="text-right text-primary text-lg">₹{masterQuote?.totalPrice?.toFixed(2)}</TableCell>
                    </TableRow>
                </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle className="flex justify-between items-center text-lg">
                        Vendor Comparisons ({childQuotes.length})
                        {masterQuote?.lifecycleStatus !== 'Locked' && (
                            <div className="flex gap-2">
                                <Button size="sm" variant="outline" onClick={handleGoToDocumentsForLinking}>
                                    <Link2 className="h-4 w-4" />
                                </Button>
                                <Button size="sm" onClick={handleCreateNewChild}>
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </CardTitle>
                    <CardDescription>
                        Click a quote to view products and prices.
                    </CardDescription>
                </CardHeader>
                <CardContent className="px-2">
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
                                                <div className="border rounded-md">
                                                    <Table>
                                                        <TableBody>
                                                            {quote.items.map((item, idx) => (
                                                                <TableRow key={idx} className="h-10">
                                                                    <TableCell className="py-1 text-xs font-medium">{item.name}</TableCell>
                                                                    <TableCell className="py-1 text-xs text-center">{item.quantity}</TableCell>
                                                                    <TableCell className="py-1 text-xs text-right">₹{Number(item.price).toFixed(2)}</TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center pt-2 gap-2">
                                                <Badge variant="outline">{quote.status}</Badge>
                                                <div className="flex gap-2">
                                                    <Button variant="outline" size="sm" className="h-8" onClick={(e) => { e.stopPropagation(); loadQuoteForEditing(quote.id!); }}>
                                                        <PlusCircle className="mr-2 h-4 w-4" />
                                                        Add Products
                                                    </Button>
                                                    {masterQuote?.lifecycleStatus !== 'Locked' && (
                                                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); removeChildQuote(quote.id!); }} className="text-destructive h-8 px-2">
                                                            Detach
                                                        </Button>
                                                    )}
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
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}

const Layers = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M3 9h18" /><path d="M3 15h18" /><path d="M9 3v18" /><path d="M15 3v18" /></svg>
);
