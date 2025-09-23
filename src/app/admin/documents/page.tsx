
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
import { FileText, Mail, FileDown, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useRef, useState } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// A simple SVG for the WhatsApp icon
const WhatsAppIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
    </svg>
);


export default function DocumentsPage() {
  const { notifications } = useNotifications();
  const [isConverting, setIsConverting] = useState(false);
  
  // Helper to strip HTML for plain text versions
  const stripHtml = (html: string) => {
    if (typeof document !== 'undefined') {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        return doc.body.textContent || "";
    }
    return html.replace(/<[^>]*>/g, ''); // Fallback for server
  }

  const handleConvertToPdf = async (htmlContent: string, fileName: string) => {
    setIsConverting(true);
    try {
        const contentElement = document.createElement('div');
        contentElement.innerHTML = htmlContent;
        // The element needs to be in the DOM to be rendered by html2canvas, but it can be off-screen
        contentElement.style.position = 'absolute';
        contentElement.style.left = '-9999px';
        contentElement.style.width = '794px'; // A4 width in pixels at 96 DPI
        contentElement.style.padding = '20px';
        contentElement.style.backgroundColor = 'white';
        contentElement.style.color = 'black';
        document.body.appendChild(contentElement);

        const canvas = await html2canvas(contentElement, {
            scale: 2, // Increase resolution
            useCORS: true, 
        });
        
        document.body.removeChild(contentElement);

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'a4',
        });
        
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const ratio = canvasWidth / canvasHeight;
        
        let imgWidth = pdfWidth - 20; // with margin
        let imgHeight = imgWidth / ratio;
        
        // If image is too high, scale based on height instead
        if (imgHeight > pdfHeight - 20) {
            imgHeight = pdfHeight - 20;
            imgWidth = imgHeight * ratio;
        }
        
        const x = (pdfWidth - imgWidth) / 2;
        const y = 10; // top margin
        
        pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
        pdf.save(`${fileName}.pdf`);
    } catch (error) {
        console.error("Error converting to PDF:", error);
    } finally {
        setIsConverting(false);
    }
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

                 <div className="flex justify-end gap-4">
                    <Button
                        variant="outline"
                        onClick={() => handleConvertToPdf(notification.emailBody, notification.quoteId || `doc_${notification.id}`)}
                        disabled={isConverting}
                    >
                        {isConverting ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <FileDown className="mr-2 h-4 w-4" />
                        )}
                        Convert to PDF
                    </Button>
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
