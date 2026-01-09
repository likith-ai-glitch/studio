
'use server';

import { NextResponse } from "next/server";
import jsforce from "jsforce";
import { adminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

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

export async function GET(
  request: Request,
  { params }: { params: { qliId?: string[] } }
) {
  const qliId = params.qliId?.[0];
  const objectType = "QuoteLineItem";
  console.log(
    `▶️ Starting Salesforce -> Firestore Sync for ${objectType}...`
  );

  const conn = new jsforce.Connection({
    clientId: process.env.SALESFORCE_CLIENT_ID,
    clientSecret: process.env.SALESFORCE_CLIENT_SECRET,
    loginUrl: "https://login.salesforce.com",
  });

  try {
    console.log(`🔄 Connecting to Salesforce for ${objectType}...`);
    await conn.login(
      process.env.SALESFORCE_USERNAME!,
      process.env.SALESFORCE_PASSWORD!
    );
    console.log(`✅ Salesforce connection successful for ${objectType}`);

    let query =
      "SELECT Id, QuoteId, Product2Id, Quantity, UnitPrice, TotalPrice, Description FROM QuoteLineItem";
    if (qliId) {
      query += ` WHERE Id = '${qliId}'`;
    }
    query += " LIMIT 500";

    const result = await conn.query(query);
    console.log(
      `🔹 Fetched ${result.records.length} records from ${objectType}.`
    );

    if (result.records.length === 0) {
      const message = "No new records found to sync.";
      await logSyncEvent({ objectType, status: 'Success', message, recordCount: 0 });
      return NextResponse.json({
        success: true,
        message,
        count: 0,
      });
    }
    
    console.log("📦 Sample Record:", JSON.stringify(result.records[0], null, 2));

    const batch = adminDb.batch();
    result.records.forEach((record: any) => {
      const docRef = adminDb.collection("quoteLineItems").doc(record.Id);
      batch.set(docRef, record, { merge: true });
    });

    await batch.commit();
    
    const successMessage = `Synced ${result.records.length} records to Firestore.`;
    console.log(`✅ ${successMessage}`);
    await logSyncEvent({ objectType, status: 'Success', message: successMessage, recordCount: result.records.length });

    return NextResponse.json({
      success: true,
      message: successMessage,
      count: result.records.length,
    });
  } catch (err: any) {
    const errorMessage = `Failed to sync ${objectType}: ${err.message}`;
    console.error(`❌ ${errorMessage}`);
    await logSyncEvent({ objectType, status: 'Failure', message: err.message });
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
