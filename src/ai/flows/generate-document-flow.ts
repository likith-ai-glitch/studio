
'use server';
/**
 * @fileOverview A flow for generating a complete customer-facing quote document.
 * It performs all necessary calculations and then uses an AI prompt to
 * render the final HTML document.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

/* ------------------------------------------------------------------ */
/* INPUT SCHEMA - Raw data from the client                            */
/* ------------------------------------------------------------------ */

const RawItemSchema = z.object({
  name: z.string(),
  price: z.number(),
  quantity: z.number(),
});

const DocumentInputSchema = z.object({
  quoteNumber: z.string(),
  status: z.string(),
  type: z.string(),
  approvalStatus: z.string(),
  items: z.array(RawItemSchema),
  subTotal: z.number(),
  discount: z.number().describe('The discount rate as a percentage.'),
  tax: z.number().describe('The GST rate as a percentage.'),
});
export type DocumentInput = z.infer<typeof DocumentInputSchema>;

/* ------------------------------------------------------------------ */
/* PROMPT CONTEXT SCHEMA - The fully calculated data for the prompt   */
/* ------------------------------------------------------------------ */
const CalculatedItemSchema = RawItemSchema.extend({
  total: z.number(),
});

const PromptContextSchema = z.object({
  quoteNumber: z.string(),
  status: z.string(),
  type: z.string(),
  approvalStatus: z.string(),
  items: z.array(CalculatedItemSchema),
  subTotal: z.number(),
  discountRate: z.number(),
  discountAmount: z.number(),
  gstRate: z.number(),
  gstAmount: z.number(),
  grandTotal: z.number(),
  currency: z.literal('INR'),
});

/* ------------------------------------------------------------------ */
/* OUTPUT SCHEMA - The final AI-generated output                      */
/* ------------------------------------------------------------------ */

const DocumentOutputSchema = z.object({
  emailSubject: z.string(),
  emailBody: z.string(),
});
export type DocumentOutput = z.infer<typeof DocumentOutputSchema>;

/* ------------------------------------------------------------------ */
/* PROMPT DEFINITION - Renders pre-calculated data                    */
/* ------------------------------------------------------------------ */

const prompt = ai.definePrompt({
  name: 'generateDocumentPrompt',
  model: 'googleai/gemini-1.0-pro',
  input: { schema: PromptContextSchema }, // Takes the calculated data
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
      <td style="text-align: right; padding: 8px;">₹{{total}}</td>
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
/* FLOW DEFINITION - Performs calculations and calls prompt           */
/* ------------------------------------------------------------------ */

const generateDocumentFlow = ai.defineFlow(
  {
    name: 'generateDocumentFlow',
    inputSchema: DocumentInputSchema,
    outputSchema: DocumentOutputSchema,
  },
  async (input) => {
    // Step 1: Perform all calculations in TypeScript
    const { subTotal, discount, tax, items } = input;

    const discountAmount = subTotal * (discount / 100);
    const amountAfterDiscount = subTotal - discountAmount;
    const gstAmount = amountAfterDiscount * (tax / 100);
    const grandTotal = amountAfterDiscount + gstAmount;

    const itemsWithTotals = items.map(item => ({
        ...item,
        total: item.price * item.quantity,
    }));

    const promptContext = {
      ...input,
      items: itemsWithTotals,
      discountRate: input.discount,
      discountAmount,
      gstRate: input.tax,
      gstAmount,
      grandTotal,
      currency: 'INR' as const,
    };
    
    // Step 2: Call the prompt with the fully calculated data
    const { output } = await prompt(promptContext);

    if (!output) {
      throw new Error('Document generation failed: The AI model did not return a valid output.');
    }
    
    return output;
  }
);


// Export a wrapper function to be used by the server action
export async function generateDocument(
  input: DocumentInput
): Promise<DocumentOutput> {
  return generateDocumentFlow(input);
}
