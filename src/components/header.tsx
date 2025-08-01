
'use client';

import Link from 'next/link';
import { ShoppingCart, Heart, Store, Wrench, LogIn, LogOut, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/context/cart-context';
import { useWishlist } from '@/context/wishlist-context';
import { useAuth } from '@/context/auth-context';

export function Header() {
  const { cartCount } = useCart();
  const { wishlistCount } = useWishlist();
  const { user, logout, loading } = useAuth();

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
          <nav className="flex items-center gap-1 sm:gap-4">
            {user && (
              <Button variant="ghost" asChild>
                <Link href="/admin" className="flex items-center gap-1">
                  <Wrench className="h-5 w-5" />
                  <span className="hidden md:inline">Admin</span>
                </Link>
              </Button>
            )}
            <Button variant="ghost" asChild>
              <Link href="/wishlist" className="relative flex items-center gap-1">
                <Heart className="h-5 w-5" />
                <span className="hidden md:inline">Wishlist</span>
                {wishlistCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {wishlistCount}
                  </span>
                )}
              </Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/cart" className="relative flex items-center gap-1">
                <ShoppingCart className="h-5 w-5" />
                <span className="hidden md:inline">Cart</span>
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </Link>
            </Button>
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
          </nav>
        </div>
      </div>
    </header>
  );
}
