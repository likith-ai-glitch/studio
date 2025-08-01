'use server';

/**
 * @fileOverview Rewrites product descriptions using AI with specified tones.
 *
 * - rewriteProductDescription - A function to rewrite the product description.
 * - RewriteProductDescriptionInput - The input type for the rewriteProductDescription function.
 * - RewriteProductDescriptionOutput - The return type for the rewriteProductDescription function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RewriteProductDescriptionInputSchema = z.object({
  description: z.string().describe('The original product description.'),
  tone: z
    .string()
    .describe(
      'The desired tone for the rewritten description (e.g., professional, casual, humorous).'
    ),
});
export type RewriteProductDescriptionInput = z.infer<
  typeof RewriteProductDescriptionInputSchema
>;

const RewriteProductDescriptionOutputSchema = z.object({
  rewrittenDescription: z
    .string()
    .describe('The AI-rewritten product description with the specified tone.'),
});
export type RewriteProductDescriptionOutput = z.infer<
  typeof RewriteProductDescriptionOutputSchema
>;

export async function rewriteProductDescription(
  input: RewriteProductDescriptionInput
): Promise<RewriteProductDescriptionOutput> {
  return rewriteProductDescriptionFlow(input);
}

const rewriteProductDescriptionPrompt = ai.definePrompt({
  name: 'rewriteProductDescriptionPrompt',
  input: {schema: RewriteProductDescriptionInputSchema},
  output: {schema: RewriteProductDescriptionOutputSchema},
  prompt: `Rewrite the following product description with a {{{tone}}} tone:

Original Description: {{{description}}}

Rewritten Description:`,
});

const rewriteProductDescriptionFlow = ai.defineFlow(
  {
    name: 'rewriteProductDescriptionFlow',
    inputSchema: RewriteProductDescriptionInputSchema,
    outputSchema: RewriteProductDescriptionOutputSchema,
  },
  async input => {
    const {output} = await rewriteProductDescriptionPrompt(input);
    return output!;
  }
);
