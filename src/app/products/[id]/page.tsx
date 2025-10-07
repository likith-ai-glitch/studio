
'use client';

import { useProducts } from '@/context/product-context';
import type { Product } from '@/lib/types';
import { notFound, useParams } from 'next/navigation';
import { ProductCard } from '@/components/product-card';
import { useEffect, useState } from 'react';
import { Loader2, Package } from 'lucide-react';
import Link from 'next/link';

export default function ProductDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { products, getProduct, loading, homePageFieldOrder, homePageVisibleFields, headerNames } = useProducts();
  const [product, setProduct] = useState<Product | undefined | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchProduct = async () => {
        const p = await getProduct(id);
        setProduct(p);
    }
    const foundProduct = products.find((p) => p.productId === id);
    if(foundProduct){
        setProduct(foundProduct);
    } else {
        fetchProduct();
    }
  }, [id, products, getProduct]);


  if (loading || product === null) {
    return (
       <div className="flex items-center justify-center min-h-[calc(100vh-20rem)]">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    )
  }

  if (!product) {
    notFound();
  }
  
  const relatedProducts = products.filter(p => p.productId !== product.productId && p.category === product.category).slice(0, 3);
  
  const productDetails = homePageFieldOrder
    .filter(key => homePageVisibleFields[key] && product[key] && !['productId', 'name', 'brand'].includes(key) )
    .map(key => ({
      label: headerNames[key] || key.charAt(0).toUpperCase() + key.slice(1),
      value: product[key],
    }));

  return (
    <div className="space-y-12">
      <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
        <div className="bg-card rounded-lg shadow-sm overflow-hidden flex items-center justify-center aspect-square">
            <Package className="w-1/2 h-1/2 text-muted-foreground" />
        </div>
        <div className="flex flex-col justify-center space-y-6">
          <div>
            {homePageVisibleFields.brand && <p className="text-sm font-medium text-muted-foreground">{product.brand}</p>}
            {homePageVisibleFields.name && <h1 className="text-4xl font-bold font-headline mt-1">{product.name}</h1>}
            <p className="text-sm font-mono text-muted-foreground mt-2">Product ID: {product.productId}</p>
          </div>
          
           <div className="space-y-4">
             {productDetails.map(detail => (
                <div key={detail.label} className="text-lg">
                  <span className="font-semibold">{detail.label}: </span>
                  <span className="text-muted-foreground">{String(detail.value)}</span>
                </div>
              ))}
          </div>

        </div>
      </div>
      
      {relatedProducts.length > 0 && (
        <div className="space-y-6">
           <h2 className="text-3xl font-bold font-headline text-center">Related Products</h2>
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
             {relatedProducts.map(p => <ProductCard key={p.productId} product={p} />)}
           </div>
        </div>
      )}
    </div>
  );
}
