'use client';

import Link from 'next/link';
import { Store, Wrench, LogOut, ShieldCheck, Package, Home, FileText, FileArchive, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import { useQuote } from '@/context/quote-context';
import { Badge } from '@/components/ui/badge';
import { usePathname } from 'next/navigation';

export function Header() {
  const { user, logout, loading, isAppUser } = useAuth();
  const { quote, setIsQuoteSheetOpen } = useQuote();
  const pathname = usePathname();
  
  // Hide the header entirely on the login page to ensure a clean auth-only view
  if (pathname === '/login' || !user) {
    return null;
  }

  const totalItems = quote.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <header className="bg-card shadow-sm border-b sticky top-0 z-40">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2 text-xl font-bold font-headline text-primary">
              <Store className="h-6 w-6" />
              <span className="tracking-tight">Shopstream</span>
            </Link>
          </div>
          
          <nav className="flex items-center gap-1 sm:gap-2">
            {/* All authenticated users get the Home link */}
            <Button variant="ghost" asChild className="h-9">
              <Link href="/" className="flex items-center gap-2">
                <Home className="h-4 w-4" />
                <span className="hidden md:inline">Home</span>
              </Link>
            </Button>

            {/* Admin/Manager specific tools */}
            {isAppUser && (
              <>
                <Button variant="ghost" asChild className="h-9">
                  <Link href="/admin" className="flex items-center gap-2">
                    <Wrench className="h-4 w-4" />
                    <span className="hidden md:inline">Admin</span>
                  </Link>
                </Button>
                <Button variant="ghost" asChild className="h-9">
                  <Link href="/admin/master-quotes" className="flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    <span className="hidden md:inline">Master Quotes</span>
                  </Link>
                </Button>
                 <Button variant="ghost" asChild className="h-9">
                  <Link href="/admin/documents" className="flex items-center gap-2">
                    <FileArchive className="h-4 w-4" />
                    <span className="hidden md:inline">Documents</span>
                  </Link>
                </Button>
                <Button variant="ghost" asChild className="h-9">
                  <Link href="/admin/audit-log" className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    <span className="hidden md:inline">Audit Log</span>
                  </Link>
                </Button>
                <Button variant="ghost" className="relative flex items-center gap-2 h-9" onClick={() => setIsQuoteSheetOpen(true)}>
                    <FileText className="h-4 w-4" />
                    <span className="hidden md:inline">Quote</span>
                    {totalItems > 0 && (
                        <Badge className="absolute -top-1 -right-1 h-4 min-w-4 flex items-center justify-center p-1 text-[10px]" variant="destructive">
                          {totalItems}
                        </Badge>
                    )}
                </Button>
              </>
            )}

            <div className="w-px h-6 bg-border mx-2 hidden sm:block" />

            <Button variant="ghost" onClick={logout} className="flex items-center gap-2 h-9 text-muted-foreground hover:text-destructive">
              <LogOut className="h-4 w-4" />
              <span className="hidden md:inline">Logout</span>
            </Button>
          </nav>
        </div>
      </div>
    </header>
  );
}
