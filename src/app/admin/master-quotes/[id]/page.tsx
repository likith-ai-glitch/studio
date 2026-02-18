
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
import { Loader2, ArrowLeft, Plus, CheckCircle2, Lock, History, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Quote, QuoteLifecycleStatus } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function MasterQuoteDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [masterQuote, setMasterQuote] = useState<Quote | null>(null);
  const [childQuotes, setChildQuotes] = useState<Quote[]>([]);
  const [availableChildQuotes, setAvailableChildQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

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

  const loadAvailableChildQuotes = async () => {
    setIsSearching(true);
    try {
      const q = query(
        collection(db, 'quotes'), 
        where('isMaster', '==', false),
        where('masterQuoteId', '==', null)
      );
      const snapshot = await getDocs(q);
      const quotes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Quote[];
      setAvailableChildQuotes(quotes);
    } catch (error) {
      console.error("Error loading child quotes:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const attachChildQuote = async (childId: string) => {
    if (!id) return;
    try {
      await updateDoc(doc(db, 'quotes', childId), { masterQuoteId: id });
      toast({ title: "Child Quote Attached", description: "The quote has been successfully linked." });
      setAvailableChildQuotes(prev => prev.filter(q => q.id !== childId));
    } catch (error: any) {
      toast({ title: "Attachment Failed", description: error.message, variant: "destructive" });
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
    } catch (error: any) {
      toast({ title: "Detachment Failed", description: error.message, variant: "destructive" });
    }
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
      <header className="flex justify-between items-start">
        <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.push('/admin/master-quotes')}>
                <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
                <h1 className="text-4xl font-bold font-headline">
                    Master Quote: {masterQuote?.Name || masterQuote?.quoteNumber}
                </h1>
                <p className="text-muted-foreground mt-1">ID: {masterQuote?.id}</p>
            </div>
        </div>
        <div className="flex gap-4 items-center bg-card p-4 rounded-lg shadow-sm border">
            <div className="text-right mr-4">
                <Label className="text-xs uppercase text-muted-foreground">Admin Status Controls</Label>
                <p className="font-bold flex items-center gap-2 mt-1">
                    {masterQuote?.lifecycleStatus === 'Locked' ? <Lock className="h-4 w-4 text-destructive" /> : <History className="h-4 w-4 text-secondary" />}
                    {masterQuote?.lifecycleStatus}
                </p>
            </div>
            <Select 
                value={masterQuote?.lifecycleStatus || 'Draft'} 
                onValueChange={(val) => handleUpdateLifecycle(val as QuoteLifecycleStatus)} 
                disabled={isUpdating}
            >
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Change Status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="Draft">Draft (Editable)</SelectItem>
                    <SelectItem value="InProgress">InProgress (Comparison)</SelectItem>
                    <SelectItem value="Locked">Locked (Read-Only)</SelectItem>
                </SelectContent>
            </Select>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" /> Master Quote Products
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
                        <TableHead className="text-right">Baseline Price</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {masterQuote?.items.map((item, idx) => (
                        <TableRow key={idx}>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell className="text-right">₹{item.price.toFixed(2)}</TableCell>
                            <TableCell className="text-right font-semibold">₹{(item.price * item.quantity).toFixed(2)}</TableCell>
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
                    <CardTitle className="flex justify-between items-center">
                        Vendor Child Quotes ({childQuotes.length})
                        {masterQuote?.lifecycleStatus !== 'Locked' && (
                            <Button size="sm" onClick={loadAvailableChildQuotes} disabled={isSearching}>
                                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                                Add Child
                            </Button>
                        )}
                    </CardTitle>
                    <CardDescription>
                        Comparison quotes assigned to this master by vendors.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {childQuotes.length > 0 ? childQuotes.map(quote => (
                            <div key={quote.id} className="border p-4 rounded-lg flex justify-between items-center bg-muted/20 hover:bg-muted/40 transition-colors">
                                <div>
                                    <p className="font-bold">{quote.Name || quote.quoteNumber}</p>
                                    <p className="text-xs text-muted-foreground">{quote.status} • ₹{quote.totalPrice?.toFixed(2)}</p>
                                </div>
                                {masterQuote?.lifecycleStatus !== 'Locked' && (
                                    <Button variant="ghost" size="sm" onClick={() => removeChildQuote(quote.id!)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                                        Detach
                                    </Button>
                                )}
                            </div>
                        )) : (
                            <div className="text-center py-6 text-sm text-muted-foreground border-2 border-dashed rounded-lg">
                                No child quotes linked.
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {availableChildQuotes.length > 0 && (
                <Card className="border-secondary animate-in slide-in-from-right-4">
                    <CardHeader className="bg-secondary/10">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <Search className="h-4 w-4" /> Available for Attachment
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 max-h-[400px] overflow-y-auto">
                        <div className="space-y-2">
                            {availableChildQuotes.map(q => (
                                <div key={q.id} className="border p-3 rounded-md flex justify-between items-center text-sm">
                                    <div className="truncate flex-grow mr-2">
                                        <p className="font-medium truncate">{q.Name || q.quoteNumber}</p>
                                        <p className="text-[10px] text-muted-foreground">Total: ₹{q.totalPrice?.toFixed(2)}</p>
                                    </div>
                                    <Button size="sm" variant="secondary" onClick={() => attachChildQuote(q.id!)}>
                                        Attach
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
      </div>
    </div>
  );
}

const Layers = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M3 9h18" /><path d="M3 15h18" /><path d="M9 3v18" /><path d="M15 3v18" /></svg>
);
