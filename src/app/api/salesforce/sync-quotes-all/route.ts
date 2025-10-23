
import { NextResponse } from 'next/server';
import jsforce from 'jsforce';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

async function logSyncEvent(data: {
  objectType: string;
  status: 'Success' | 'Failure';
  message: string;
  recordCount?: number;
}) {
  try {
    await adminDb.collection('syncLogs').add({
      ...data,
      timestamp: Timestamp.now(),
    });
  } catch (error) {
    console.error("FATAL: Could not write to syncLogs collection.", error);
  }
}

export async function GET(request: Request) {
  console.log("▶️ Starting Salesforce → Firestore Full Sync...");

  const conn = new jsforce.Connection({
    clientId: process.env.SALESFORCE_CLIENT_ID,
    clientSecret: process.env.SALESFORCE_CLIENT_SECRET,
    loginUrl: "https://login.salesforce.com",
  });

  let quoteSyncResult = { success: false, count: 0, message: "Sync not attempted." };
  let qliSyncResult = { success: false, count: 0, message: "Sync not attempted." };

  try {
    await conn.login(
      process.env.SALESFORCE_USERNAME!,
      process.env.SALESFORCE_PASSWORD!
    );
    console.log("✅ Salesforce connection successful for full sync.");
  } catch (err: any) {
    const errorMessage = `❌ Salesforce login failed: ${err.message}`;
    console.error(errorMessage);
    await logSyncEvent({ objectType: 'Connection', status: 'Failure', message: err.message });
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }

  // --- Sync Quotes ---
  try {
    console.log("\n⚙️ Syncing Quotes...");
    const quotesQuery = "SELECT Id, Name, Status, TotalPrice, AccountId, LastModifiedDate FROM Quote";
    const quotesResult = await conn.query(quotesQuery);
    console.log(`🔹 Fetched ${quotesResult.records.length} records from Quote.`);

    if (quotesResult.records.length > 0) {
      console.log("📦 Sample Quote Record:", JSON.stringify(quotesResult.records[0], null, 2));

      const batch = adminDb.batch();
      quotesResult.records.forEach((record: any) => {
        const firestoreRecord = {
          ...record,
          LastModifiedDate: record.LastModifiedDate ? Timestamp.fromDate(new Date(record.LastModifiedDate)) : null,
        };
        const docRef = adminDb.collection("quotes").doc(record.Id);
        batch.set(docRef, firestoreRecord, { merge: true });
      });

      await batch.commit();
      const successMessage = `Synced ${quotesResult.records.length} records to Firestore.`;
      console.log(`✅ ${successMessage}`);
      await logSyncEvent({ objectType: 'Quote', status: 'Success', message: successMessage, recordCount: quotesResult.records.length });
      quoteSyncResult = { success: true, count: quotesResult.records.length, message: successMessage };
    } else {
        const message = "No new records found to sync.";
        await logSyncEvent({ objectType: 'Quote', status: 'Success', message, recordCount: 0 });
        quoteSyncResult = { success: true, count: 0, message };
    }

  } catch (err: any) {
    const errorMessage = `Failed to sync Quotes: ${err.message}`;
    console.error(`❌ ${errorMessage}`);
    await logSyncEvent({ objectType: 'Quote', status: 'Failure', message: err.message });
    quoteSyncResult = { success: false, count: 0, message: errorMessage };
  }

  // --- Sync Quote Line Items ---
  try {
    console.log("\n⚙️ Syncing Quote Line Items...");
    const qliQuery = "SELECT Id, QuoteId, Product2Id, Quantity, UnitPrice, TotalPrice, Description FROM QuoteLineItem";
    const qliResult = await conn.query(qliQuery);
    console.log(`🔹 Fetched ${qliResult.records.length} records from QuoteLineItem.`);

    if (qliResult.records.length > 0) {
      console.log("📦 Sample QLI Record:", JSON.stringify(qliResult.records[0], null, 2));

      const batch = adminDb.batch();
      qliResult.records.forEach((record: any) => {
        const docRef = adminDb.collection("quoteLineItems").doc(record.Id);
        batch.set(docRef, record, { merge: true });
      });
      await batch.commit();

      const successMessage = `Synced ${qliResult.records.length} records to Firestore.`;
      console.log(`✅ ${successMessage}`);
      await logSyncEvent({ objectType: 'QuoteLineItem', status: 'Success', message: successMessage, recordCount: qliResult.records.length });
      qliSyncResult = { success: true, count: qliResult.records.length, message: successMessage };
    } else {
        const message = "No new records found to sync.";
        await logSyncEvent({ objectType: 'QuoteLineItem', status: 'Success', message, recordCount: 0 });
        qliSyncResult = { success: true, count: 0, message };
    }
  } catch (err: any) {
    const errorMessage = `Failed to sync Quote Line Items: ${err.message}`;
    console.error(`❌ ${errorMessage}`);
    await logSyncEvent({ objectType: 'QuoteLineItem', status: 'Failure', message: err.message });
    qliSyncResult = { success: false, count: 0, message: errorMessage };
  }

  console.log("\n🎯 Full sync operation finished.");

  const overallSuccess = quoteSyncResult.success && qliSyncResult.success;

  return NextResponse.json({
    success: overallSuccess,
    message: overallSuccess ? "Full sync completed successfully." : "Full sync completed with one or more errors.",
    details: {
      quotes: quoteSyncResult,
      quoteLineItems: qliSyncResult,
    }
  });
}
