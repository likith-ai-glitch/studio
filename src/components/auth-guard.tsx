'use client';

import { useAuth } from '@/context/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: ReactNode;
}

/**
 * AuthGuard ensures that only authenticated users can access the application.
 * Unauthenticated users are redirected to the /login page.
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      // If no user is logged in and we aren't already on the login page, redirect.
      if (!user && pathname !== '/login') {
        router.push('/login');
      }
    }
  }, [user, loading, pathname, router]);

  // Show a loading spinner while checking the authentication state.
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground animate-pulse font-medium">Verifying Session...</p>
        </div>
      </div>
    );
  }

  // If on the login page, allow rendering so users can sign in.
  if (pathname === '/login') {
    return <>{children}</>;
  }

  // If not logged in, don't render anything while redirecting.
  if (!user) {
    return null;
  }

  // User is authenticated, proceed to the app.
  return <>{children}</>;
}
