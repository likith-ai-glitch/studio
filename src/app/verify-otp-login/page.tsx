
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldCheck, RefreshCw } from 'lucide-react';
import { verifyOtpAction, generateAndSendOtpAction } from '@/app/actions/otp-actions';

const otpSchema = z.object({
  otp: z.string().length(6, { message: 'Code must be exactly 6 digits.' }),
});

export default function VerifyOtpLoginPage() {
  const { user, isOtpVerified, isEmailVerified, loading: authLoading, setOtpVerified, isAppUser } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
    if (!authLoading && user) {
        if (!isEmailVerified) {
            router.push('/verify-otp');
        } else if (isOtpVerified) {
            router.push(isAppUser ? '/admin' : '/');
        }
    }
  }, [user, isOtpVerified, isEmailVerified, authLoading, router, isAppUser]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const form = useForm<z.infer<typeof otpSchema>>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: '' },
  });

  async function onSubmit(values: z.infer<typeof otpSchema>) {
    if (!user?.email) return;
    setIsVerifying(true);
    try {
      const res = await verifyOtpAction(user.email, values.otp);
      if (res.success) {
        setOtpVerified(true);
        toast({ title: 'Login Confirmed', description: 'Identity verified successfully!' });
        router.push(isAppUser ? '/admin' : '/');
      } else {
        toast({ title: 'Error', description: res.error, variant: 'destructive' });
      }
    } catch (error: any) {
      toast({ title: 'Verification Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsVerifying(false);
    }
  }

  async function handleResend() {
    if (!user?.email) return;
    setIsResending(true);
    try {
      const res = await generateAndSendOtpAction(user.email);
      if (res.success) {
        toast({ title: 'Security Code Resent', description: `Your test security OTP is: ${res.otp}` });
        setResendCooldown(60);
      } else {
        toast({ title: 'Error', description: res.error, variant: 'destructive' });
      }
    } catch (error: any) {
      toast({ title: 'Resend Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsResending(false);
    }
  }

  if (authLoading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto bg-green-100 p-3 rounded-full w-fit mb-4">
            <ShieldCheck className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold font-headline">Security Check</CardTitle>
          <CardDescription>
            Please enter the 6-digit security code we sent to your email to complete your login.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="otp"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input 
                        placeholder="000000" 
                        {...field} 
                        className="text-center text-2xl tracking-[0.5em] h-14" 
                        maxLength={6}
                      />
                    </FormControl>
                    <FormMessage className="text-center" />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full h-12 text-lg bg-green-600 hover:bg-green-700" disabled={isVerifying}>
                {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm Identity
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button 
            variant="ghost" 
            className="w-full text-muted-foreground hover:text-foreground" 
            onClick={handleResend} 
            disabled={isResending || resendCooldown > 0}
          >
            {isResending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            {resendCooldown > 0 ? `Resend security code in ${resendCooldown}s` : 'Resend security code'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
