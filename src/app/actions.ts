'use server';

import { generateDocument as generateDocumentFlow } from '@/ai/flows/generate-document-flow';
import type { DocumentOutput } from '@/ai/flows/generate-document-flow';

// This is a server action that can be called from client components.
export async function generateDocumentAction(quoteData: any): Promise<DocumentOutput> {
  try {
    // Ensure numeric types are correctly cast before sending to the flow.
    const parsedQuoteData = {
      quoteNumber: quoteData.quoteNumber,
      subTotal: Number(quoteData.subTotal),
      discount: Number(quoteData.discount),
      tax: Number(quoteData.tax),
      items: quoteData.items.map((item: any) => ({
        name: item.name,
        price: Number(item.price),
        quantity: Number(item.quantity),
      })),
    };

    const result = await generateDocumentFlow(parsedQuoteData);
    return result;
  } catch (error: any) {
    console.error('Error in generateDocumentAction:', error);
    // It's better to let the calling function handle the error and toast
    // so it can provide more context.
    throw new Error('Failed to generate document on the server.');
  }
}
