
'use client';

import { useEvents } from '@/context/events-context';
import { useAuth } from '@/context/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Users, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export default function AuditLogPage() {
  const { events } = useEvents();
  const { isAdmin } = useAuth();

  // The events are already sorted from the context
  const loginEvents = events.filter(event => event.type === 'login');

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
            <h1 className="text-4xl font-bold font-headline flex items-center gap-2">
              <ShieldCheck className="h-8 w-8 text-primary" />
              Audit Log
            </h1>
            <p className="text-lg text-muted-foreground mt-2">A real-time log of user login events in your application.</p>
        </div>
        {isAdmin && (
          <Button asChild variant="outline">
            <Link href="/admin/roles">
              <Users className="mr-2 h-4 w-4" />
              Role Management
            </Link>
          </Button>
        )}
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
