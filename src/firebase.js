// src/firebase.js
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyBq9C38u5Uj0zo3qGYBzPAosbe_ZxYoQkI",
  authDomain: "colorboardmanagement.firebaseapp.com",
  projectId: "colorboardmanagement",
  storageBucket: "colorboardmanagement.firebasestorage.app",
  messagingSenderId: "82842441938",
  appId: "G-40SM8YTSYN"
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
