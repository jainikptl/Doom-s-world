// Firebase Configuration for Results Page
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js"
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  arrayUnion,
  arrayRemove,
  onSnapshot,
  Timestamp,
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js"
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js"

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC_aPXz8M3ru6UATZr_bf8u_5RzlB7ek8s",
  authDomain: "doom-s-world.firebaseapp.com",
  projectId: "doom-s-world",
  storageBucket: "doom-s-world.firebasestorage.app",
  messagingSenderId: "445783209326",
  appId: "1:445783209326:web:700e95a429e7d06104fd7f",
  measurementId: "G-86151LPWTC",
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)
const auth = getAuth(app)

// Make globally accessible
window.db = db
window.auth = auth
window.firestoreUtils = {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  arrayUnion,
  arrayRemove,
  onSnapshot,
  Timestamp,
}

// Auth state observer
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("Firebase recognizes user:", user.uid)
    console.log("Firebase recognizes user:", user.email)
  } else {
    console.log("User not signed in.")
  }
})

// Logout function
async function logout() {
  try {
    await signOut(auth)
    window.location.href = "../../doom_dashboard.html"
  } catch (error) {
    console.error("Error signing out:", error)
    showToast("Error signing out", "error")
  }
}

// Toast notification function
function showToast(message, type = "success") {
  const toast = document.getElementById("toast")
  const toastMessage = document.getElementById("toastMessage")

  if (!toast || !toastMessage) return

  // Remove existing classes
  toast.classList.remove("toast-success", "toast-error", "toast-warning", "toast-info")

  // Add appropriate class
  toast.classList.add(`toast-${type}`)

  // Set message
  toastMessage.textContent = message

  // Show toast
  toast.classList.add("show")

  // Hide after 3 seconds
  setTimeout(() => {
    toast.classList.remove("show")
  }, 3000)
}

// Make globally accessible
window.logout = logout
window.showToast = showToast

// Signal that Firebase is ready
window.firebaseReady = true

console.log("🔥 Firebase initialized for Results page")
