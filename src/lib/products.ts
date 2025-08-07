
import type { Product } from './types';

export const products: Omit<Product, 'description'>[] = [
  {
    partId: 'part_001',
    productId: 'prd_001',
    name: 'Acoustic Guitar',
    brand: 'Fender',
    category: 'Instruments',
    status: 'Available',
  },
  {
    partId: 'part_002',
    productId: 'prd_002',
    name: 'Wireless Headphones',
    brand: 'Sony',
    category: 'Electronics',
    status: 'Available',
  },
  {
    partId: 'part_003',
    productId: 'prd_003',
    name: 'Modern Bookshelf',
    brand: 'IKEA',
    category: 'Furniture',
    status: 'Unavailable',
  },
  {
    partId: 'part_004',
    productId: 'prd_004',
    name: 'Espresso Machine',
    brand: 'Breville',
    category: 'Appliances',
    status: 'Available',
  },
  {
    partId: 'part_005',
    productId: 'prd_005',
    name: 'Leather Backpack',
    brand: 'Herschel',
    category: 'Accessories',
    status: 'Available',
  },
];
