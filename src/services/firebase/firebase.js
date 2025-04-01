// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBNAtSyT3HqDTTmddKVIikxx9PrYSCkfJA",
  authDomain: "id-kaist-space.firebaseapp.com",
  projectId: "id-kaist-space",
  storageBucket: "id-kaist-space.firebasestorage.app",
  messagingSenderId: "826548846449",
  appId: "1:826548846449:web:7f564601ee877f137180d0",
  measurementId: "G-0615J36NH5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);