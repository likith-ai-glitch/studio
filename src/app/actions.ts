'use server';

import { generateDocument as generateDocumentFlow } from '@/ai/flows/generate-document-flow';
import type { DocumentOutput } from '@/ai/flows/generate-document-flow';

// This is a server action that can be called from client components.
export async function generateDocumentAction(quoteData: any): Promise<DocumentOutput> {
  try {
    const result = await generateDocumentFlow(quoteData);
    return result;
  } catch (error: any) {
    console.error('Error in generateDocumentAction:', error);
    // It's better to let the calling function handle the error and toast
    // so it can provide more context.
    throw new Error('Failed to generate document on the server.');
  }
}
