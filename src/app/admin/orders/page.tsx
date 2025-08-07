
'use client';

import { useOrders } from '@/context/order-context';
import { Card, CardContent } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { format } from 'date-fns';
import { Package, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { OrderStatus } from '@/lib/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useState } from 'react';

export default function OrdersPage() {
  const { orders, updateOrderStatus, deleteOrder } = useOrders();
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);

  const sortedOrders = orders.sort((a, b) => b.orderDate.getTime() - a.orderDate.getTime());
  
  const statusColors: Record<OrderStatus, string> = {
    Pending: 'bg-yellow-500',
    Accepted: 'bg-green-500',
    Denied: 'bg-red-500',
  };

  const handleDelete = () => {
    if (orderToDelete) {
        deleteOrder(orderToDelete);
        setOrderToDelete(null);
    }
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-4xl font-bold font-headline">Customer Orders</h1>
        <p className="text-lg text-muted-foreground mt-2">A list of all orders placed by customers.</p>
      </header>

      {sortedOrders.length > 0 ? (
        <Accordion type="single" collapsible className="w-full space-y-4">
          {sortedOrders.map((order) => (
             <AlertDialog key={order.id}>
                <AccordionItem value={`item-${order.id}`} className="bg-card border rounded-lg px-4">
                  <AccordionTrigger>
                    <div className="flex justify-between w-full pr-4 text-left items-center">
                      <div className="flex items-center gap-4">
                        <Badge className={cn("text-white", statusColors[order.status])}>{order.status}</Badge>
                        <div>
                            <p className="font-semibold">{order.customer.name}</p>
                            <p className="text-sm text-muted-foreground">{order.customer.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary">₹{Number(order.total).toFixed(2)}</p>
                        <p className="text-sm text-muted-foreground">{format(order.orderDate, "PPP p")}</p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="font-semibold mb-2">Shipping Details</h4>
                            <address className="not-italic text-muted-foreground">
                                {order.customer.address}<br />
                                {order.customer.city}, {order.customer.zip}
                            </address>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-2">Ordered Items</h4>
                            <ul className="space-y-2">
                            {order.items.map(item => (
                                <li key={item.id} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center justify-center bg-muted rounded-md w-10 h-10">
                                          <Package className="w-5 h-5 text-muted-foreground" />
                                        </div>
                                        <div>
                                            <p className="font-medium">{item.name}</p>
                                            <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                                        </div>
                                    </div>
                                    <p className="text-muted-foreground">₹{(Number(item.price) * item.quantity).toFixed(2)}</p>
                                </li>
                            ))}
                            </ul>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4 border-t">
                        <Button 
                            variant="outline" 
                            size="sm"
                            disabled={order.status !== 'Pending'}
                            onClick={() => updateOrderStatus(order.id, 'Accepted')}
                            className="text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700"
                        >
                            <CheckCircle className="mr-2 h-4 w-4"/>
                            Accept
                        </Button>
                        <Button 
                            variant="outline" 
                            size="sm"
                            disabled={order.status !== 'Pending'}
                            onClick={() => updateOrderStatus(order.id, 'Denied')}
                            className="text-red-600 border-red-600 hover:bg-red-50 hover:text-red-700"
                        >
                            <XCircle className="mr-2 h-4 w-4"/>
                            Deny
                        </Button>
                         <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" onClick={() => setOrderToDelete(order.id)}>
                                <Trash2 className="mr-2 h-4 w-4"/>
                                Delete
                            </Button>
                        </AlertDialogTrigger>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete this order.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => setOrderToDelete(null)}>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
             </AlertDialog>
          ))}
        </Accordion>
      ) : (
        <Card>
          <CardContent className="text-center text-muted-foreground py-16">
            <p className="text-xl">No orders have been placed yet.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
