
'use server';

import { generateDocumentData as generateDocumentDataFlow } from '@/ai/flows/generate-document-data-flow';
import { generateDocument as generateDocumentFlow } from '@/ai/flows/generate-document-flow';
import type { DocumentOutput } from '@/ai/flows/generate-document-flow';

// This is a server action that can be called from client components.
export async function generateDocumentAction(quoteData: any): Promise<DocumentOutput> {
  try {
    // Step 1: Prepare the input for the calculation flow.
    const calculationInput = {
      quoteNumber: quoteData.quoteNumber,
      status: quoteData.status,
      type: quoteData.type,
      approvalStatus: quoteData.approvalStatus,
      subTotal: Number(quoteData.subTotal),
      discount: Number(quoteData.discount),
      tax: Number(quoteData.tax),
      items: quoteData.items.map((item: any) => ({
        name: item.name,
        price: Number(item.price),
        quantity: Number(item.quantity),
      })),
    };

    // Step 2: Call the calculation flow to get a complete, calculated data payload.
    const documentData = await generateDocumentDataFlow(calculationInput);

    // Step 3: Call the document generation flow with the final, calculated data.
    const result = await generateDocumentFlow(documentData);
    
    return result;
  } catch (error: any) {
    console.error('Error in generateDocumentAction:', error);
    // It's better to let the calling function handle the error and toast
    // so it can provide more context.
    throw new Error('Failed to generate document on the server.');
  }
}
