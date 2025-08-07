
import type { Product } from './types';

export const products: Product[] = [
  {
    productId: 'prd_001',
    name: 'Acoustic Guitar',
    brand: 'Fender',
    category: 'Instruments',
    status: 'Available',
    startDate: '2023-01-15',
    lastUpdatedDate: '2023-05-20',
    price: 499.99,
  },
  {
    productId: 'prd_002',
    name: 'Wireless Headphones',
    brand: 'Sony',
    category: 'Electronics',
    status: 'Available',
    startDate: '2023-02-10',
    lastUpdatedDate: '2023-06-01',
    price: 249.99,
  },
  {
    productId: 'prd_003',
    name: 'Modern Bookshelf',
    brand: 'IKEA',
    category: 'Furniture',
    status: 'Unavailable',
    startDate: '2023-03-05',
    lastUpdatedDate: '2023-04-15',
    price: 129.50,
  },
  {
    productId: 'prd_004',
    name: 'Espresso Machine',
    brand: 'Breville',
    category: 'Appliances',
    status: 'Available',
    startDate: '2023-04-20',
    lastUpdatedDate: '2023-05-25',
    price: 699.00,
  },
  {
    productId: 'prd_005',
    name: 'Leather Backpack',
    brand: 'Herschel',
    category: 'Accessories',
    status: 'Available',
    startDate: '2023-05-01',
    lastUpdatedDate: '2023-06-02',
    price: 89.99,
  },
];

    