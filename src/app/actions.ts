
'use server';

import { calculateQuote } from '@/ai/flows/calculate-quote-flow';

// This needs to be defined here now, as the flow is gone.
export interface DocumentOutput {
  emailSubject: string;
  emailBody: string;
}

// Helper function to build the HTML for items
function buildItemsTable(items: any[]): string {
    const rows = items.map(item => `
        <tr>
          <td style="padding: 8px;">${item.name}</td>
          <td style="text-align: right; padding: 8px;">${item.quantity}</td>
          <td style="text-align: right; padding: 8px;">₹${Number(item.price).toFixed(2)}</td>
          <td style="text-align: right; padding: 8px;">₹${(Number(item.price) * item.quantity).toFixed(2)}</td>
        </tr>
    `).join('');

    return `
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
        ${rows}
      </tbody>
    </table>
    `;
}

// Helper function to build the summary table
function buildSummaryTable(summary: { subTotal: number, discountRate: number, discountAmount: number, gstRate: number, gstAmount: number, grandTotal: number }): string {
    return `
    <table border="1" cellpadding="8" cellspacing="0" style="width: 100%; max-width: 400px; margin-left: auto; border-collapse: collapse;">
      <tbody>
        <tr>
          <td style="padding: 8px;">Subtotal</td>
          <td style="text-align: right; padding: 8px;">₹${summary.subTotal.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding: 8px;">Discount (${summary.discountRate}%)</td>
          <td style="text-align: right; padding: 8px;">-₹${summary.discountAmount.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding: 8px;">GST (${summary.gstRate}%)</td>
          <td style="text-align: right; padding: 8px;">₹${summary.gstAmount.toFixed(2)}</td>
        </tr>
        <tr style="font-weight: bold; background-color: #f2f2f2;">
          <td style="padding: 8px;">Grand Total</td>
          <td style="text-align: right; padding: 8px;">₹${summary.grandTotal.toFixed(2)}</td>
        </tr>
      </tbody>
    </table>
    `;
}

export async function generateDocumentAction(quoteData: any): Promise<DocumentOutput> {
  try {
    // Step 1: Get the calculated totals from the reliable flow
    const calculations = await calculateQuote({
      subTotal: Number(quoteData.subTotal),
      discountRate: Number(quoteData.discount),
      taxRate: Number(quoteData.tax),
    });

    // Step 2: Build the HTML document using deterministic functions
    const itemsTable = buildItemsTable(quoteData.items);
    const summaryTable = buildSummaryTable({
        subTotal: Number(quoteData.subTotal),
        discountRate: Number(quoteData.discount),
        gstRate: Number(quoteData.tax),
        ...calculations
    });

    const emailSubject = `Your Quote from Shopstream (${quoteData.quoteNumber})`;
    const emailBody = `
      <p>Hello,</p>
      <p>Thank you for your interest. Here is your quote from Shopstream:</p>
      <br/>
      
      <h3>Quote Details</h3>
      <ul>
        <li><strong>Quote Number:</strong> ${quoteData.quoteNumber}</li>
        <li><strong>Status:</strong> ${quoteData.status}</li>
        <li><strong>Type:</strong> ${quoteData.type}</li>
        <li><strong>Approval:</strong> ${quoteData.approvalStatus}</li>
      </ul>
      <br/>

      <h3>Items</h3>
      ${itemsTable}
      <br/>

      <h3>Summary</h3>
      ${summaryTable}
      <br/>

      <p>If you have any questions, please feel free to contact us.</p>
      <p>Sincerely,<br/>The Shopstream Team</p>
    `;

    return { emailSubject, emailBody };

  } catch (error: any) {
    console.error('Error in generateDocumentAction:', error);
    throw new Error('Failed to generate document on the server.');
  }
}
