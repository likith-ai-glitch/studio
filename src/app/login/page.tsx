
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { auth, db } from '@/lib/firebase';
import { 
  signInWithEmailAndPassword,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useEvents } from '@/context/events-context';
import { useAuth } from '@/context/auth-context';
import { Loader2, AlertCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { generateAndSendOtpAction } from '@/app/actions/otp-actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const emailFormSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

const phoneFormSchema = z.object({
    phone: z.string().min(10, { message: 'Please enter a valid phone number including country code.' }).startsWith('+', {message: 'Phone number must start with a country code (+).'}),
});

const otpFormSchema = z.object({
    otp: z.string().min(6, { message: 'OTP must be 6 digits.'}),
});

const signupFormSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { logEvent } = useEvents();
  const { user, isAppUser, isEmailVerified, isOtpVerified, loading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  
  useEffect(() => {
    if (document.getElementById('recaptcha-container')) {
       window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
        'callback': (response: any) => {
        }
      });
    }
  }, []);

  useEffect(() => {
    if (user && !authLoading) {
      if (!isEmailVerified) {
        router.push('/verify-otp');
      } else if (!isOtpVerified) {
        router.push('/verify-otp-login');
      } else {
        router.push(isAppUser ? '/admin' : '/');
      }
    }
  }, [user, authLoading, isAppUser, isEmailVerified, isOtpVerified, router]);


  const emailForm = useForm<z.infer<typeof emailFormSchema>>({
    resolver: zodResolver(emailFormSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const phoneForm = useForm<z.infer<typeof phoneFormSchema>>({
    resolver: zodResolver(phoneFormSchema),
    defaultValues: { phone: '+' },
  });

  const otpForm = useForm<z.infer<typeof otpFormSchema>>({
    resolver: zodResolver(otpFormSchema),
    defaultValues: { otp: '' },
  });

  const signupForm = useForm<z.infer<typeof signupFormSchema>>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onEmailSubmit(values: z.infer<typeof emailFormSchema>) {
    setIsLoading(true);
    setServerError(null);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      logEvent({ type: 'login', userEmail: values.email });
      
      // Super Admin check
      if (values.email === 'likithknml@gmail.com') {
          const res = await generateAndSendOtpAction(values.email);
          if (res.success) {
              toast({ title: 'Security OTP Sent', description: `Admin security code: ${res.otp}` });
              router.push('/verify-otp-login');
          } else {
              setServerError(res.error || 'Failed to generate security code.');
          }
          return;
      }

      // Fetch status to decide redirect
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      const data = userDoc.data();
      const isVerified = data?.emailVerified || false;

      if (!isVerified) {
        const res = await generateAndSendOtpAction(values.email);
        if (res.success) {
            toast({ title: 'Verification Required', description: `OTP sent to your email. Code: ${res.otp}` });
            router.push('/verify-otp');
        } else {
            setServerError(res.error || 'Failed to send verification code.');
        }
      } else {
        const res = await generateAndSendOtpAction(values.email);
        if (res.success) {
            toast({ title: 'Identity Check', description: `Security code sent. Code: ${res.otp}` });
            router.push('/verify-otp-login');
        } else {
            setServerError(res.error || 'Failed to send security code.');
        }
      }
    } catch (error: any) {
      setServerError(error.message);
    } finally {
        setIsLoading(false);
    }
  }

  async function onPhoneSubmit(values: z.infer<typeof phoneFormSchema>) {
    setIsLoading(true);
    setServerError(null);
    try {
      const recaptchaVerifier = window.recaptchaVerifier;
      if (!recaptchaVerifier) {
        throw new Error("reCAPTCHA verifier not initialized.");
      }
      const phoneNumber = values.phone;
      const result = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
      setConfirmationResult(result);
      setShowOtpInput(true);
      toast({
        title: 'Verification Code Sent',
        description: 'Please check your phone for the OTP.',
      });
    } catch (error: any) {
      setServerError(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function onOtpSubmit(values: z.infer<typeof otpFormSchema>) {
    setIsLoading(true);
    setServerError(null);
    if (!confirmationResult) {
        setServerError('Please request an OTP first.');
        setIsLoading(false);
        return;
    }
    try {
        const userCredential = await confirmationResult.confirm(values.otp);
        logEvent({ type: 'login', userEmail: userCredential.user.phoneNumber || 'Phone User'});
        toast({
            title: 'Login Successful',
            description: 'Welcome back!',
        });
    } catch (error: any) {
        setServerError(error.message);
    } finally {
        setIsLoading(false);
    }
  }

  async function onSignupSubmit(values: z.infer<typeof signupFormSchema>) {
    setIsLoading(true);
    setServerError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      
      // 1. Create user in Firestore
      // IMPORTANT: rules expect 'id' field to match userId
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        id: userCredential.user.uid,
        email: values.email,
        role: 'CUSTOMER',
        emailVerified: false,
        createdAt: serverTimestamp(),
      });

      // 2. Generate and send OTP
      const res = await generateAndSendOtpAction(values.email);
      
      if (res.success) {
          toast({ title: 'Account Created', description: `Verify your email. OTP: ${res.otp}` });
          router.push('/verify-otp');
      } else {
          setServerError(res.error || 'Failed to send verification code.');
      }
    } catch (error: any) {
      setServerError(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold font-headline">Welcome to Shopstream</CardTitle>
          <CardDescription>Select a method to sign in or create an account</CardDescription>
        </CardHeader>
        <CardContent>
          {serverError && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Action Failed</AlertTitle>
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="email" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="email">Email</TabsTrigger>
              <TabsTrigger value="phone">Phone</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            <TabsContent value="email">
              <Form {...emailForm}>
                <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4 pt-4">
                  <FormField
                    control={emailForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="you@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={emailForm.control}
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
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Log In with Email
                  </Button>
                </form>
              </Form>
            </TabsContent>
            <TabsContent value="phone">
              {!showOtpInput ? (
                <Form {...phoneForm}>
                  <form onSubmit={phoneForm.handleSubmit(onPhoneSubmit)} className="space-y-4 pt-4">
                    <FormField
                      control={phoneForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input placeholder="+11234567890" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Send Code'}
                    </Button>
                  </form>
                </Form>
              ) : (
                 <Form {...otpForm}>
                  <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} className="space-y-4 pt-4">
                    <FormField
                      control={otpForm.control}
                      name="otp"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Verification Code</FormLabel>
                          <FormControl>
                            <Input placeholder="123456" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Verify & Log In'}
                    </Button>
                  </form>
                </Form>
              )}
            </TabsContent>
            <TabsContent value="signup">
               <Form {...signupForm}>
                <form onSubmit={signupForm.handleSubmit(onSignupSubmit)} className="space-y-4 pt-4">
                   <FormField
                    control={signupForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="you@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={signupForm.control}
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
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Account
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
          <div id="recaptcha-container"></div>
        </CardContent>
      </Card>
    </div>
  );
}

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
  }
}
