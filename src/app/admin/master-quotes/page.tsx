
'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowRight, Layers } from 'lucide-react';
import Link from 'next/link';
import type { Quote } from '@/lib/types';

export default function MasterQuotesPage() {
  const [masterQuotes, setMasterQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);

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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quote Name / ID</TableHead>
                  <TableHead>Lifecycle Status</TableHead>
                  <TableHead className="w-[150px]"></TableHead>
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
                      <Badge variant={quote.lifecycleStatus === 'Locked' ? 'destructive' : 'secondary'}>
                        {quote.lifecycleStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/admin/master-quotes/${quote.id}`}>
                          View Details
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
