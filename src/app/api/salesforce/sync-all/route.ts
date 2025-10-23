import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  console.log("🚀 Starting Salesforce → Firestore sync for Quotes and Quote Line Items...");
  
  // Ensure we use the correct base URL, even in deployed environments
  const host = request.headers.get('host') || 'localhost:9007';
  const protocol = host.startsWith('localhost') ? 'http' : 'https';
  const baseUrl = `${protocol}://${host}`;

  try {
    let quotesCount = 0;
    let qlisCount = 0;

    // --- Sync Quotes ---
    console.log("⚙️ Syncing Quotes...");
    const quotesResponse = await fetch(`${baseUrl}/api/salesforce/sync-quotes`);
    if (!quotesResponse.ok) {
      const errorData = await quotesResponse.json();
      throw new Error(`Quotes sync failed: ${errorData.error || 'Unknown error'}`);
    }
    const quotesResult = await quotesResponse.json();
    quotesCount = quotesResult.count || 0;
    console.log("✅ Quotes sync completed");

    // --- Sync Quote Line Items ---
    console.log("⚙️ Syncing Quote Line Items...");
    const qliResponse = await fetch(`${baseUrl}/api/salesforce/sync-qli`);
    if (!qliResponse.ok) {
      const errorData = await qliResponse.json();
      throw new Error(`Quote Line Items sync failed: ${errorData.error || 'Unknown error'}`);
    }
    const qliResult = await qliResponse.json();
    qlisCount = qliResult.count || 0;
    console.log("✅ Quote Line Items sync completed");

    console.log("🎯 All sync operations finished successfully");
    return NextResponse.json({
      success: true,
      message: "Quotes and Quote Line Items synced successfully",
      details: {
        quotes: quotesCount,
        qlis: qlisCount,
      }
    });

  } catch (error: any) {
    const errorMessage = `❌ Sync failed: ${error.message}`;
    console.error(errorMessage);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
