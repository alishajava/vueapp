import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth'
import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp
} from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyAlYp9htdVrvoZZIYMeNNyH1_WT-tiGrVc',
  authDomain: 'vueapp-7e569.firebaseapp.com',
  projectId: 'vueapp-7e569',
  storageBucket: 'vueapp-7e569.firebasestorage.app',
  messagingSenderId: '552310568917',
  appId: '1:552310568917:web:45bc384957946121c9ef5c',
  measurementId: 'G-HECE3RSLXF'
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
export const googleProvider = new GoogleAuthProvider()

export {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp
}
