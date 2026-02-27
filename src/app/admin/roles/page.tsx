'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { db, auth } from '@/lib/firebase';
import { collection, query, onSnapshot, doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signOut, signInWithEmailAndPassword } from 'firebase/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserPlus, Shield, ShieldCheck, ArrowLeft, AlertCircle, Users, LockKeyhole } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const managerSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

type ManagerFormValues = z.infer<typeof managerSchema>;

export default function RolesPage() {
  const { isAdmin, user: currentUser } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [appUsers, setAppUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  
  // States for Admin Re-Auth Dialog
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [pendingManagerValues, setPendingManagerValues] = useState<ManagerFormValues | null>(null);

  const form = useForm<ManagerFormValues>({
    resolver: zodResolver(managerSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  useEffect(() => {
    if (!isAdmin && currentUser) {
      toast({
        title: "Access Denied",
        description: "Only Administrators can manage roles.",
        variant: "destructive",
      });
      router.push('/admin');
      return;
    }

    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const users = snapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      }));
      setAppUsers(users);
      setLoadingUsers(false);
    }, (error) => {
      console.error("Error fetching users:", error);
      toast({
        title: "Permission Denied",
        description: "Could not load user list. Check security rules.",
        variant: "destructive",
      });
      setLoadingUsers(false);
    });

    return () => unsubscribe();
  }, [isAdmin, router, toast, currentUser]);

  const handleCreateManagerRequest = async (values: ManagerFormValues) => {
    setIsSubmitting(true);
    
    // Check for duplicates first in Firestore
    const userDoc = await getDoc(doc(db, 'users', values.email));
    if (userDoc.exists()) {
      toast({
        title: "Duplicate User",
        description: "This email is already registered as a Manager or Admin.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    // Open re-auth dialog
    setPendingManagerValues(values);
    setIsAuthDialogOpen(true);
    setIsSubmitting(false);
  };

  const handleConfirmAdminAuth = async () => {
    if (!adminPassword || !pendingManagerValues || !currentUser?.email) return;
    
    setIsSubmitting(true);
    const values = pendingManagerValues;
    const originalAdminEmail = currentUser.email;

    try {
      // 1. Create the new user
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const newUser = userCredential.user;

      // 2. Set the role in Firestore
      await setDoc(doc(db, 'users', newUser.uid), {
        id: newUser.uid,
        email: values.email,
        role: 'MANAGER',
        createdAt: serverTimestamp(),
      });

      // 3. Sign out the new user and sign back in as admin
      await signOut(auth);
      await signInWithEmailAndPassword(auth, originalAdminEmail, adminPassword);

      toast({
        title: "Manager Created",
        description: `Successfully created Manager account for ${values.email}.`,
      });
      
      // Cleanup
      form.reset();
      setIsAuthDialogOpen(false);
      setAdminPassword('');
      setPendingManagerValues(null);
    } catch (error: any) {
      toast({
        title: "Creation Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <header className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="ghost" asChild>
            <Link href="/admin/audit-log">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-4xl font-bold font-headline flex items-center gap-2">
              <Shield className="h-8 w-8 text-primary" />
              Role Management
            </h1>
            <p className="text-muted-foreground mt-1">Manage Manager access and credentials.</p>
          </div>
        </div>
      </header>

      <div className="grid md:grid-cols-3 gap-8">
        <Card className="md:col-span-1 h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Add Manager
            </CardTitle>
            <CardDescription>
              Create a new account with MANAGER privileges.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleCreateManagerRequest)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Manager Email</FormLabel>
                      <FormControl>
                        <Input placeholder="manager@shopstream.com" {...field} />
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
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Create Manager"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>System Users</CardTitle>
            <CardDescription>Accounts with active system access.</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingUsers ? (
              <div className="flex justify-center py-8"><Loader2 className="animate-spin text-primary" /></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appUsers.length > 0 ? appUsers.map(u => (
                    <TableRow key={u.uid}>
                      <TableCell className="font-medium">{u.email}</TableCell>
                      <TableCell>
                        <Badge variant={u.role === 'ADMIN' ? 'default' : 'secondary'}>
                          {u.role === 'ADMIN' ? <ShieldCheck className="h-3 w-3 mr-1" /> : <Users className="h-3 w-3 mr-1" />}
                          {u.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {u.createdAt.toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                        No system users found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Alert className="bg-muted border-none">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle className="text-sm font-bold">Manager Permissions</AlertTitle>
        <AlertDescription className="text-xs">
          Managers can manage products, quotes, and view audit logs, but cannot create or delete other system users.
        </AlertDescription>
      </Alert>

      {/* Admin Re-Auth Dialog */}
      <Dialog open={isAuthDialogOpen} onOpenChange={setIsAuthDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LockKeyhole className="h-5 w-5 text-primary" />
              Authorize Action
            </DialogTitle>
            <DialogDescription>
              To create a new Manager, please confirm your Administrator password.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="admin-password">Admin Password</Label>
            <Input 
              id="admin-password" 
              type="password" 
              placeholder="Enter your admin password" 
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAuthDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleConfirmAdminAuth} disabled={isSubmitting || !adminPassword}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm & Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}