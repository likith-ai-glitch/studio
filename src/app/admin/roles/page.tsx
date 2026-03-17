
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { db, auth } from '@/lib/firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserPlus, Shield, ShieldCheck, ArrowLeft, AlertCircle, Users, LockKeyhole, MoreHorizontal, KeyRound, Trash2 } from 'lucide-react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createSystemUserAction, updateUserPasswordAction, deleteUserAction } from '@/app/actions/admin-user-actions';

const systemUserSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  role: z.enum(['ADMIN', 'MANAGER'], { required_error: "Please select a role." }),
});

type SystemUserFormValues = z.infer<typeof systemUserSchema>;

export default function RolesPage() {
  const { isAdmin, user: currentUser } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [appUsers, setAppUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  
  // Dialog States
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const [adminPassword, setAdminPassword] = useState('');
  const [newManagerPassword, setNewPassword] = useState('');
  
  const [pendingAction, setPendingAction] = useState<'CREATE' | 'UPDATE_PASSWORD' | 'DELETE' | null>(null);
  const [targetUser, setTargetUser] = useState<{ uid: string; email: string } | null>(null);
  const [pendingUserValues, setPendingUserValues] = useState<SystemUserFormValues | null>(null);

  const form = useForm<SystemUserFormValues>({
    resolver: zodResolver(systemUserSchema),
    defaultValues: {
      email: '',
      password: '',
      role: 'MANAGER',
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

  const handleCreateUserRequest = (values: SystemUserFormValues) => {
    setPendingUserValues(values);
    setPendingAction('CREATE');
    setIsAuthDialogOpen(true);
  };

  const handleUpdatePasswordRequest = (user: { uid: string; email: string }) => {
    setTargetUser(user);
    setPendingAction('UPDATE_PASSWORD');
    setIsAuthDialogOpen(true);
  };

  const handleDeleteRequest = (user: { uid: string; email: string }) => {
    setTargetUser(user);
    setPendingAction('DELETE');
    setIsAuthDialogOpen(true);
  };

  const handleConfirmAdminAuth = async () => {
    if (!adminPassword || !currentUser?.email) return;
    
    setIsSubmitting(true);
    try {
      // Verify Admin Password
      await signInWithEmailAndPassword(auth, currentUser.email, adminPassword);
      
      // Proceed to the specific dialog based on pending action
      setIsAuthDialogOpen(false);
      setAdminPassword('');

      if (pendingAction === 'CREATE' && pendingUserValues) {
        const res = await createSystemUserAction(pendingUserValues);
        if (res.success) {
          toast({ title: "User Created", description: `Account for ${pendingUserValues.email} is ready.` });
          form.reset();
        } else {
          throw new Error(res.error);
        }
      } else if (pendingAction === 'UPDATE_PASSWORD') {
        setIsPasswordDialogOpen(true);
      } else if (pendingAction === 'DELETE') {
        setIsDeleteDialogOpen(true);
      }
    } catch (error: any) {
      toast({
        title: "Authentication Failed",
        description: error.message || "Invalid administrator password.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinalPasswordUpdate = async () => {
    if (!targetUser || !newManagerPassword) return;
    setIsSubmitting(true);
    try {
      const res = await updateUserPasswordAction(targetUser.uid, newManagerPassword);
      if (res.success) {
        toast({ title: "Password Updated", description: `Credentials for ${targetUser.email} have been changed.` });
        setIsPasswordDialogOpen(false);
        setNewPassword('');
      } else {
        throw new Error(res.error);
      }
    } catch (error: any) {
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinalDelete = async () => {
    if (!targetUser) return;
    setIsSubmitting(true);
    try {
      const res = await deleteUserAction(targetUser.uid);
      if (res.success) {
        toast({ title: "User Deleted", description: `Account for ${targetUser.email} has been removed.`, variant: "destructive" });
        setIsDeleteDialogOpen(false);
      } else {
        throw new Error(res.error);
      }
    } catch (error: any) {
      toast({ title: "Deletion Failed", description: error.message, variant: "destructive" });
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
            <p className="text-muted-foreground mt-1">Manage staff access and credentials.</p>
          </div>
        </div>
      </header>

      <div className="grid md:grid-cols-3 gap-8">
        <Card className="md:col-span-1 h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Add User
            </CardTitle>
            <CardDescription>
              Create a new staff account with specific privileges.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleCreateUserRequest)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>User Email</FormLabel>
                      <FormControl>
                        <Input placeholder="staff@shopstream.com" {...field} />
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
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assign Role</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ADMIN">Administrator</SelectItem>
                          <SelectItem value="MANAGER">Manager</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Create User"}
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
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appUsers.length > 0 ? appUsers.map(u => (
                    <TableRow key={u.uid}>
                      <TableCell className="font-medium">
                        <div>{u.email}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{u.uid}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={u.role === 'ADMIN' ? 'default' : 'secondary'}>
                          {u.role === 'ADMIN' ? <ShieldCheck className="h-3 w-3 mr-1" /> : <Users className="h-3 w-3 mr-1" />}
                          {u.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {u.email !== currentUser?.email ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Manage User</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => handleUpdatePasswordRequest({ uid: u.uid, email: u.email })}>
                                <KeyRound className="mr-2 h-4 w-4" /> Change Password
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteRequest({ uid: u.uid, email: u.email })}>
                                <Trash2 className="mr-2 h-4 w-4" /> Delete Account
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">You</span>
                        )}
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
        <AlertTitle className="text-sm font-bold">Security Notice</AlertTitle>
        <AlertDescription className="text-xs">
          Deleting a user or changing a password is permanent. Always verify the identity of the person you are managing before proceeding.
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
              Please confirm your Administrator password to authorize this sensitive operation.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="admin-password">Admin Password</Label>
            <Input 
              id="admin-password" 
              type="password" 
              placeholder="Confirm your credentials" 
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
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify Identity"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Password</DialogTitle>
            <DialogDescription>
              Set a new password for <strong>{targetUser?.email}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="new-password">New Password</Label>
            <Input 
              id="new-password" 
              type="password" 
              placeholder="Min 6 characters" 
              value={newManagerPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleFinalPasswordUpdate} disabled={isSubmitting || !newManagerPassword}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save New Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User AlertDialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User Account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the account for <strong>{targetUser?.email}</strong> from both authentication and the database. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)} disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleFinalDelete} className="bg-destructive hover:bg-destructive/90" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
