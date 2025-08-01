'use client';

import { useWishlist } from '@/context/wishlist-context';
import type { Product } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

export function AddToWishlistButton({ product }: { product: Product }) {
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  if (!isClient) {
    return (
       <Button size="lg" variant="outline" className="w-16">
         <Heart className="h-5 w-5 text-muted-foreground" />
       </Button>
    )
  }

  const isWishlisted = isInWishlist(product.id);

  const handleWishlistClick = () => {
    if (isWishlisted) {
      removeFromWishlist(product.id);
    } else {
      addToWishlist(product);
    }
  };

  return (
    <Button size="lg" variant="outline" onClick={handleWishlistClick} className="w-16" aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}>
      <Heart className={cn('h-5 w-5', isWishlisted ? 'fill-red-500 text-red-500' : 'text-muted-foreground')} />
    </Button>
  );
}
