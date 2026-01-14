
'use server';
/**
 * @fileOverview A flow for generating a customer-facing quote document
 * using pre-calculated quote data.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

/* ------------------------------------------------------------------ */
/* INPUT SCHEMA – matches generateDocumentData output                  */
/* ------------------------------------------------------------------ */

const DocumentInputSchema = z.object({
  quoteNumber: z.string(),
  status: z.string(),
  type: z.string(),
  approvalStatus: z.string(),

  items: z.array(
    z.object({
      name: z.string(),
      quantity: z.number(),
      price: z.number(),
    })
  ),

  subTotal: z.number(),
  discountRate: z.number(),
  discountAmount: z.number(),
  gstRate: z.number(),
  gstAmount: z.number(),
  grandTotal: z.number(),
  currency: z.literal('INR'),
});

export type DocumentInput = z.infer<typeof DocumentInputSchema>;

/* ------------------------------------------------------------------ */
/* OUTPUT SCHEMA                                                       */
/* ------------------------------------------------------------------ */

const DocumentOutputSchema = z.object({
  emailSubject: z.string(),
  emailBody: z.string(),
});

export type DocumentOutput = z.infer<typeof DocumentOutputSchema>;

/* ------------------------------------------------------------------ */
/* PROMPT DEFINITION                                                   */
/* ------------------------------------------------------------------ */

const prompt = ai.definePrompt({
  name: 'generateDocumentPrompt',

  // ✅ WORKING & SUPPORTED MODEL
  model: 'googleai/gemini-1.0-pro',

  input: { schema: DocumentInputSchema },
  output: { schema: DocumentOutputSchema },

  prompt: `
You are an expert sales assistant for an e-commerce store called Shopstream.

Your task is to generate a professional, customer-friendly HTML email
for a quotation using the exact values provided.

CRITICAL RULES:
1. emailBody MUST be valid HTML.
2. Do NOT perform any calculations. Use the values exactly as provided.
3. Display all prices in INR using the '₹' symbol.
4. Use tables for the items list and the financial summary.

QUOTE DETAILS
- Quote Number: {{quoteNumber}}
- Status: {{status}}
- Type: {{type}}
- Approval: {{approvalStatus}}

ITEMS
<table border="1" cellpadding="8" cellspacing="0" style="width: 100%; border-collapse: collapse;">
  <thead>
    <tr style="background-color: #f2f2f2;">
      <th style="text-align: left; padding: 8px;">Description</th>
      <th style="text-align: right; padding: 8px;">Quantity</th>
      <th style="text-align: right; padding: 8px;">Unit Price</th>
      <th style="text-align: right; padding: 8px;">Total</th>
    </tr>
  </thead>
  <tbody>
    {{#each items}}
    <tr>
      <td style="padding: 8px;">{{name}}</td>
      <td style="text-align: right; padding: 8px;">{{quantity}}</td>
      <td style="text-align: right; padding: 8px;">₹{{price}}</td>
      <td style="text-align: right; padding: 8px;">₹{{multiply price quantity}}</td>
    </tr>
    {{/each}}
  </tbody>
</table>

SUMMARY
<table border="1" cellpadding="8" cellspacing="0" style="width: 100%; max-width: 400px; margin-left: auto; border-collapse: collapse;">
  <tbody>
    <tr>
      <td style="padding: 8px;">Subtotal</td>
      <td style="text-align: right; padding: 8px;">₹{{subTotal}}</td>
    </tr>
    <tr>
      <td style="padding: 8px;">Discount ({{discountRate}}%)</td>
      <td style="text-align: right; padding: 8px;">-₹{{discountAmount}}</td>
    </tr>
    <tr>
      <td style="padding: 8px;">GST ({{gstRate}}%)</td>
      <td style="text-align: right; padding: 8px;">₹{{gstAmount}}</td>
    </tr>
    <tr style="font-weight: bold; background-color: #f2f2f2;">
      <td style="padding: 8px;">Grand Total</td>
      <td style="text-align: right; padding: 8px;">₹{{grandTotal}}</td>
    </tr>
  </tbody>
</table>

EMAIL FORMAT:
- Subject: "Your Quote from Shopstream ({{quoteNumber}})"
- Body: Start with a friendly greeting, include the tables as defined above, and end with a polite closing statement.
`,
});

/* ------------------------------------------------------------------ */
/* FLOW FUNCTION                                                       */
/* ------------------------------------------------------------------ */

export async function generateDocument(
  input: DocumentInput
): Promise<DocumentOutput> {
  const { output } = await prompt(input);

  if (!output) {
    throw new Error('Document generation failed');
  }

  return output;
}
