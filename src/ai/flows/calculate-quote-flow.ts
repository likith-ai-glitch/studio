'use server';
/**
 * @fileOverview A flow for calculating quote financial details.
 *
 * - calculateQuote - A function that handles the quote calculation.
 * - CalculateQuoteInput - The input type for the calculateQuote function.
 * - CalculateQuoteOutput - The return type for the calculateQuote function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const CalculateQuoteInputSchema = z.object({
  subTotal: z.number().describe('The subtotal amount before any deductions or taxes.'),
  discountRate: z.number().describe('The discount percentage to be applied to the subtotal.'),
  taxRate: z.number().describe('The tax percentage to be applied after the discount.'),
});
export type CalculateQuoteInput = z.infer<typeof CalculateQuoteInputSchema>;

const CalculateQuoteOutputSchema = z.object({
  discountAmount: z.number(),
  amountAfterDiscount: z.number(),
  gstAmount: z.number(),
  grandTotal: z.number(),
});
export type CalculateQuoteOutput = z.infer<typeof CalculateQuoteOutputSchema>;

export async function calculateQuote(input: CalculateQuoteInput): Promise<CalculateQuoteOutput> {
  return calculateQuoteFlow(input);
}

const calculateQuoteFlow = ai.defineFlow(
  {
    name: 'calculateQuoteFlow',
    inputSchema: CalculateQuoteInputSchema,
    outputSchema: CalculateQuoteOutputSchema,
  },
  async (input) => {
    const { subTotal, discountRate, taxRate } = input;

    const discountAmount = subTotal * (discountRate / 100);
    const amountAfterDiscount = subTotal - discountAmount;
    const gstAmount = amountAfterDiscount * (taxRate / 100);
    const grandTotal = amountAfterDiscount + gstAmount;

    return {
      discountAmount,
      amountAfterDiscount,
      gstAmount,
      grandTotal,
    };
  }
);
