'use client';

import { useNotifications } from '@/context/notification-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
import { format } from 'date-fns';
import { FileText, Mail, FileDown, Loader2, Trash2, Link2, AlertCircle, Info, ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { useQuote } from '@/context/quote-context';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { Quote } from '@/lib/types';

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
  const { notifications, deleteNotification } = useNotifications();
  const { linkQuoteToMaster } = useQuote();
  const searchParams = useSearchParams();
  const router = useRouter();
  const linkingTo = searchParams.get('linkingTo');

  const [isConverting, setIsConverting] = useState(false);
  const [docToDelete, setDocToDelete] = useState<string | null>(null);
  const [masterName, setMasterName] = useState<string>('');
  const [availableQuotes, setAvailableQuotes] = useState<Quote[]>([]);
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  
  // Load master info and available quotes if in linking mode
  useEffect(() => {
    if (linkingTo) {
      const fetchMaster = async () => {
        const docSnap = await getDoc(doc(db, 'quotes', linkingTo));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setMasterName(data.Name || data.quoteNumber || linkingTo);
        }
      };
      
      const fetchAvailable = async () => {
        setLoadingQuotes(true);
        try {
            const q = query(
                collection(db, 'quotes'), 
                where('isMaster', '==', false),
                where('masterQuoteId', '==', null)
            );
            const snapshot = await getDocs(q);
            const quotes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Quote[];
            setAvailableQuotes(quotes);
        } finally {
            setLoadingQuotes(false);
        }
      };

      fetchMaster();
      fetchAvailable();
    }
  }, [linkingTo]);

  const handleLinkExisting = async (quoteId: string) => {
    if (!linkingTo) return;
    await linkQuoteToMaster(quoteId, linkingTo);
    // Optionally redirect back after linking
    router.push(`/admin/master-quotes/${linkingTo}`);
  };

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
        contentElement.style.position = 'absolute';
        contentElement.style.left = '-9999px';
        contentElement.style.width = '794px'; 
        contentElement.style.padding = '20px';
        contentElement.style.backgroundColor = 'white';
        contentElement.style.color = 'black';
        document.body.appendChild(contentElement);

        const canvas = await html2canvas(contentElement, { scale: 2, useCORS: true });
        document.body.removeChild(contentElement);

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const ratio = canvasWidth / canvasHeight;
        let imgWidth = pdfWidth - 20; 
        let imgHeight = imgWidth / ratio;
        if (imgHeight > pdfHeight - 20) {
            imgHeight = pdfHeight - 20;
            imgWidth = imgHeight * ratio;
        }
        pdf.addImage(imgData, 'PNG', (pdfWidth - imgWidth) / 2, 10, imgWidth, imgHeight);
        pdf.save(`${fileName}.pdf`);
    } finally {
        setIsConverting(false);
    }
  };
  
  const handleDelete = () => {
    if (docToDelete) {
        deleteNotification(docToDelete);
        setDocToDelete(null);
    }
  }


  return (
    <div className="space-y-8">
      <header className="flex justify-between items-start">
        <div>
            <h1 className="text-4xl font-bold font-headline">Generated Documents</h1>
            <p className="text-lg text-muted-foreground mt-2">A log of all documents generated for customers.</p>
        </div>
        {linkingTo && (
            <Button variant="ghost" onClick={() => router.push(`/admin/master-quotes/${linkingTo}`)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Master Quote
            </Button>
        )}
      </header>

      {linkingTo && (
          <Alert className="bg-blue-50 border-blue-200">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-800 font-bold">Linking Mode Active</AlertTitle>
              <AlertDescription className="text-blue-700">
                  You are selecting a quote to attach to <strong>Master Quote: {masterName}</strong>. 
                  Below you will see documents that have quotes attached, or you can pick from available quotes.
              </AlertDescription>
          </Alert>
      )}

      {linkingTo && (
          <Card className="border-blue-100 bg-blue-50/20">
              <CardHeader>
                  <CardTitle className="text-lg">Quotes Available for Linking</CardTitle>
                  <CardDescription>Select an existing quote to associate with Master: {masterName}</CardDescription>
              </CardHeader>
              <CardContent>
                  {loadingQuotes ? (
                      <div className="flex justify-center p-4"><Loader2 className="animate-spin h-6 w-6" /></div>
                  ) : availableQuotes.length > 0 ? (
                      <div className="grid gap-2">
                          {availableQuotes.map(q => (
                              <div key={q.id} className="flex items-center justify-between p-3 bg-card border rounded-md shadow-sm">
                                  <div>
                                      <p className="font-bold">{q.Name || q.quoteNumber}</p>
                                      <p className="text-xs text-muted-foreground">Total: ₹{q.totalPrice?.toFixed(2)}</p>
                                  </div>
                                  <Button size="sm" onClick={() => handleLinkExisting(q.id!)}>
                                      <Link2 className="mr-2 h-4 w-4" />
                                      Add to Master
                                  </Button>
                              </div>
                          ))}
                      </div>
                  ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">No available standalone quotes found.</p>
                  )}
              </CardContent>
          </Card>
      )}

      {notifications.length > 0 ? (
        <Accordion type="single" collapsible className="w-full space-y-4">
          {notifications.map((notification) => (
            <AlertDialog key={notification.id}>
                <AccordionItem value={`item-${notification.id}`} className="bg-card border rounded-lg px-4">
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
                        <CardHeader className="flex flex-row justify-between items-center">
                            <CardTitle>Email Content</CardTitle>
                            {linkingTo && notification.quoteId && (
                                <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => handleLinkExisting(notification.quoteId!)}>
                                    <Link2 className="mr-2 h-4 w-4" />
                                    Link This Quote to Master
                                </Button>
                            )}
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
                         <AlertDialogTrigger asChild>
                            <Button variant="destructive" onClick={() => setDocToDelete(notification.id)}>
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
                        This action cannot be undone. This will permanently delete this document.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => setDocToDelete(null)}>Cancel</AlertDialogCancel>
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
             <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-xl">No documents have been generated yet.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
