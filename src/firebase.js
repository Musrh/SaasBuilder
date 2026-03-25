import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"

const firebaseConfig = {

apiKey: "AIzaSyD-GbPIVkvxq4Rv1IG2ae6i1Ki8ajui_7k",
  authDomain: "mrhsaas.firebaseapp.com",
  projectId: "mrhsaas",
  storageBucket: "mrhsaas.firebasestorage.app",
  messagingSenderId: "754933009890",
  appId: "1:754933009890:web:698d87ece1a1d959c9bdbb",
  measurementId: "G-FP89LBXT3P"
  
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
