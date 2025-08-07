
'use client';

import Link from 'next/link';
import { Store, Wrench, LogIn, LogOut, ShieldCheck, Package, Home, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import { useCart } from '@/context/cart-context';
import { Badge } from '@/components/ui/badge';

export function Header() {
  const { user, logout, loading } = useAuth();
  const { cart, setIsCartOpen } = useCart();
  
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <header className="bg-card shadow-md sticky top-0 z-40">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2 text-2xl font-bold font-headline text-primary">
              <Store className="h-8 w-8" />
              <span>Shopstream</span>
            </Link>
          </div>
          <nav className="flex items-center gap-1 sm:gap-2">
             <Button variant="ghost" asChild>
              <Link href="/" className="flex items-center gap-1">
                <Home className="h-5 w-5" />
                <span className="hidden md:inline">Home</span>
              </Link>
            </Button>
            {user && (
              <>
                <Button variant="ghost" asChild>
                  <Link href="/admin" className="flex items-center gap-1">
                    <Wrench className="h-5 w-5" />
                    <span className="hidden md:inline">Admin</span>
                  </Link>
                </Button>
                 <Button variant="ghost" asChild>
                  <Link href="/admin/orders" className="flex items-center gap-1">
                    <Package className="h-5 w-5" />
                    <span className="hidden md:inline">Orders</span>
                  </Link>
                </Button>
                <Button variant="ghost" asChild>
                  <Link href="/admin/audit-log" className="flex items-center gap-1">
                    <ShieldCheck className="h-5 w-5" />
                    <span className="hidden md:inline">Audit Log</span>
                  </Link>
                </Button>
              </>
            )}
             {!loading && (
              user ? (
                <Button variant="ghost" onClick={logout} className="flex items-center gap-1">
                  <LogOut className="h-5 w-5" />
                   <span className="hidden md:inline">Logout</span>
                </Button>
              ) : (
                <Button variant="ghost" asChild>
                  <Link href="/login" className="flex items-center gap-1">
                    <LogIn className="h-5 w-5" />
                    <span className="hidden md:inline">Login</span>
                  </Link>
                </Button>
              )
            )}
             <Button variant="ghost" className="relative flex items-center gap-1" onClick={() => setIsCartOpen(true)}>
                <ShoppingCart className="h-5 w-5" />
                <span className="hidden md:inline">Cart</span>
                {totalItems > 0 && (
                    <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-1" variant="destructive">{totalItems}</Badge>
                )}
            </Button>
          </nav>
        </div>
      </div>
    </header>
  );
}
