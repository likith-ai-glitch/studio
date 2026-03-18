'use client';

import { useEvents } from '@/context/events-context';
import { useAuth } from '@/context/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Users, ShieldCheck, Trash2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
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

export default function AuditLogPage() {
  const { events, deleteEvent } = useEvents();
  const { isAdmin, isSuperAdmin } = useAuth();
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // The events are already sorted from the context
  const loginEvents = events.filter(event => event.type === 'login');

  const handleDelete = async (id: string) => {
    setIsDeleting(id);
    try {
      await deleteEvent(id);
    } finally {
      setIsDeleting(null);
    }
  };

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
                {isSuperAdmin && <TableHead className="w-[100px] text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loginEvents.length > 0 ? (
                loginEvents.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="font-medium">{event.userEmail}</TableCell>
                    <TableCell>{format(event.timestamp, "PPP p")}</TableCell>
                    {isSuperAdmin && (
                      <TableCell className="text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10">
                              {isDeleting === event.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Log Entry?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently remove this login event from the audit log.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(event.id)} className="bg-destructive hover:bg-destructive/90">
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={isSuperAdmin ? 3 : 2} className="text-center text-muted-foreground py-8">
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
