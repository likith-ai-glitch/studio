
'use client';

import { useOrders } from '@/context/order-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { format } from 'date-fns';
import { Package } from 'lucide-react';

export default function OrdersPage() {
  const { orders } = useOrders();

  const sortedOrders = orders.sort((a, b) => b.orderDate.getTime() - a.orderDate.getTime());

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-4xl font-bold font-headline">Customer Orders</h1>
        <p className="text-lg text-muted-foreground mt-2">A list of all orders placed by customers.</p>
      </header>

      {sortedOrders.length > 0 ? (
        <Accordion type="single" collapsible className="w-full space-y-4">
          {sortedOrders.map((order) => (
            <AccordionItem value={`item-${order.id}`} key={order.id} className="bg-card border rounded-lg px-4">
              <AccordionTrigger>
                <div className="flex justify-between w-full pr-4 text-left">
                  <div>
                    <p className="font-semibold">{order.customer.name}</p>
                    <p className="text-sm text-muted-foreground">{order.customer.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">₹{order.total.toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">{format(order.orderDate, "PPP p")}</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4">
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
                                <p className="text-muted-foreground">₹{(item.price * item.quantity).toFixed(2)}</p>
                            </li>
                        ))}
                        </ul>
                    </div>
                </div>
              </AccordionContent>
            </AccordionItem>
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

    