
import type { Product } from './types';

export const products: Product[] = [
  {
    id: 'prd_001',
    name: 'Acoustic Guitar',
    description: 'A beautifully crafted acoustic guitar with a rich, warm tone. Perfect for beginners and seasoned players alike.',
    brand: 'Fender',
    category: 'Instruments',
    status: 'Available',
  },
  {
    id: 'prd_002',
    name: 'Wireless Headphones',
    description: 'Experience immersive sound with these high-fidelity wireless headphones. Featuring noise-cancellation technology and a 20-hour battery life.',
    brand: 'Sony',
    category: 'Electronics',
    status: 'Available',
  },
  {
    id: 'prd_003',
    name: 'Modern Bookshelf',
    description: 'A sleek and sturdy bookshelf to organize your favorite reads. Made from sustainable bamboo with a minimalist design that fits any decor.',
    brand: 'IKEA',
    category: 'Furniture',
    status: 'Unavailable',
  },
  {
    id: 'prd_004',
    name: 'Espresso Machine',
    description: 'Brew cafe-quality espresso at home with this professional-grade machine. Features a powerful 15-bar pump and a built-in milk frother.',
    brand: 'Breville',
    category: 'Appliances',
    status: 'Available',
  },
  {
    id: 'prd_005',
    name: 'Leather Backpack',
    description: 'A stylish and durable backpack crafted from genuine leather. It has multiple compartments, including a padded laptop sleeve.',
    brand: 'Herschel',
    category: 'Accessories',
    status: 'Available',
  },
];
