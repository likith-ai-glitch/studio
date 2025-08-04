
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useProducts } from '@/context/product-context';
import { ProductCard } from '@/components/product-card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
  const { products: allProducts, loading: productsLoading } = useProducts();
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('All');
  
  const categories = ['All', ...Array.from(new Set(allProducts.map((p) => p.category)))];
  const maxPrice = Math.ceil(Math.max(...allProducts.map((p) => p.price), 100));

  const [priceRange, setPriceRange] = useState([maxPrice]);

  useEffect(() => {
    if(!productsLoading) {
        setPriceRange([maxPrice]);
    }
  }, [maxPrice, productsLoading]);


  const filteredProducts = useMemo(() => {
    return allProducts.filter((product) => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = category === 'All' || product.category === category;
      const matchesPrice = product.price <= priceRange[0];
      return matchesSearch && matchesCategory && matchesPrice;
    });
  }, [allProducts, searchTerm, category, priceRange]);
  
  const featuredProducts = useMemo(() => {
    // Basic featured logic: take first 4 available products
    return allProducts.filter(p => p.status === 'Available').slice(0, 4);
  }, [allProducts]);

  return (
    <div className="flex flex-col gap-12">
      <section className="relative bg-card p-8 rounded-lg shadow-lg overflow-hidden flex items-center min-h-[400px]">
        <div className="z-10 relative md:w-1/2 text-center md:text-left">
            <h1 className="text-4xl md:text-5xl font-bold font-headline text-primary mb-4">Welcome to Shopstream</h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-6">Your one-stop shop for everything you need. Discover high-quality products at unbeatable prices.</p>
            <Button size="lg" asChild>
                <Link href="#all-products">Start Shopping</Link>
            </Button>
        </div>
         <div className="absolute inset-0 z-0 opacity-20">
            <Image
                src="https://placehold.co/1200x400.png"
                alt="Shop background"
                fill
                className="object-cover"
                data-ai-hint="shopping abstract"
            />
        </div>
      </section>

      {featuredProducts.length > 0 && (
        <section className="space-y-6">
           <h2 className="text-3xl font-bold font-headline text-center">Featured Products</h2>
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
             {featuredProducts.map(p => <ProductCard key={p.id} product={p} />)}
           </div>
        </section>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pt-8" id="all-products">
        <aside className="md:col-span-1 bg-card p-6 rounded-lg shadow-sm self-start sticky top-24">
          <div className="space-y-6">
            <h2 className="text-xl font-headline font-semibold">Filter All Products</h2>
            <div>
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <Label htmlFor="category-select">Category</Label>
              <Select value={category} onValueChange={setCategory} disabled={productsLoading}>
                <SelectTrigger id="category-select" className="w-full">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Price Range</Label>
              <div className="flex justify-between items-center text-sm text-muted-foreground">
                <span>₹0</span>
                <span>₹{priceRange[0]}</span>
              </div>
              <Slider
                min={0}
                max={maxPrice}
                step={1}
                value={priceRange}
                onValueChange={setPriceRange}
                className="mt-2"
                disabled={productsLoading}
              />
            </div>
          </div>
        </aside>

        <section className="md:col-span-3">
          {productsLoading ? (
             <div className="flex items-center justify-center h-96">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
             </div>
          ) : filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-96 bg-card rounded-lg">
              <p className="text-xl text-muted-foreground">No products found.</p>
              <p className="text-sm text-muted-foreground">Try adjusting your filters.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

    