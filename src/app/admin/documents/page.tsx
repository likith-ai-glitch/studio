
'use client';

import { useNotifications } from '@/context/notification-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { format } from 'date-fns';
import { FileText, Mail } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function DocumentsPage() {
  const { notifications } = useNotifications();

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-4xl font-bold font-headline">Generated Documents</h1>
        <p className="text-lg text-muted-foreground mt-2">A log of all documents generated for customers.</p>
      </header>

      {notifications.length > 0 ? (
        <Accordion type="single" collapsible className="w-full space-y-4">
          {notifications.map((notification) => (
            <AccordionItem key={notification.id} value={`item-${notification.id}`} className="bg-card border rounded-lg px-4">
              <AccordionTrigger>
                <div className="flex justify-between w-full pr-4 text-left items-center gap-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="p-2 bg-muted rounded-full">
                       <Mail className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate" title={notification.emailSubject}>{notification.emailSubject}</p>
                        <p className="text-sm text-muted-foreground">To: {notification.customer.email}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                     {notification.quoteId && <Badge variant="secondary" className="mb-1">{notification.quoteId}</Badge>}
                     <p className="text-sm text-muted-foreground">{format(notification.sentAt, "PPP p")}</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Email Content</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div 
                            className="prose dark:prose-invert max-w-none p-4 border rounded-lg bg-muted/20"
                            dangerouslySetInnerHTML={{ __html: notification.emailBody }} 
                        />
                    </CardContent>
                </Card>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ) : (
        <Card>
          <CardContent className="text-center text-muted-foreground py-16">
             <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-xl">No documents have been generated yet.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
