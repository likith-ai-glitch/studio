
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
  items: z.array(z.object({
    id: z.string(),
    name: z.string(),
    price: z.number(),
    quantity: z.number(),
    brand: z.string(),
    category: z.string(),
  })),
  status: z.enum(['Draft', 'InProgress', 'Final']),
  type: z.enum(['Master', 'Transaction']),
  approvalStatus: z.enum(['Draft', 'SentForApproval', 'Approved']),
  indicativePricing: z.number().optional(),
  priceList: z.string().optional(),
});

const QuoteOutputSchema = z.object({
  emailSubject: z.string().describe('The subject line for the quote email.'),
  emailBody: z.string().describe('The HTML body content for the quote email.'),
});
export type QuoteOutput = z.infer<typeof QuoteOutputSchema>;


export async function sendQuote(input: Quote): Promise<QuoteOutput> {
  // We can calculate total here to pass to the prompt
  const total = input.items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const flowInput = { ...input, total };
  return sendQuoteFlow(flowInput);
}


const prompt = ai.definePrompt({
  name: 'sendQuotePrompt',
  input: { schema: QuoteInputSchema.extend({ total: z.number() }) },
  output: { schema: QuoteOutputSchema },
  prompt: `You are an expert sales assistant for an e-commerce store called Shopstream.
  
  You are tasked with generating a professional and friendly email to a customer with their requested quote.

  The quote details are as follows:
  - Quote Status: {{{status}}}
  - Quote Type: {{{type}}}
  - Approval Status: {{{approvalStatus}}}
  {{#if indicativePricing}}
  - Indicative Pricing: ₹{{indicativePricing}}
  {{/if}}
  {{#if priceList}}
  - Price List: {{{priceList}}}
  {{/if}}

  The items in the quote are:
  {{#each items}}
  - {{quantity}} x {{name}} ({{brand}}) - ₹{{price}} each
  {{/each}}

  The calculated total for the items is: ₹{{total}}

  Generate the content for the email.
  - The subject line should be "Your Quote from Shopstream".
  - The body should be a polite HTML message. Start by thanking the customer for their interest.
  - Present the items in a clear, easy-to-read format. A table would be ideal.
  - Clearly state the total price.
  - Mention the quote's status and type.
  - End with a friendly closing, letting them know you are available for any questions.
  `,
});

const sendQuoteFlow = ai.defineFlow(
  {
    name: 'sendQuoteFlow',
    inputSchema: QuoteInputSchema.extend({ total: z.number() }),
    outputSchema: QuoteOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
