
'use server';

import { generateDocument as generateDocumentFlow } from '@/ai/flows/generate-document-flow';
import type { DocumentOutput, DocumentInput } from '@/ai/flows/generate-document-flow';

// This is a server action that can be called from client components.
export async function generateDocumentAction(quoteData: any): Promise<DocumentOutput> {
  try {
    // Step 1: Prepare the input for the consolidated generation flow.
    // This is the raw data from the client.
    const flowInput: DocumentInput = {
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

    // Step 2: Call the single generation flow that handles both calculation and rendering.
    const result = await generateDocumentFlow(flowInput);
    
    return result;
  } catch (error: any) {
    console.error('Error in generateDocumentAction:', error);
    // It's better to let the calling function handle the error and toast
    // so it can provide more context.
    throw new Error('Failed to generate document on the server.');
  }
}
