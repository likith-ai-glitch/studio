import { NextResponse } from "next/server";
import jsforce from "jsforce";
import { db } from "@/lib/firebaseAdmin";

export async function GET(
  request: Request,
  { params }: { params: { qliId?: string } }
) {
  const { qliId } = params;
  console.log(
    "▶️ Starting Salesforce -> Firestore Quote Line Items (QLI) Sync..."
  );

  // 1. Establish Salesforce Connection
  console.log("🔄 Connecting to Salesforce for Quote Line Items...");
  const conn = new jsforce.Connection({
    clientId: process.env.SALESFORCE_CLIENT_ID,
    clientSecret: process.env.SALESFORCE_CLIENT_SECRET,
    loginUrl: "https://login.salesforce.com",
  });

  try {
    await conn.login(
      process.env.SALESFORCE_USERNAME!,
      process.env.SALESFORCE_PASSWORD!
    );
    console.log("✅ Salesforce connection successful for QLIs");

    // 2. Build and Execute SOQL Query
    let query =
      "SELECT Id, QuoteId, Product2Id, Quantity, UnitPrice, TotalPrice, Description FROM QuoteLineItem";
    if (qliId) {
      query += ` WHERE Id = '${qliId}'`;
    }
    query += " LIMIT 500"; // Safeguard against excessive data fetching

    const result = await conn.query(query);
    console.log(
      `🔹 Fetched ${result.records.length} quote line items from Salesforce.`
    );

    if (result.records.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No new quote line items found to sync.",
        count: 0,
      });
    }

    // Log a sample record for verification
    console.log("📦 Sample QLI Record:", JSON.stringify(result.records[0], null, 2));

    // 3. Sync to Firestore using Batch Write
    const batch = db.batch();
    result.records.forEach((record: any) => {
      const docRef = db.collection("quoteLineItems").doc(record.Id);
      batch.set(docRef, record, { merge: true });
    });

    await batch.commit();
    const successMessage = `✅ Synced ${result.records.length} quote line items to Firestore.`;
    console.log(successMessage);

    // 4. Return Success Response
    return NextResponse.json({
      success: true,
      message: successMessage,
      count: result.records.length,
    });
  } catch (err: any) {
    // 5. Handle and Log Errors
    const errorMessage = `❌ Failed to sync Quote Line Items: ${err.message}`;
    console.error(errorMessage);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
