
'use client';

import { useEvents } from '@/context/events-context';
import { useAuth } from '@/context/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
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
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { createUserWithEmailAndPassword, signOut, signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { Loader2, UserPlus } from 'lucide-react';

const addUserSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

export default function AuditLogPage() {
  const { events } = useEvents();
  const { isAdmin, user: adminUser } = useAuth();
  const { toast } = useToast();
  const [isAddUserOpen, setAddUserOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // The events are already sorted from the context
  const loginEvents = events.filter(event => event.type === 'login');

  const form = useForm<z.infer<typeof addUserSchema>>({
    resolver: zodResolver(addUserSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const handleAddUser = async (values: z.infer<typeof addUserSchema>) => {
    setIsSubmitting(true);
    // In a real app, this would be a Cloud Function.
    // For this prototype, we have to create a temporary auth instance.
    // This is NOT secure and is for demonstration purposes only.
    try {
      const originalAdminUser = auth.currentUser;
      if (!originalAdminUser) {
        throw new Error("Admin user not authenticated.");
      }
      
      const adminEmail = originalAdminUser.email;
      const adminPassword = prompt("For this prototype, please re-enter your admin password to continue:");

      if (!adminPassword) {
        toast({ title: 'Password required', description: 'Admin password is required for this action.', variant: 'destructive'});
        setIsSubmitting(false);
        return;
      }

      // Create the new user
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const newUser = userCredential.user;
      
      // Add a 'user' role to the new user in Firestore
      await setDoc(doc(db, "users", newUser.uid), {
        email: newUser.email,
        role: 'user'
      });

      // Sign out the new user
      await signOut(auth);

      // Sign the admin back in
      if (adminEmail) {
        await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
      }
      
      toast({
        title: "User Created",
        description: `User ${values.email} has been created with the 'user' role.`,
      });
      form.reset();
      setAddUserOpen(false);
    } catch (error: any) {
      toast({
        title: 'Error creating user',
        description: error.message,
        variant: 'destructive',
      });
       // If the process fails, try to sign the admin back in to avoid a logged-out state
      if (auth.currentUser?.email !== adminUser?.email) {
          await signOut(auth).catch(); // Sign out any intermediate user
          if (adminUser) {
              const reauthPassword = prompt("An error occurred. Please re-enter your password to re-login:");
              if(reauthPassword && adminUser.email) {
                  await signInWithEmailAndPassword(auth, adminUser.email, reauthPassword).catch(e => console.error("Re-login failed", e));
              }
          }
      }
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
            <h1 className="text-4xl font-bold font-headline">Audit Log</h1>
            <p className="text-lg text-muted-foreground mt-2">A real-time log of user login events in your application.</p>
        </div>
        {isAdmin && (
           <Dialog open={isAddUserOpen} onOpenChange={setAddUserOpen}>
              <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add User
                  </Button>
              </DialogTrigger>
              <DialogContent>
                 <DialogHeader>
                    <DialogTitle>Create a New User</DialogTitle>
                    <DialogDescription>
                        Enter the email and a temporary password for the new user. They will be able to log in immediately with app user privileges.
                    </DialogDescription>
                 </DialogHeader>
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleAddUser)} className="space-y-4 py-4">
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                <Input placeholder="new.user@example.com" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Password</FormLabel>
                                <FormControl>
                                <Input type="password" placeholder="••••••••" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                         <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="outline" disabled={isSubmitting}>Cancel</Button>
                            </DialogClose>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Create User
                            </Button>
                        </DialogFooter>
                    </form>
                 </Form>
              </DialogContent>
           </Dialog>
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
