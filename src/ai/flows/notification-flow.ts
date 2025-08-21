
'use server';
/**
 * @fileOverview A flow for generating order-related notifications.
 *
 * - generateOrderConfirmation - Generates a notification for a customer when their order is confirmed.
 * - OrderConfirmationInput - The input type for the flow.
 * - OrderConfirmationOutput - The return type for the flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const OrderConfirmationInputSchema = z.object({
  customerName: z.string().describe('The name of the customer.'),
  orderId: z.string().describe('The unique identifier for the order.'),
  total: z.number().describe('The total amount of the order.'),
  items: z.array(z.object({
    name: z.string(),
    quantity: z.number(),
  })).describe('A list of items in the order.')
});
export type OrderConfirmationInput = z.infer<typeof OrderConfirmationInputSchema>;

const OrderConfirmationOutputSchema = z.object({
  emailSubject: z.string().describe('The subject line for the confirmation email.'),
  emailBody: z.string().describe('The HTML body content for the confirmation email.'),
  smsBody: z.string().describe('The short text message body for the SMS notification.'),
});
export type OrderConfirmationOutput = z.infer<typeof OrderConfirmationOutputSchema>;


export async function generateOrderConfirmation(input: OrderConfirmationInput): Promise<OrderConfirmationOutput> {
  return orderConfirmationFlow(input);
}


const prompt = ai.definePrompt({
  name: 'orderConfirmationPrompt',
  input: { schema: OrderConfirmationInputSchema },
  output: { schema: OrderConfirmationOutputSchema },
  prompt: `You are an expert in customer communication for an e-commerce store called Shopstream.
  
  A customer named {{{customerName}}} has just had their order confirmed. The order ID is {{{orderId}}}.
  The total amount was ₹{{total}}.

  The items in the order are:
  {{#each items}}
  - {{quantity}} x {{name}}
  {{/each}}

  Generate a friendly and professional confirmation message for the customer. Create content for both an email and an SMS.

  - For the email, the subject line should be "Your Shopstream Order #{{{orderId}}} is Confirmed!". The body should be a friendly HTML message that thanks the customer, confirms the order details, and lets them know that their items will be shipped soon.
  - For the SMS, create a short, concise text message. It should confirm the order and mention the order ID. For example: "Hi {{{customerName}}}, your Shopstream order #{{{orderId}}} is confirmed! We'll notify you when it ships. Thank you for your purchase."
  
  Keep the tone positive and reassuring for both.
  `,
});

const orderConfirmationFlow = ai.defineFlow(
  {
    name: 'orderConfirmationFlow',
    inputSchema: OrderConfirmationInputSchema,
    outputSchema: OrderConfirmationOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
