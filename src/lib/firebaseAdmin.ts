import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// Check if the app is already initialized to prevent re-initialization
if (!admin.apps.length) {
  try {
    const serviceAccountPath = path.resolve(process.cwd(), '.service-account.json');
    
    if (fs.existsSync(serviceAccountPath)) {
      // Use service account file if it exists
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('✅ Firebase Admin initialized successfully using service account file.');
    } else {
      // Fallback to environment variables if the file doesn't exist
      const firebasePrivateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
      if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && firebasePrivateKey) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: firebasePrivateKey,
          }),
        });
        console.log('✅ Firebase Admin initialized successfully using environment variables.');
      } else {
        throw new Error('Firebase Admin credentials are not set in environment variables.');
      }
    }
  } catch (error: any) {
    console.error('❌ Firebase Admin initialization failed:', error.message);
  }
}

// Export the initialized admin instance and Firestore database service
export const db = admin.firestore();
export { admin };
