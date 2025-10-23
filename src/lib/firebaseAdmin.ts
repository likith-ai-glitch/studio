import * as admin from 'firebase-admin';

// Check if the app is already initialized to prevent re-initialization
if (!admin.apps.length) {
  try {
    // Initialize Firebase Admin with credentials from environment variables
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Replace escaped newlines in the private key
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
    console.log('✅ Firebase Admin initialized successfully');
  } catch (error: any) {
    console.error('❌ Firebase Admin initialization failed:', error.message);
  }
}

// Export the initialized admin instance and Firestore database service
export const db = admin.firestore();
export { admin };
