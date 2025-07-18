// Import Firebase
// Firebase core
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.1.1/firebase-app.js";

// Firebase Auth
import { getAuth } from "https://www.gstatic.com/firebasejs/9.1.1/firebase-auth.js";

// Firestore core
import { getFirestore, collection, getDocs, addDoc, Timestamp, query, orderBy, limit, where, onSnapshot } 
from "https://www.gstatic.com/firebasejs/9.1.1/firebase-firestore.js";

// Firebase Configuration
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
firebase.initializeApp(firebaseConfig)
const db = firebase.firestore()
const auth = firebase.auth()

// Global Variables
let currentUser = null
let messagesListener = null
let typingTimeout = null
let isTyping = false

// DOM Elements
const loginScreen = document.getElementById("loginScreen")
const chatInterface = document.getElementById("chatInterface")
const loginForm = document.getElementById("loginForm")
const loginBtn = document.getElementById("loginBtn")
const chatMessages = document.getElementById("chatMessages")
const messageInput = document.getElementById("messageInput")
const sendBtn = document.getElementById("sendBtn")
const characterCount = document.getElementById("characterCount")
const typingIndicator = document.getElementById("typingIndicator")
const connectionStatus = document.getElementById("connectionStatus")
const welcomeMessage = document.getElementById("welcomeMessage")

// Modal elements
const profileModal = document.getElementById("profileModal")
const settingsModal = document.getElementById("settingsModal")
const profileBtn = document.getElementById("profileBtn")
const settingsBtn = document.getElementById("settingsBtn")
const logoutBtn = document.getElementById("logoutBtn")

// Initialize the application
document.addEventListener("DOMContentLoaded", () => {
  setupEventListeners()
  checkExistingSession()
})

// Event Listeners
function setupEventListeners() {
  // Login form
  loginForm.addEventListener("submit", handleLogin)

  // Chat functionality
  sendBtn.addEventListener("click", sendMessage)
  messageInput.addEventListener("keypress", handleKeyPress)
  messageInput.addEventListener("input", handleInputChange)

  // Quick actions
  document.querySelectorAll(".quick-action").forEach((btn) => {
    btn.addEventListener("click", function () {
      const message = this.dataset.message
      messageInput.value = message
      messageInput.focus()
      updateCharacterCount()
    })
  })

  // Header buttons
  profileBtn.addEventListener("click", () => showModal(profileModal))
  settingsBtn.addEventListener("click", () => showModal(settingsModal))
  logoutBtn.addEventListener("click", handleLogout)

  // Modal close buttons
  document.querySelectorAll(".modal-close").forEach((btn) => {
    btn.addEventListener("click", function () {
      const modal = this.closest(".modal-overlay")
      hideModal(modal)
    })
  })

  // Modal overlay clicks
  document.querySelectorAll(".modal-overlay").forEach((modal) => {
    modal.addEventListener("click", function (e) {
      if (e.target === this) {
        hideModal(this)
      }
    })
  })

  // Settings toggles
  document.querySelectorAll('.toggle input[type="checkbox"]').forEach((toggle) => {
    toggle.addEventListener("change", handleSettingChange)
  })

  // Theme options
  document.querySelectorAll(".theme-option").forEach((option) => {
    option.addEventListener("click", function () {
      document.querySelectorAll(".theme-option").forEach((opt) => opt.classList.remove("active"))
      this.classList.add("active")
      // Implement theme change logic here
    })
  })

  // Auto-resize textarea
  messageInput.addEventListener("input", function () {
    this.style.height = "auto"
    this.style.height = Math.min(this.scrollHeight, 120) + "px"
  })
}

// Check for existing session
function checkExistingSession() {
  const savedUser = localStorage.getItem("candidateUser")
  if (savedUser) {
    currentUser = JSON.parse(savedUser)
    showChatInterface()
  }
}

// Handle login
async function handleLogin(e) {
  e.preventDefault()

  const email = document.getElementById("candidateEmail").value.trim()
  const name = document.getElementById("candidateName").value.trim()
  const position = document.getElementById("candidatePosition").value

  if (!email || !name || !position) {
    showError("Please fill in all fields")
    return
  }

  loginBtn.disabled = true
  loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Connecting...</span>'

  try {
    // Create or update candidate profile
    const candidateData = {
      name: name,
      email: email,
      position: position,
      joinDate: firebase.firestore.FieldValue.serverTimestamp(),
      lastActive: firebase.firestore.FieldValue.serverTimestamp(),
      isOnline: true,
      messageCount: 0,
    }

    // Save to Firestore
    await db.collection("candidates").doc(email).set(candidateData, { merge: true })

    // Initialize chat document
    await db.collection("chats").doc(email).set(
      {
        candidateName: name,
        candidateEmail: email,
        candidatePosition: position,
        lastMessageTime: firebase.firestore.FieldValue.serverTimestamp(),
        unreadCount: 0,
        isOnline: true,
      },
      { merge: true },
    )

    // Store user session
    currentUser = {
      email: email,
      name: name,
      position: position,
      avatar: getInitials(name),
    }

    localStorage.setItem("candidateUser", JSON.stringify(currentUser))

    showSuccess("Welcome to Doom's Digital World!")
    setTimeout(() => {
      showChatInterface()
    }, 1000)
  } catch (error) {
    console.error("Login error:", error)
    showError("Failed to connect. Please try again.")
  } finally {
    loginBtn.disabled = false
    loginBtn.innerHTML = '<span>Enter Chat Portal</span> <i class="fas fa-arrow-right"></i>'
  }
}

// Show chat interface
function showChatInterface() {
  loginScreen.style.display = "none"
  chatInterface.style.display = "flex"

  // Load messages
  loadMessages()

  // Update online status
  updateOnlineStatus(true)

  // Load profile data
  loadProfileData()

  // Focus on input
  setTimeout(() => {
    messageInput.focus()
  }, 500)
}

// Load messages
function loadMessages() {
  if (!currentUser) return

  // Clear existing listener
  if (messagesListener) {
    messagesListener()
  }

  // Listen for messages
  messagesListener = db
    .collection("chats")
    .doc(currentUser.email)
    .collection("messages")
    .orderBy("timestamp", "asc")
    .onSnapshot(
      (snapshot) => {
        const messages = []
        snapshot.forEach((doc) => {
          messages.push({
            id: doc.id,
            ...doc.data(),
          })
        })

        renderMessages(messages)

        // Hide welcome message if there are messages
        if (messages.length > 0) {
          welcomeMessage.style.display = "none"
        }
      },
      (error) => {
        console.error("Error loading messages:", error)
        showError("Failed to load messages")
      },
    )
}

// Render messages
function renderMessages(messages) {
  if (messages.length === 0) {
    welcomeMessage.style.display = "flex"
    return
  }

  const messagesHTML = messages
    .map((message) => {
      const isSent = message.senderId === currentUser.email
      const senderName = isSent ? currentUser.name : "Dr. Doom"
      const avatar = isSent ? currentUser.avatar : '<i class="fas fa-skull"></i>'

      return `
        <div class="message ${isSent ? "sent" : "received"}">
          <div class="message-avatar">
            ${avatar}
          </div>
          <div class="message-content">
            <div class="message-bubble">
              ${message.text}
            </div>
            <div class="message-time">
              ${formatTime(message.timestamp)}
            </div>
            ${
              isSent
                ? `<div class="message-status">
              <i class="fas fa-check${message.read ? "-double" : ""}"></i>
              ${message.read ? "Read" : "Sent"}
            </div>`
                : ""
            }
          </div>
        </div>
      `
    })
    .join("")

  // Replace welcome message with chat messages
  chatMessages.innerHTML = messagesHTML

  // Scroll to bottom
  chatMessages.scrollTop = chatMessages.scrollHeight
}

// Handle key press
function handleKeyPress(e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
}

// Handle input change
function handleInputChange() {
  updateCharacterCount()
  handleTypingIndicator()
}

// Update character count
function updateCharacterCount() {
  const count = messageInput.value.length
  characterCount.textContent = `${count}/1000`

  if (count > 900) {
    characterCount.style.color = "var(--accent-red)"
  } else if (count > 700) {
    characterCount.style.color = "var(--accent-orange)"
  } else {
    characterCount.style.color = "var(--text-muted)"
  }
}

// Handle typing indicator
function handleTypingIndicator() {
  if (!currentUser) return

  // Clear existing timeout
  if (typingTimeout) {
    clearTimeout(typingTimeout)
  }

  // Send typing status if not already typing
  if (!isTyping && messageInput.value.trim()) {
    isTyping = true
    updateTypingStatus(true)
  }

  // Set timeout to stop typing
  typingTimeout = setTimeout(() => {
    if (isTyping) {
      isTyping = false
      updateTypingStatus(false)
    }
  }, 2000)
}

// Update typing status
async function updateTypingStatus(typing) {
  try {
    await db.collection("chats").doc(currentUser.email).update({
      candidateTyping: typing,
      lastTypingTime: firebase.firestore.FieldValue.serverTimestamp(),
    })
  } catch (error) {
    console.error("Error updating typing status:", error)
  }
}

// Send message
async function sendMessage() {
  if (!currentUser || !messageInput.value.trim()) {
    return
  }

  const messageText = messageInput.value.trim()
  messageInput.value = ""
  messageInput.style.height = "auto"
  updateCharacterCount()

  // Disable send button temporarily
  sendBtn.disabled = true

  // Stop typing indicator
  if (isTyping) {
    isTyping = false
    updateTypingStatus(false)
  }

  try {
    const timestamp = firebase.firestore.FieldValue.serverTimestamp()

    // Add message to subcollection
    await db.collection("chats").doc(currentUser.email).collection("messages").add({
      text: messageText,
      senderId: currentUser.email,
      senderName: currentUser.name,
      timestamp: timestamp,
      read: false,
    })

    // Update chat document
    await db
      .collection("chats")
      .doc(currentUser.email)
      .update({
        lastMessage: messageText,
        lastMessageTime: timestamp,
        lastMessageSender: currentUser.email,
        unreadCount: firebase.firestore.FieldValue.increment(1),
      })

    // Update candidate message count
    await db
      .collection("candidates")
      .doc(currentUser.email)
      .update({
        messageCount: firebase.firestore.FieldValue.increment(1),
        lastActive: timestamp,
      })

    console.log("Message sent successfully")
  } catch (error) {
    console.error("Error sending message:", error)
    showError("Failed to send message")
    messageInput.value = messageText // Restore message
  } finally {
    sendBtn.disabled = false
  }
}

// Update online status
async function updateOnlineStatus(online) {
  if (!currentUser) return

  try {
    const updates = {
      isOnline: online,
      lastActive: firebase.firestore.FieldValue.serverTimestamp(),
    }

    await Promise.all([
      db.collection("candidates").doc(currentUser.email).update(updates),
      db.collection("chats").doc(currentUser.email).update(updates),
    ])
  } catch (error) {
    console.error("Error updating online status:", error)
  }
}

// Load profile data
async function loadProfileData() {
  if (!currentUser) return

  try {
    const doc = await db.collection("candidates").doc(currentUser.email).get()
    if (doc.exists) {
      const data = doc.data()

      // Update profile modal
      document.getElementById("profileAvatarLarge").textContent = currentUser.avatar
      document.getElementById("profileName").textContent = currentUser.name
      document.getElementById("profileEmail").textContent = currentUser.email
      document.getElementById("profilePosition").textContent = currentUser.position
      document.getElementById("messageCount").textContent = data.messageCount || 0
      document.getElementById("joinDate").textContent = formatDate(data.joinDate)
      document.getElementById("lastActive").textContent = formatTime(data.lastActive)
    }
  } catch (error) {
    console.error("Error loading profile data:", error)
  }
}

// Handle logout
function handleLogout() {
  if (confirm("Are you sure you want to logout?")) {
    // Update online status
    updateOnlineStatus(false)

    // Clear listeners
    if (messagesListener) {
      messagesListener()
    }

    // Clear session
    localStorage.removeItem("candidateUser")
    currentUser = null

    // Show login screen
    chatInterface.style.display = "none"
    loginScreen.style.display = "flex"

    // Reset form
    loginForm.reset()

    showSuccess("Logged out successfully")
  }
}

// Modal functions
function showModal(modal) {
  modal.classList.add("active")
}

function hideModal(modal) {
  modal.classList.remove("active")
}

// Handle setting changes
function handleSettingChange(e) {
  const setting = e.target.id
  const value = e.target.checked

  // Save to localStorage
  localStorage.setItem(`setting_${setting}`, value)

  console.log(`Setting ${setting} changed to:`, value)

  // Implement specific setting logic
  switch (setting) {
    case "messageNotifications":
      if (value && "Notification" in window) {
        Notification.requestPermission()
      }
      break
    case "soundAlerts":
      // Toggle sound alerts
      break
    case "onlineStatus":
      updateOnlineStatus(value)
      break
    case "readReceipts":
      // Toggle read receipts
      break
  }
}

// Listen for Doom's typing status
function listenForDoomTyping() {
  if (!currentUser) return

  db.collection("chats")
    .doc(currentUser.email)
    .onSnapshot((doc) => {
      if (doc.exists) {
        const data = doc.data()
        if (data.doomTyping) {
          showTypingIndicator()
        } else {
          hideTypingIndicator()
        }
      }
    })
}

// Show typing indicator
function showTypingIndicator() {
  typingIndicator.classList.add("show")
}

// Hide typing indicator
function hideTypingIndicator() {
  typingIndicator.classList.remove("show")
}

// Utility Functions
function getInitials(name) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
}

function formatTime(timestamp) {
  if (!timestamp) return ""

  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  const now = new Date()
  const diff = now - date

  if (diff < 60000) {
    // Less than 1 minute
    return "Just now"
  } else if (diff < 3600000) {
    // Less than 1 hour
    return Math.floor(diff / 60000) + "m ago"
  } else if (diff < 86400000) {
    // Less than 1 day
    return Math.floor(diff / 3600000) + "h ago"
  } else if (diff < 604800000) {
    // Less than 1 week
    return date.toLocaleDateString("en-US", { weekday: "short", hour: "2-digit", minute: "2-digit" })
  } else {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
  }
}

function formatDate(timestamp) {
  if (!timestamp) return "Unknown"

  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

function showError(message) {
  createToast(message, "error")
}

function showSuccess(message) {
  createToast(message, "success")
}

function createToast(message, type) {
  const toast = document.createElement("div")
  toast.className = `toast toast-${type}`

  const icon = type === "error" ? "fas fa-exclamation-circle" : "fas fa-check-circle"

  toast.innerHTML = `
    <i class="${icon}"></i>
    <span>${message}</span>
  `

  document.body.appendChild(toast)

  setTimeout(() => {
    toast.classList.add("show")
  }, 100)

  setTimeout(() => {
    toast.classList.remove("show")
    setTimeout(() => {
      if (document.body.contains(toast)) {
        document.body.removeChild(toast)
      }
    }, 300)
  }, 3000)
}

// Connection status monitoring
function monitorConnection() {
  window.addEventListener("online", () => {
    connectionStatus.innerHTML = '<i class="fas fa-circle"></i> <span>Connected</span>'
    connectionStatus.style.color = "var(--accent-green)"
  })

  window.addEventListener("offline", () => {
    connectionStatus.innerHTML = '<i class="fas fa-circle"></i> <span>Disconnected</span>'
    connectionStatus.style.color = "var(--accent-red)"
  })
}

// Initialize connection monitoring
monitorConnection()

// Listen for Doom's typing when chat interface is shown
setTimeout(() => {
  if (currentUser) {
    listenForDoomTyping()
  }
}, 1000)

// Cleanup on page unload
window.addEventListener("beforeunload", () => {
  if (currentUser) {
    updateOnlineStatus(false)
  }

  if (messagesListener) {
    messagesListener()
  }
})

// Add toast styles
const toastStyles = `
.toast {
  position: fixed;
  top: 20px;
  right: 20px;
  background: var(--bg-card);
  border: 1px solid var(--border-primary);
  border-radius: 12px;
  padding: 1rem 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: var(--text-primary);
  font-size: 0.875rem;
  font-weight: 500;
  box-shadow: var(--shadow-xl);
  backdrop-filter: blur(20px);
  z-index: 10000;
  transform: translateX(100%);
  opacity: 0;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.toast.show {
  transform: translateX(0);
  opacity: 1;
}

.toast-error {
  border-left: 4px solid var(--accent-red);
}

.toast-error i {
  color: var(--accent-red);
}

.toast-success {
  border-left: 4px solid var(--accent-green);
}

.toast-success i {
  color: var(--accent-green);
}
`

// Add styles to document
const styleSheet = document.createElement("style")
styleSheet.textContent = toastStyles
document.head.appendChild(styleSheet)
