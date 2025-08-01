'use client';

import { useState, useMemo } from 'react';
import type { Product } from '@/lib/types';
import { products as allProducts } from '@/lib/products';
import { ProductCard } from '@/components/product-card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

const categories = ['All', ...Array.from(new Set(allProducts.map((p) => p.category)))];
const maxPrice = Math.ceil(Math.max(...allProducts.map((p) => p.price)));

export default function Home() {
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('All');
  const [priceRange, setPriceRange] = useState([maxPrice]);

  const filteredProducts = useMemo(() => {
    return allProducts.filter((product) => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = category === 'All' || product.category === category;
      const matchesPrice = product.price <= priceRange[0];
      return matchesSearch && matchesCategory && matchesPrice;
    });
  }, [searchTerm, category, priceRange]);

  return (
    <div className="flex flex-col gap-8">
      <header className="text-center space-y-2">
        <h1 className="text-4xl font-bold font-headline text-primary">Welcome to Shopstream</h1>
        <p className="text-lg text-muted-foreground">Discover your next favorite product.</p>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <aside className="md:col-span-1 bg-card p-6 rounded-lg shadow-sm self-start sticky top-8">
          <div className="space-y-6">
            <h2 className="text-xl font-headline font-semibold">Filters</h2>
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
              <Select value={category} onValueChange={setCategory}>
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
                <span>$0</span>
                <span>${priceRange[0]}</span>
              </div>
              <Slider
                min={0}
                max={maxPrice}
                step={1}
                value={priceRange}
                onValueChange={setPriceRange}
                className="mt-2"
              />
            </div>
          </div>
        </aside>

        <section className="md:col-span-3">
          {filteredProducts.length > 0 ? (
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
