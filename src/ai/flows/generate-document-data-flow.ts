
'use server';
/**
 * @fileOverview A flow for generating a complete document data payload.
 *
 * - generateDocumentData - A function that handles the data generation and calculation.
 * - DocumentDataInput - The input type for the generateDocumentData function.
 * - DocumentDataOutput - The return type for the generateDocumentData function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const ItemSchema = z.object({
  name: z.string(),
  price: z.number(),
  quantity: z.number(),
});

const DocumentDataInputSchema = z.object({
  quoteNumber: z.string(),
  status: z.string(),
  type: z.string(),
  approvalStatus: z.string(),
  items: z.array(ItemSchema),
  subTotal: z.number(),
  discount: z.number().describe('The discount rate as a percentage.'),
  tax: z.number().describe('The GST rate as a percentage.'),
});
export type DocumentDataInput = z.infer<typeof DocumentDataInputSchema>;

const OutputItemSchema = ItemSchema.extend({
  total: z.number(),
});

const DocumentDataOutputSchema = z.object({
    quoteNumber: z.string(),
    status: z.string(),
    type: z.string(),
    approvalStatus: z.string(),
    items: z.array(OutputItemSchema),
    subTotal: z.number(),
    discountRate: z.number(),
    discountAmount: z.number(),
    gstRate: z.number(),
    gstAmount: z.number(),
    grandTotal: z.number(),
    currency: z.literal('INR'),
});
export type DocumentDataOutput = z.infer<typeof DocumentDataOutputSchema>;


export async function generateDocumentData(input: DocumentDataInput): Promise<DocumentDataOutput> {
  return generateDocumentDataFlow(input);
}

const generateDocumentDataFlow = ai.defineFlow(
  {
    name: 'generateDocumentDataFlow',
    inputSchema: DocumentDataInputSchema,
    outputSchema: DocumentDataOutputSchema,
  },
  async (input) => {
    const { subTotal, discount, tax, items } = input;

    const discountAmount = subTotal * (discount / 100);
    const amountAfterDiscount = subTotal - discountAmount;
    const gstAmount = amountAfterDiscount * (tax / 100);
    const grandTotal = amountAfterDiscount + gstAmount;

    const itemsWithTotals = items.map(item => ({
        ...item,
        total: item.price * item.quantity,
    }));

    return {
      ...input,
      items: itemsWithTotals,
      discountRate: input.discount,
      discountAmount,
      gstRate: input.tax,
      gstAmount,
      grandTotal,
      currency: 'INR',
    };
  }
);
