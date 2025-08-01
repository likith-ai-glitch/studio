
'use client';

import { useEvents } from '@/context/events-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';

export default function AuditLogPage() {
  const { events } = useEvents();

  // Filter for login events and sort them from most recent to oldest
  const loginEvents = events
    .filter(event => event.type === 'login')
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-4xl font-bold font-headline">Audit Log</h1>
        <p className="text-lg text-muted-foreground mt-2">A log of important events happening in your application.</p>
      </header>
      
      <Card>
        <CardHeader>
          <CardTitle>User Logins</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User Email</TableHead>
                <TableHead>Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loginEvents.length > 0 ? (
                loginEvents.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="font-medium">{event.userEmail}</TableCell>
                    <TableCell>{format(event.timestamp, "PPP p")}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-muted-foreground py-8">
                    No login events have been recorded yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
