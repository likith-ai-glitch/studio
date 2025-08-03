
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { auth } from '@/lib/firebase';
import { 
  signInWithEmailAndPassword,
  RecaptchaVerifier,
  signInWithPhoneNumber
} from 'firebase/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useEvents } from '@/context/events-context';
import { Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const emailFormSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

const phoneFormSchema = z.object({
    phone: z.string().min(10, { message: 'Please enter a valid phone number.' }),
});

const otpFormSchema = z.object({
    otp: z.string().min(6, { message: 'OTP must be 6 digits.'}),
});

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { logEvent } = useEvents();
  const [isLoading, setIsLoading] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [showOtpInput, setShowOtpInput] = useState(false);

  const emailForm = useForm<z.infer<typeof emailFormSchema>>({
    resolver: zodResolver(emailFormSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const phoneForm = useForm<z.infer<typeof phoneFormSchema>>({
    resolver: zodResolver(phoneFormSchema),
    defaultValues: { phone: '' },
  });

  const otpForm = useForm<z.infer<typeof otpFormSchema>>({
    resolver: zodResolver(otpFormSchema),
    defaultValues: { otp: '' },
  });

  async function onEmailSubmit(values: z.infer<typeof emailFormSchema>) {
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      logEvent({ type: 'login', userEmail: values.email });
      toast({
        title: 'Login Successful',
        description: 'Welcome back!',
      });
      router.push('/admin');
    } catch (error: any) {
      toast({
        title: 'Login Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
        setIsLoading(false);
    }
  }

  const setupRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
        'callback': (response: any) => {
          // reCAPTCHA solved, allow signInWithPhoneNumber.
        },
      });
    }
    return window.recaptchaVerifier;
  };

  async function onPhoneSubmit(values: z.infer<typeof phoneFormSchema>) {
    setIsLoading(true);
    try {
      const recaptchaVerifier = setupRecaptcha();
      const phoneNumber = `+${values.phone.replace(/\D/g, '')}`; // Format number
      const result = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
      setConfirmationResult(result);
      setShowOtpInput(true);
      toast({
        title: 'Verification Code Sent',
        description: 'Please check your phone for the OTP.',
      });
    } catch (error: any) {
      console.error(error);
      toast({
        title: 'SMS Sending Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function onOtpSubmit(values: z.infer<typeof otpFormSchema>) {
    setIsLoading(true);
    if (!confirmationResult) {
        toast({ title: 'Error', description: 'Please request an OTP first.', variant: 'destructive'});
        setIsLoading(false);
        return;
    }
    try {
        const userCredential = await confirmationResult.confirm(values.otp);
        logEvent({ type: 'login', userEmail: userCredential.user.phoneNumber || 'Phone User'});
        toast({
            title: 'Login Successful',
            description: 'Welcome!',
        });
        router.push('/admin');
    } catch (error: any) {
        toast({
            title: 'OTP Verification Failed',
            description: error.message,
            variant: 'destructive',
        });
    } finally {
        setIsLoading(false);
    }
  }


  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold font-headline">Welcome Back</CardTitle>
          <CardDescription>Enter your credentials to access your account</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="email" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="email">Email</TabsTrigger>
              <TabsTrigger value="phone">Phone</TabsTrigger>
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
                    Log In
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
                            <Input placeholder="+1 123 456 7890" {...field} />
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
          </Tabs>
          <div id="recaptcha-container"></div>
          <div className="mt-4 text-center text-sm">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="underline">
              Sign up
            </Link>
          </div>
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
