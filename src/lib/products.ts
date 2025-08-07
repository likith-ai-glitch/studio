
import type { Product } from './types';

export const products: Omit<Product, 'description'>[] = [
  {
    id: 'prd_001',
    name: 'Acoustic Guitar',
    brand: 'Fender',
    category: 'Instruments',
    status: 'Available',
  },
  {
    id: 'prd_002',
    name: 'Wireless Headphones',
    brand: 'Sony',
    category: 'Electronics',
    status: 'Available',
  },
  {
    id: 'prd_003',
    name: 'Modern Bookshelf',
    brand: 'IKEA',
    category: 'Furniture',
    status: 'Unavailable',
  },
  {
    id: 'prd_004',
    name: 'Espresso Machine',
    brand: 'Breville',
    category: 'Appliances',
    status: 'Available',
  },
  {
    id: 'prd_005',
    name: 'Leather Backpack',
    brand: 'Herschel',
    category: 'Accessories',
    status: 'Available',
  },
];
