
'use client';

import { useAuth } from '@/context/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2, Wrench, Package, FileArchive, ShieldCheck } from 'lucide-react';
import { SidebarProvider, Sidebar, SidebarTrigger, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAppUser, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
<<<<<<< HEAD
    if (!loading) {
      if (!user) {
        // If not logged in at all, go to login page
        router.push('/login');
      } else if (!isAppUser) {
        // If logged in but not an admin/app user, go to home page
        router.push('/');
      }
=======
    if (!loading && !user) {
      router.replace('/login');
>>>>>>> 66a26ccb951e999da078b1ca7532af7f9ca9bd78
    }
  }, [user, isAppUser, loading, router]);

<<<<<<< HEAD
  if (loading || !user || !isAppUser) {
=======
  if (!isClient || loading || !user) {
>>>>>>> 66a26ccb951e999da078b1ca7532af7f9ca9bd78
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const isActive = (path: string) => pathname === path;

  return (
    <SidebarProvider>
        <Sidebar>
            <SidebarContent>
                <SidebarHeader>
                    <div className="flex items-center justify-between">
                         <h2 className="text-lg font-semibold font-headline">Admin Panel</h2>
                         <SidebarTrigger asChild><Button variant="ghost" size="icon" /></SidebarTrigger>
                    </div>
                </SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={isActive('/admin/dashboard')}>
                            <Link href="/admin/dashboard"><Wrench /> <span>Dashboard</span></Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={isActive('/admin/orders')}>
                            <Link href="/admin/orders"><Package /> <span>Orders</span></Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={isActive('/admin/documents')}>
                            <Link href="/admin/documents"><FileArchive /> <span>Documents</span></Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={isActive('/admin/audit-log')}>
                             <Link href="/admin/audit-log"><ShieldCheck /> <span>Audit Log</span></Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarContent>
        </Sidebar>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 ml-0 md:ml-[16rem] group-data-[state=collapsed]/sidebar-wrapper:md:ml-[3rem] transition-all duration-200">
             {children}
        </main>
    </SidebarProvider>
  );
}
