// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAwC_t52_iI3-CwhpTOrpG3zEtrigRT9hM",
  authDomain: "shopstream-2vvbc.firebaseapp.com",
  projectId: "shopstream-2vvbc",
  storageBucket: "shopstream-2vvbc.appspot.com",
  messagingSenderId: "637976165114",
  appId: "1:637976165114:web:6c6366c6e1bc5e33b52743",
  measurementId: "G-RFR5PZ39GC"
};


// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { app, auth, googleProvider };
