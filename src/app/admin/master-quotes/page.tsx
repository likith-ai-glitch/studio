
'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, getDocs, writeBatch } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowRight, Layers, Package, Trash2 } from 'lucide-react';
import Link from 'next/link';
import type { Quote } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
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

export default function MasterQuotesPage() {
  const [masterQuotes, setMasterQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'quotes'), where('isMaster', '==', true));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const quotes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Quote[];
      setMasterQuotes(quotes);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      const batch = writeBatch(db);
      
      // 1. Delete the quote itself
      batch.delete(doc(db, 'quotes', deleteId));
      
      // 2. Delete associated line items
      const qliQuery = query(collection(db, 'quoteLineItems'), where('QuoteId', '==', deleteId));
      const qliSnap = await getDocs(qliQuery);
      qliSnap.forEach(d => batch.delete(d.ref));
      
      // 3. Handle child quotes (orphan them)
      const childQuery = query(collection(db, 'quotes'), where('masterQuoteId', '==', deleteId));
      const childSnap = await getDocs(childQuery);
      childSnap.forEach(d => batch.update(d.ref, { masterQuoteId: null }));

      await batch.commit();
      toast({ title: "Quote Deleted", description: "Baseline and items removed successfully." });
    } catch (error: any) {
      toast({ title: "Delete Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-4xl font-bold font-headline flex items-center gap-2">
            <Layers className="h-8 w-8 text-primary" />
            Master Quote Management
        </h1>
        <p className="text-lg text-muted-foreground mt-2">Manage baseline quotes and their vendor comparisons.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Active Master Quotes</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : masterQuotes.length > 0 ? (
            <AlertDialog>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quote Name / ID</TableHead>
                    <TableHead>Associated Products</TableHead>
                    <TableHead>Lifecycle Status</TableHead>
                    <TableHead className="w-[200px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {masterQuotes.map((quote) => (
                    <TableRow key={quote.id}>
                      <TableCell>
                          <div className="font-semibold">{quote.Name || quote.quoteNumber}</div>
                          <div className="text-xs text-muted-foreground font-mono">{quote.id}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[400px]">
                          {quote.items && quote.items.length > 0 ? (
                            quote.items.slice(0, 3).map((item, idx) => (
                              <Badge key={idx} variant="outline" className="bg-muted/50 text-[10px] font-normal">
                                <Package className="h-3 w-3 mr-1 text-muted-foreground" />
                                {item.name} {item.brand ? `(${item.brand})` : ''}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground italic text-xs">No products defined</span>
                          )}
                          {quote.items && quote.items.length > 3 && (
                            <Badge variant="outline" className="text-[10px] font-normal">
                              +{quote.items.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={quote.lifecycleStatus === 'Locked' ? 'destructive' : 'secondary'}>
                          {quote.lifecycleStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/admin/master-quotes/${quote.id}`}>
                              View Details
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                          </Button>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => setDeleteId(quote.id!)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Master Quote?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete the Master baseline and its line items. Linked vendor quotes will be detached but not deleted.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setDeleteId(null)}>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90" disabled={isDeleting}>
                    {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete Baseline"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              No Master Quotes found. Mark a quote as "Master" in the Quote Builder.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
