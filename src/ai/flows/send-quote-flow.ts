'use server';
/**
 * @fileOverview A flow for generating a customer-facing quote email.
 *
 * - sendQuote - Generates an email to send a quote to a customer.
 * - QuoteInput - The input type for the flow.
 * - QuoteOutput - The return type for the flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { Quote } from '@/context/quote-context';

const QuoteInputSchema = z.object({
  quoteId: z.string(),
  items: z.array(z.object({
    id: z.string(),
    name: z.string(),
    price: z.number(),
    quantity: z.number(),
    brand: z.string(),
    category: z.string(),
    colour: z.string().optional(),
    partName: z.string().optional(),
    productId: z.string(),
  })),
  status: z.enum(['Draft', 'InProgress', 'Final']),
  type: z.enum(['Master', 'Transaction']),
  approvalStatus: z.enum(['Draft', 'SentForApproval', 'Approved']),
  indicativePricing: z.object({
    additionalCost: z.number(),
  }).optional(),
  discount: z.number().optional(),
  tax: z.number().optional(), // Represents GST %
});

const QuoteOutputSchema = z.object({
  emailSubject: z.string().describe('The subject line for the quote email.'),
  emailBody: z.string().describe('The HTML body content for the quote email.'),
});
export type QuoteOutput = z.infer<typeof QuoteOutputSchema>;


export async function sendQuote(input: Quote): Promise<QuoteOutput> {
  const itemsTotal = input.items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const indicativeTotal = Object.values(input.indicativePricing || {}).reduce((acc, val) => acc + (Number(val) || 0), 0);
  const subTotal = itemsTotal + indicativeTotal;
  const discountValue = subTotal * ((input.discount || 0) / 100);
  const totalAfterDiscount = subTotal - discountValue;
  const taxAmount = totalAfterDiscount * ((input.tax || 0) / 100);
  const grandTotal = totalAfterDiscount + taxAmount;

  const flowInput = { ...input, subTotal, grandTotal, taxAmount, totalAfterDiscount, discountValue };
  return sendQuoteFlow(flowInput);
}

const promptInputSchema = QuoteInputSchema.extend({ 
    subTotal: z.number(), 
    grandTotal: z.number(),
    taxAmount: z.number(),
    totalAfterDiscount: z.number(),
    discountValue: z.number(),
});

const prompt = ai.definePrompt({
  name: 'sendQuotePrompt',
  input: { schema: promptInputSchema },
  output: { schema: QuoteOutputSchema },
  prompt: `You are an expert sales assistant for an e-commerce store called Shopstream.
  
  You are tasked with generating a professional and friendly email to a customer with their requested quote.

  The quote details are as follows:
  - Quote Number: {{{quoteId}}}
  - Quote Status: {{{status}}}
  - Quote Type: {{{type}}}
  - Approval Status: {{{approvalStatus}}}

  The items in the quote are:
  {{#each items}}
  - {{quantity}} x {{name}} ({{brand}}) - ₹{{price}} each
  {{/each}}

  {{#if indicativePricing.additionalCost}}
  Additional Costs:
  - Additional Cost: ₹{{indicativePricing.additionalCost}}
  {{/if}}

  The subtotal for the items and additional costs is: ₹{{subTotal}}
  
  {{#if discount}}
  - Discount ({{discount}}%): -₹{{discountValue}}
  {{/if}}

  - Total After Discount: ₹{{totalAfterDiscount}}

  {{#if tax}}
  - GST ({{tax}}%): +₹{{taxAmount}}
  {{/if}}

  The final Grand Total for the quote is: ₹{{grandTotal}}

  Generate the content for the email.
  - The subject line should be "Your Quote from Shopstream ({{{quoteId}}})".
  - The body should be a polite HTML message. Start by thanking the customer for their interest.
  - Present the items, additional costs, discount, GST, and grand total in a clear, easy-to-read format. A table would be ideal.
  - Clearly state the final grand total.
  - Mention the quote's status and type.
  - End with a friendly closing, letting them know you are available for any questions.
  `,
});

const sendQuoteFlow = ai.defineFlow(
  {
    name: 'sendQuoteFlow',
    inputSchema: promptInputSchema,
    outputSchema: QuoteOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
