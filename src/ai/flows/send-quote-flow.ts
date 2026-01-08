
'use server';
/**
 * @fileOverview A flow for generating a customer-facing quote email.
 *
 * - sendQuote - Generates an email to send a quote to a customer.
 * - QuoteOutput - The return type for the flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { Quote } from '@/context/quote-context';

const QuoteInputSchema = z.object({
  quoteNumber: z.string(),
  items: z.array(z.object({
    id: z.string(),
    name: z.string(),
    price: z.number(),
    quantity: z.number(),
    brand: z.string(),
    category: z.string(),
    colour: z.string().optional(),
    partName: z.string().optional(),
  })),
  status: z.enum(['Draft', 'InProgress', 'Final']),
  type: z.enum(['Master', 'Transaction']),
  approvalStatus: z.enum(['Draft', 'SentForApproval', 'Approved']),
  indicativePricing: z.object({
    additionalCost: z.number(),
  }).optional(),
  discount: z.number().optional(),
  tax: z.number().optional(), // Represents GST %
  subTotal: z.number(),
  grandTotal: z.number(),
  taxAmount: z.number(),
});

const QuoteOutputSchema = z.object({
  emailSubject: z.string().describe('The subject line for the quote email.'),
  emailBody: z.string().describe('The HTML body content for the quote email.'),
});
export type QuoteOutput = z.infer<typeof QuoteOutputSchema>;

const prompt = ai.definePrompt({
  name: 'sendQuotePrompt',
  input: { schema: QuoteInputSchema },
  output: { schema: QuoteOutputSchema },
  prompt: `You are an expert sales assistant for an e-commerce store called Shopstream. Your task is to generate a professional and friendly HTML email for a customer quote.

  **CRITICAL INSTRUCTIONS:**
  1.  The output for 'emailBody' MUST be a valid HTML document. Do not just return plain text.
  2.  Present the quote details in an HTML table. Use '<table>', '<thead>', '<tbody>', '<tr>', '<th>', and '<td>' tags.
  3.  The item details section MUST be a table with columns: 'Description', 'Quantity', and 'Price'.
  4.  The financial summary (Subtotal, GST, Grand Total) MUST also be presented clearly in a two-column table layout.
  5.  Present all monetary values in Rupees. Use the format "₹{value}". Do not use any other currency symbol.

  **Quote Details:**
  - Quote Number: {{{quoteNumber}}}

  **Items:**
  {{#each items}}
  - Name: {{name}} ({{brand}})
  - Quantity: {{quantity}}
  - Unit Price: {{{price}}}
  {{/each}}

  **Financials:**
  - Subtotal: {{{subTotal}}}
  - Additional Cost: {{{indicativePricing.additionalCost}}}
  - GST ({{tax}}%): +{{{taxAmount}}}
  - Grand Total: {{{grandTotal}}}

  **Metadata:**
  - Quote Status: {{status}}
  - Quote Type: {{type}}
  - Approval Status: {{approvalStatus}}

  **EMAIL CONTENT TO GENERATE:**
  - **emailSubject**: "Your Quote from Shopstream ({{{quoteNumber}}})"
  - **emailBody**: Generate an HTML body. Start with a polite greeting. Then, display all the quote details inside a well-formatted HTML structure as per the critical instructions above. End with a friendly closing.
  `,
});

export async function sendQuote(input: Quote): Promise<QuoteOutput> {
  const itemsTotal = input.items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const indicativeTotal = input.indicativePricing?.additionalCost || 0;
  const subTotal = itemsTotal + indicativeTotal;
  const taxAmount = subTotal * ((input.tax || 0) / 100);
  const grandTotal = subTotal + taxAmount;

  const flowInput = {
    ...input,
    subTotal,
    grandTotal,
    taxAmount,
  };

  const { output } = await prompt(flowInput);
  return output!;
}
