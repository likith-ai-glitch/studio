
'use client';

import { useAuth } from '@/context/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAppUser, isAdmin, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // If not logged in at all, go to login page
        router.push('/login');
      } else if (!isAppUser) {
        // If logged in but not an admin/app user, go to home page
        router.push('/');
      } else if (pathname === '/admin/roles' && !isAdmin) {
        // Strict guard for Role Management
        toast({
          title: "Access Denied",
          description: "You do not have permission to access user management.",
          variant: "destructive",
        });
        router.push('/admin');
      }
    }
  }, [user, isAppUser, isAdmin, loading, router, pathname, toast]);

  if (loading || !user || !isAppUser) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // Prevent flash of unauthorized content for the roles page
  if (pathname === '/admin/roles' && !isAdmin) {
    return null;
  }

  return <>{children}</>;
}
