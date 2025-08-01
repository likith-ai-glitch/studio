
'use client';

import { useProducts } from '@/context/product-context';
import type { Product } from '@/lib/types';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { AddToCartButton } from '@/components/add-to-cart-button';
import { AddToWishlistButton } from '@/components/add-to-wishlist-button';
import { AiDescriptionEditor } from '@/components/ai-description-editor';
import { ProductCard } from '@/components/product-card';

export default function ProductDetailPage({ params }: { params: { id: string } }) {
  const { products } = useProducts();
  const productId = parseInt(params.id, 10);
  const product = products.find((p) => p.id === productId);

  if (!product) {
    notFound();
  }
  
  const relatedProducts = products.filter(p => p.category === product.category && p.id !== product.id).slice(0, 3);

  return (
    <div className="space-y-12">
      <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
        <div className="bg-card rounded-lg shadow-sm overflow-hidden">
          <Image
            src={product.image}
            alt={product.name}
            width={800}
            height={800}
            className="w-full h-full object-cover"
            data-ai-hint={`${product.category.toLowerCase()} ${product.name.split(' ')[0].toLowerCase()}`}
          />
        </div>
        <div className="flex flex-col justify-center space-y-6">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{product.category}</p>
            <h1 className="text-4xl font-bold font-headline mt-1">{product.name}</h1>
          </div>
          
          <div className="flex items-center gap-4">
              <p className="text-4xl font-bold text-primary">${product.price.toFixed(2)}</p>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Color:</span>
                <span className="font-semibold">{product.color}</span>
              </div>
          </div>
          
          <AiDescriptionEditor product={product} />

          <div className="flex items-center gap-4">
            <AddToCartButton product={product} />
            <AddToWishlistButton product={product} />
          </div>
        </div>
      </div>
      
      {relatedProducts.length > 0 && (
        <div className="space-y-6">
           <h2 className="text-3xl font-bold font-headline text-center">Related Products</h2>
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
             {relatedProducts.map(p => <ProductCard key={p.id} product={p} />)}
           </div>
        </div>
      )}
    </div>
  );
}

// This function is commented out because dynamic pages cannot be statically generated.
// export async function generateStaticParams() {
//   return products.map((product) => ({
//     id: product.id.toString(),
//   }));
// }
