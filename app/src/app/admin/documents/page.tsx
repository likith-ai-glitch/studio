
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
import { FileText, Mail, Copy, MessageCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

// A simple SVG for the WhatsApp icon
const WhatsAppIcon = () => (
    <MessageCircle className="h-6 w-6" />
);


export default function DocumentsPage() {
  const { notifications } = useNotifications();
  const { toast } = useToast();
  
  // Helper to strip HTML for plain text versions
  const stripHtml = (html: string) => {
    if (typeof document !== 'undefined') {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        return doc.body.textContent || "";
    }
    return html.replace(/<[^>]*>/g, ''); // Fallback for server
  }

  const handleCopyLink = (quoteId: string) => {
    const link = `${window.location.origin}/quote/${quoteId}`;
    navigator.clipboard.writeText(link).then(() => {
      toast({
        title: "Link Copied!",
        description: "The shareable link has been copied to your clipboard.",
      });
    }, (err) => {
      toast({
        title: "Error",
        description: "Could not copy the link.",
        variant: "destructive",
      });
    });
  };

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
                     {notification.quoteId && <Badge variant="secondary" className="mb-1">Quote: {notification.quoteId}</Badge>}
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

                 <div className="flex justify-end gap-4">
                    {notification.quoteId && (
                      <Button
                        variant="outline"
                        onClick={() => handleCopyLink(notification.quoteId!)}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Copy Share Link
                      </Button>
                    )}
                    <Button
                        variant="outline"
                        asChild
                    >
                        <a 
                            href={`mailto:${notification.customer.email}?subject=${encodeURIComponent(notification.emailSubject)}&body=${encodeURIComponent(stripHtml(notification.emailBody))}`}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <Mail className="mr-2 h-4 w-4" />
                            Email to Customer
                        </a>
                    </Button>
                    
                    {notification.customer.phone && (notification.smsBody || notification.emailBody) && (
                         <Button 
                            variant="outline"
                            className="bg-green-100 border-green-600 text-green-700 hover:bg-green-200 hover:text-green-800"
                            asChild
                         >
                            <a
                                href={`https://wa.me/${notification.customer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(notification.smsBody || stripHtml(notification.emailBody))}`}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <WhatsAppIcon />
                                <span className="ml-2">Send on WhatsApp</span>
                            </a>
                        </Button>
                    )}
                 </div>

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
