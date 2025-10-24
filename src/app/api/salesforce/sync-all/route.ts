
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  console.log("🚀 Starting Salesforce → Firestore sync for Quotes and Quote Line Items...");
  
  // Ensure we use the correct base URL, even in deployed environments
  const host = request.headers.get('host') || 'localhost:9011';
  const protocol = host.startsWith('localhost') ? 'http' : 'https';
  const baseUrl = `${protocol}://${host}`;

  try {
    const response = await fetch(`${baseUrl}/api/salesforce/sync-quotes-all`);
    
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Sync failed: ${errorData.error || 'Unknown error'}`);
    }

    const result = await response.json();
    console.log("🎯 All sync operations finished successfully from the new endpoint.");
    
    return NextResponse.json({
      success: result.success,
      message: result.message,
      details: result.details
    });

  } catch (error: any) {
    const errorMessage = `❌ Sync failed: ${error.message}`;
    console.error(errorMessage);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
