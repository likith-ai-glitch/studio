'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { auth, db } from '@/lib/firebase';
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const authFormSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (user && !authLoading) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  const form = useForm<z.infer<typeof authFormSchema>>({
    resolver: zodResolver(authFormSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(values: z.infer<typeof authFormSchema>) {
    setIsLoading(true);
    setServerError(null);
    
    try {
      // 1. Attempt login
      try {
        await signInWithEmailAndPassword(auth, values.email, values.password);
        toast({
          title: 'Login Successful',
          description: 'Welcome back to Shopstream!',
        });
      } catch (loginError: any) {
        // 2. If user doesn't exist (invalid-credential is used for both wrong pass and user not found in modern Firebase)
        // We attempt signup if the error suggests user doesn't exist.
        // For security reasons, Firebase doesn't always distinguish.
        // We check for auth/invalid-credential or specifically auth/user-not-found
        if (loginError.code === 'auth/user-not-found' || loginError.code === 'auth/invalid-credential') {
          // Attempt signup
          try {
            const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
            
            // 3. Create user profile in Firestore
            await setDoc(doc(db, 'users', userCredential.user.uid), {
              id: userCredential.user.uid,
              email: values.email,
              role: 'USER',
              createdAt: serverTimestamp(),
            });

            toast({
              title: 'Account Created',
              description: 'Welcome to Shopstream!',
            });
          } catch (signupError: any) {
            // If signup fails, it might be a real wrong password if user existed but login threw generic error
            // or a real signup error (weak pass, etc)
            if (signupError.code === 'auth/email-already-in-use') {
                throw new Error("Invalid password for this account.");
            }
            throw signupError;
          }
        } else {
          throw loginError;
        }
      }
      
      router.push('/');
    } catch (error: any) {
      console.error("Auth error:", error);
      let message = "An unexpected error occurred. Please try again.";
      if (error.code === 'auth/wrong-password') message = "Incorrect password.";
      if (error.code === 'auth/invalid-email') message = "Invalid email format.";
      if (error.code === 'auth/user-disabled') message = "This account has been disabled.";
      if (error.message) message = error.message;
      
      setServerError(message);
    } finally {
      setIsLoading(false);
    }
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold font-headline text-primary">Shopstream Access</CardTitle>
          <CardDescription>Enter your email and password to log in or create an account</CardDescription>
        </CardHeader>
        <CardContent>
          {serverError && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Authentication Failed</AlertTitle>
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="you@example.com" {...field} autoComplete="email" />
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
                      <Input type="password" placeholder="••••••••" {...field} autoComplete="current-password" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Sign In / Sign Up'
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
