// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// Sizning maxsus kalitlaringiz
const firebaseConfig = {
  apiKey: "AIzaSyAN0MyvVColeo5YTGQLAiC-3ullbBGvq24",
  authDomain: "testpro-121a6.firebaseapp.com",
  projectId: "testpro-121a6",
  storageBucket: "testpro-121a6.firebasestorage.app",
  messagingSenderId: "497431811359",
  appId: "1:497431811359:web:4e5e6275090129ab35cc2a",
  measurementId: "G-YF8036FJ3V"
};

// Firebase-ni ishga tushirish
const app = initializeApp(firebaseConfig);

// Boshqa fayllarda ishlatish uchun export qilamiz
export const auth = getAuth(app);
export const db = getFirestore(app);
