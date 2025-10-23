import * as admin from 'firebase-admin';

let adminDb: admin.firestore.Firestore;
let adminAuth: admin.auth.Auth;

if (!admin.apps.length) {
  try {
    const firebasePrivateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !firebasePrivateKey) {
      throw new Error('Firebase Admin credentials (PROJECT_ID, CLIENT_EMAIL, PRIVATE_KEY) are not fully set in environment variables.');
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: firebasePrivateKey,
      }),
    });

    console.log(`✅ Firebase Admin initialized successfully for project: ${process.env.FIREBASE_PROJECT_ID}`);
  } catch (error: any) {
    console.error('❌ Firebase Admin initialization failed:', error.message);
  }
}

if (admin.apps.length > 0) {
  adminDb = admin.firestore();
  adminAuth = admin.auth();
} else {
  const errorMessage = 'Firebase Admin SDK not initialized. Check your credentials and server logs.';
  adminDb = new Proxy({}, { get: () => { throw new Error(errorMessage); } }) as any;
  adminAuth = new Proxy({}, { get: () => { throw new Error(errorMessage); } }) as any;
}


export { adminDb, adminAuth };
