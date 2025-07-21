// Firebase v9+ modular SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js"
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js"
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js"

// Firebase configuration
const firebaseConfig = {
  // Replace with your Firebase config
  apiKey: "AIzaSyC_aPXz8M3ru6UATZr_bf8u_5RzlB7ek8s",
  authDomain: "doom-s-world.firebaseapp.com",
  projectId: "doom-s-world",
  storageBucket: "doom-s-world.firebasestorage.app",
  messagingSenderId: "445783209326",
  appId: "1:445783209326:web:700e95a429e7d06104fd7f",
  measurementId: "G-86151LPWTC"
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
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
}

// Auth state observer
onAuthStateChanged(auth, (user) => {
  if (!user && !window.location.href.includes("login.html")) {
    // Redirect to login if not authenticated
    window.location.href = "login.html"
  }
})

// Logout function
async function logout() {
  try {
    await signOut(auth)
    window.location.href = "login.html"
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
  toast.classList.remove("toast-success", "toast-error", "toast-warning")

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
