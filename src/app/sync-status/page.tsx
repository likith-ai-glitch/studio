
'use client';

import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface SyncLog {
  id: string;
  objectType: string;
  status: 'Success' | 'Failure';
  message: string;
  timestamp: Date;
  recordCount?: number;
}

export default function SyncStatusPage() {
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(() => {
    setLoading(true);
    setError(null);
    
    const logsCollection = collection(db, 'syncLogs');
    const q = query(logsCollection, orderBy('timestamp', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logsData: SyncLog[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          objectType: data.objectType,
          status: data.status,
          message: data.message,
          timestamp: (data.timestamp as Timestamp).toDate(),
          recordCount: data.recordCount,
        };
      });
      setLogs(logsData);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching sync logs:", err);
      setError("Failed to fetch sync logs. Please check your connection and permissions.");
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = fetchLogs();
    return () => unsubscribe();
  }, [fetchLogs]);

  const handleRefresh = () => {
    // onSnapshot is real-time, but this gives users a manual way to feel in control
    // and can help re-establish connection if it was interrupted.
    fetchLogs();
  };

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold font-headline">Sync Status Dashboard</h1>
          <p className="text-lg text-muted-foreground mt-2">
            Real-time logs for Salesforce to Firestore synchronization.
          </p>
        </div>
        <Button onClick={handleRefresh} disabled={loading}>
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Refresh
        </Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Synchronization Logs</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="text-center py-16 text-destructive">
              <AlertCircle className="mx-auto h-12 w-12 mb-4" />
              <p className="text-xl font-semibold">An Error Occurred</p>
              <p>{error}</p>
            </div>
          )}
          {!error && loading && (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          )}
          {!error && !loading && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead>Object</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead className="text-right">Records</TableHead>

                  <TableHead className="text-right">Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length > 0 ? (
                  logs.map((log) => (
                    <TableRow key={log.id} className={cn(
                      log.status === 'Failure' && 'bg-red-50 dark:bg-red-900/20'
                    )}>
                      <TableCell>
                        <Badge variant={log.status === 'Success' ? 'secondary' : 'destructive'}>
                          {log.status === 'Success' ? (
                              <CheckCircle className="mr-1 h-3 w-3 text-green-500"/>
                          ) : (
                              <AlertCircle className="mr-1 h-3 w-3"/>
                          )}
                          {log.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{log.objectType}</TableCell>
                      <TableCell className="text-muted-foreground">{log.message}</TableCell>
                      <TableCell className="text-right font-mono">{log.recordCount ?? 'N/A'}</TableCell>
                      <TableCell className="text-right text-muted-foreground whitespace-nowrap">
                        {format(log.timestamp, "PPP p")}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-16">
                      No synchronization logs found yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
