
'use server';
/**
 * @fileOverview A flow for generating a customer-facing quote document.
 *
 * - generateDocument - Generates an HTML document for a quote.
 * - DocumentOutput - The return type for the flow.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const DocumentInputSchema = z.object({
  quoteNumber: z.string(),
  items: z.array(
    z.object({
      name: z.string(),
      quantity: z.number(),
      price: z.number(),
    })
  ),
  subTotal: z.number(),
  discount: z.number(),
  tax: z.number(),
  grandTotal: z.number(),
});

const DocumentOutputSchema = z.object({
  emailSubject: z.string().describe('The subject line for the quote email.'),
  emailBody: z.string().describe('The HTML body content for the quote email.'),
});
export type DocumentOutput = z.infer<typeof DocumentOutputSchema>;

const prompt = ai.definePrompt({
  name: 'generateDocumentPrompt',
  input: { schema: DocumentInputSchema },
  output: { schema: DocumentOutputSchema },
  prompt: `You are an expert sales assistant for an e-commerce store called Shopstream. Your task is to generate a professional and friendly HTML email for a customer quote.

  **CRITICAL INSTRUCTIONS:**
  1.  The output for 'emailBody' MUST be a valid HTML document. Do not just return plain text.
  2.  Present the quote details in an HTML table. Use '<table>', '<thead>', '<tbody>', '<tr>', '<th>', and '<td>' tags.
  3.  The item details section MUST be a table with columns: 'Description', 'Quantity', and 'Unit Price'.
  4.  The financial summary (Subtotal, Discount, GST, Grand Total) MUST also be presented clearly in a two-column table layout.
  5.  Present all monetary values in Rupees. Use the format "₹{value}". Do not use any other currency symbol.
  6.  You must calculate the actual discount amount. For example, if Subtotal is ₹1000 and Discount is 10%, the discount amount is ₹100.
  7.  You must calculate the actual GST amount. The GST is applied AFTER the discount. For example, if Subtotal is ₹1000, Discount is 10%, and GST is 18%, the calculation is (1000 - 100) * 0.18 = ₹162.

  **Quote Details:**
  - Quote Number: {{quoteNumber}}

  **Items:**
  {{#each items}}
  - Name: {{name}}
  - Quantity: {{quantity}}
  - Unit Price: ₹{{price}}
  {{/each}}

  **Financials:**
  - Subtotal: ₹{{subTotal}}
  - Discount Rate: {{discount}}%
  - GST Rate: {{tax}}%
  - Grand Total: ₹{{grandTotal}}

  **EMAIL CONTENT TO GENERATE:**
  - **emailSubject**: "Your Quote from Shopstream ({{quoteNumber}})"
  - **emailBody**: Generate an HTML body. Start with a polite greeting. Then, display all the quote details inside a well-formatted HTML structure as per the critical instructions above. The summary section must show the calculated discount amount and the calculated GST amount. End with a friendly closing.
  `,
});


export async function generateDocument(input: z.infer<typeof DocumentInputSchema>): Promise<DocumentOutput> {
  const { output } = await prompt(input);
  return output!;
}

