import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyDLHFpFYOQ6gBwn_haRg9RWqum1a9lJjeM",
  authDomain: "movenpromais.firebaseapp.com",
  projectId: "movenpromais",
  storageBucket: "movenpromais.firebasestorage.app",
  messagingSenderId: "917231273918",
  appId: "1:917231273918:web:2ac14e3a6da932d3109bef",
  measurementId: "G-CT0QQY3DNW"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
