
export interface Product {
  productId: string;
  name: string;
  brand: string;
  category: string;
  status: string;
  price: number;
  activePriceList: string;
  priceList1?: number;
  priceList2?: number;
  priceList3?: number;
  priceList4?: number;
  priceList5?: number;
  isMasterProduct?: boolean;
  [key: string]: any;
}

export interface AppEvent {
  id: string;
  type: 'login' | 'logout' | 'product_added';
  timestamp: Date;
  userEmail: string;
  details?: Record<string, any>;
}

export type OrderStatus = 'Pending' | 'Accepted' | 'Denied';

export interface Order {
  id: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    zip: string;
  };
  items: {
    id: string;
    name: string;
    brand: string;
    category: string;
    quantity: number;
    price: number;
  }[];
  total: number;
  orderDate: Date;
  status: OrderStatus;
}

export interface Notification {
    id: string;
    customer: {
        email: string;
        phone?: string;
    };
    emailSubject: string;
    emailBody: string;
    sentAt: Date;
    orderId?: string;
    quoteId?: string;
    smsBody?: string;
}

export type QuoteLifecycleStatus = 'Draft' | 'InProgress' | 'Locked';

export interface Quote {
    id?: string;
    quoteNumber: string;
    customerEmail?: string;
    Name?: string; // For compatibility with Salesforce schema
    items: any[];
    status: string;
    type: string;
    approvalStatus: string;
    indicativePricing: {
        additionalCost: number;
    };
    discount: number;
    tax: number;
    totalPrice?: number;
    LastModifiedDate?: Date | any;
    
    // New Master Quote Fields
    isMaster: boolean;
    masterQuoteId: string | null;
    lifecycleStatus: QuoteLifecycleStatus | null;
}

export type UserRole = 'ADMIN' | 'MANAGER' | 'CUSTOMER';

export interface AppUser {
  uid: string;
  email: string;
  role: UserRole;
  createdAt: Date;
}
