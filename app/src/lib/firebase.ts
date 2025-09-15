
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  "projectId": "shopstream-gen-2",
  "appId": "1:123456789012:web:abcdef1234567890abcdef",
  "storageBucket": "shopstream-gen-2.appspot.com",
  "apiKey": "AIzaSyABCDEFGHIJKLmnoPQRSTUvwxyz123456",
  "authDomain": "shopstream-gen-2.firebaseapp.com",
  "messagingSenderId": "123456789012"
};


// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

export { app, auth, db, storage, googleProvider };
