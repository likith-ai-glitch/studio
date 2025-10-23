
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';

async function checkCollection(collectionName: string, fields: string[]) {
  console.log(`\n\n🔍 Checking collection: "${collectionName}"...`);
  const collectionRef = db.collection(collectionName);
  
  try {
    const snapshot = await collectionRef.limit(5).get();

    if (snapshot.empty) {
      console.log(`⚠️  Collection "${collectionName}" is empty or does not exist.`);
      console.log('   - Cause: The Salesforce sync may not have run or failed.');
      console.log('   - Action: Trigger the sync at http://localhost:9007/api/salesforce/sync-all');
      return { count: 0 };
    }
    
    const totalDocsSnapshot = await collectionRef.count().get();
    const totalCount = totalDocsSnapshot.data().count;

    console.log(`✅ Collection found. Total documents: ${totalCount}`);
    console.log(`   Showing up to 5 sample documents:\n`);

    snapshot.forEach(doc => {
      const data = doc.data();
      console.log(`--- Document ID: ${doc.id} ---`);
      fields.forEach(field => {
        let value = data[field];
        if (value instanceof Timestamp) {
          value = value.toDate().toISOString();
        }
        console.log(`  - ${field}: ${value !== undefined ? value : 'N/A'}`);
      });
      console.log('------------------------------------');
    });

    return { count: totalCount };

  } catch (error: any) {
    console.error(`❌ Error checking collection "${collectionName}":`, error.message);
    return { count: 0, error: error.message };
  }
}

export async function GET(request: Request) {
  console.log('🚀 Starting Firestore data verification...');
  
  const quoteFields = ['Id', 'Name', 'Status', 'TotalPrice', 'LastModifiedDate'];
  const qliFields = ['Id', 'QuoteId', 'Product2Id', 'Quantity', 'UnitPrice', 'TotalPrice'];

  const quoteResult = await checkCollection('quotes', quoteFields);
  const qliResult = await checkCollection('quoteLineItems', qliFields);

  console.log('\n\n🎯 Verification complete.');

  return NextResponse.json({
    success: true,
    message: 'Check complete. See server terminal for detailed logs.',
    results: {
      quotes: quoteResult,
      quoteLineItems: qliResult,
    }
  });
}
