
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  "projectId": "shopstream-2vvbc",
  "appId": "1:637976165114:web:6c6366c6e1bc5e33b52743",
  "storageBucket": "shopstream-2vvbc.firebasestorage.app",
  "apiKey": "AIzaSyDHi9PXw33gXSMrhUS_dF9bGyWS_yKzMDI",
  "authDomain": "shopstream-2vvbc.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "637976165114"
};


// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { app, auth, googleProvider };
