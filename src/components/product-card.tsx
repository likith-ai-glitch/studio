
'use client';

import Link from 'next/link';
import type { Product } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart, ShoppingCart, EyeOff, Package } from 'lucide-react';
import { useCart } from '@/context/cart-context';
import { useWishlist } from '@/context/wishlist-context';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const router = useRouter();
  const isWishlisted = isInWishlist(product.id);
  const isUnavailable = product.status === 'Unavailable';

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isWishlisted) {
      removeFromWishlist(product.id);
    } else {
      addToWishlist(product);
    }
  };

  const handleAddToCartClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isUnavailable) return;
    addToCart(product);
    router.push('/cart');
  }

  return (
    <Card className="flex flex-col h-full overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
      <Link href={`/products/${product.id}`} className="flex flex-col h-full">
        <CardHeader className="p-0">
          <div className="relative">
            <div className={cn("flex items-center justify-center bg-muted w-full h-48", isUnavailable && "grayscale")}>
                 <Package className="w-24 h-24 text-muted-foreground" />
            </div>
            {isUnavailable && (
                <Badge variant="destructive" className="absolute top-2 left-2">Unavailable</Badge>
            )}
            <Button
              size="icon"
              variant="secondary"
              className="absolute top-2 right-2 rounded-full h-9 w-9"
              onClick={handleWishlistClick}
              aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            >
              <Heart className={cn("h-5 w-5", isWishlisted ? 'fill-red-500 text-red-500' : 'text-muted-foreground')} />
            </Button>
          </div>
          <div className="p-4">
            <p className="text-sm text-muted-foreground">{product.category}</p>
            <CardTitle className="text-lg font-headline mt-1 line-clamp-2">{product.name}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex-grow p-4 pt-0">
          <p className="text-2xl font-semibold text-primary">₹{product.price.toFixed(2)}</p>
        </CardContent>
        <CardFooter className="p-4 pt-0">
           <Button className="w-full" onClick={handleAddToCartClick} disabled={isUnavailable} variant={isUnavailable ? 'secondary' : 'default'}>
            {isUnavailable ? <EyeOff className="mr-2 h-4 w-4" /> : <ShoppingCart className="mr-2 h-4 w-4" />}
            {isUnavailable ? 'Unavailable' : 'Add to Cart & Order'}
          </Button>
        </CardFooter>
      </Link>
    </Card>
  );
}

    