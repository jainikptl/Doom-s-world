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
let currentCandidateId = null
let currentCandidateName = null
let messagesListener = null
let candidatesListener = null

// DOM Elements
const candidatesList = document.getElementById("candidatesList")
const chatMessages = document.getElementById("chatMessages")
const messageInput = document.getElementById("messageInput")
const sendBtn = document.getElementById("sendBtn")
const selectedCandidate = document.getElementById("selectedCandidate")
const candidatesCount = document.getElementById("candidatesCount")
const activeCandidatesCount = document.getElementById("activeCandidatesCount")
const unreadMessagesCount = document.getElementById("unreadMessagesCount")
const searchInput = document.getElementById("searchInput")
const candidateModal = document.getElementById("candidateModal")
const modalClose = document.getElementById("modalClose")
const modalBody = document.getElementById("modalBody")

// Initialize the application
document.addEventListener("DOMContentLoaded", () => {
  initializeAuth()
  setupEventListeners()
  loadCandidates()
})

// Authentication
function initializeAuth() {
  // For demo purposes, we'll simulate admin authentication
  // In production, implement proper authentication
  console.log("Admin authenticated as Doom")
}

// Event Listeners
function setupEventListeners() {
  // Send message
  sendBtn.addEventListener("click", sendMessage)
  messageInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  })

  // Auto-resize textarea
  messageInput.addEventListener("input", function () {
    this.style.height = "auto"
    this.style.height = Math.min(this.scrollHeight, 120) + "px"
  })

  // Search functionality
  searchInput.addEventListener("input", function () {
    const searchTerm = this.value.toLowerCase()
    filterCandidates(searchTerm)
  })

  // Modal close
  modalClose.addEventListener("click", closeModal)
  candidateModal.addEventListener("click", function (e) {
    if (e.target === this) {
      closeModal()
    }
  })

  // Header actions
  document.getElementById("candidateInfoBtn").addEventListener("click", showCandidateInfo)
  document.getElementById("clearChatBtn").addEventListener("click", clearChat)
  document.getElementById("archiveChatBtn").addEventListener("click", archiveChat)
}

// Load candidates who have sent messages
function loadCandidates() {
  showLoadingSkeleton()

  // Listen for candidates with messages
  candidatesListener = db
    .collection("chats")
    .orderBy("lastMessageTime", "desc")
    .onSnapshot(
      (snapshot) => {
        const candidates = []
        let totalUnread = 0

        snapshot.forEach((doc) => {
          const data = doc.data()
          candidates.push({
            id: doc.id,
            name: data.candidateName,
            email: data.candidateEmail,
            avatar: data.candidateAvatar || getInitials(data.candidateName),
            lastMessage: data.lastMessage,
            lastMessageTime: data.lastMessageTime,
            unreadCount: data.unreadCount || 0,
            isOnline: data.isOnline || false,
          })

          totalUnread += data.unreadCount || 0
        })

        renderCandidates(candidates)
        updateStats(candidates.length, totalUnread)
        hideLoadingSkeleton()
      },
      (error) => {
        console.error("Error loading candidates:", error)
        showError("Failed to load candidates")
        hideLoadingSkeleton()
      },
    )
}

// Render candidates list
function renderCandidates(candidates) {
  if (candidates.length === 0) {
    candidatesList.innerHTML = `
            <div class="no-candidates">
                <div class="no-candidates-icon">
                    <i class="fas fa-inbox"></i>
                </div>
                <h4>No Messages Yet</h4>
                <p>Candidates will appear here when they send you messages.</p>
            </div>
        `
    return
  }

  candidatesList.innerHTML = candidates
    .map(
      (candidate) => `
        <div class="candidate-item ${currentCandidateId === candidate.id ? "active" : ""}" 
             data-candidate-id="${candidate.id}" 
             data-candidate-name="${candidate.name}"
             data-candidate-email="${candidate.email}">
            <div class="candidate-avatar">
                ${candidate.avatar}
                ${candidate.isOnline ? '<div class="online-indicator"></div>' : ""}
            </div>
            <div class="candidate-info">
                <div class="candidate-name">${candidate.name}</div>
                <div class="candidate-last-message">${candidate.lastMessage || "No messages yet"}</div>
            </div>
            <div class="candidate-meta">
                <div class="message-time">${formatTime(candidate.lastMessageTime)}</div>
                ${candidate.unreadCount > 0 ? `<div class="unread-badge">${candidate.unreadCount}</div>` : ""}
            </div>
        </div>
    `,
    )
    .join("")

  // Add click listeners to candidate items
  document.querySelectorAll(".candidate-item").forEach((item) => {
    item.addEventListener("click", function () {
      const candidateId = this.dataset.candidateId
      const candidateName = this.dataset.candidateName
      const candidateEmail = this.dataset.candidateEmail
      selectCandidate(candidateId, candidateName, candidateEmail)
    })
  })
}

// Select a candidate and load their chat
function selectCandidate(candidateId, candidateName, candidateEmail) {
  // Update active state
  document.querySelectorAll(".candidate-item").forEach((item) => {
    item.classList.remove("active")
  })
  document.querySelector(`[data-candidate-id="${candidateId}"]`).classList.add("active")

  // Store current candidate
  currentCandidateId = candidateId
  currentCandidateName = candidateName

  // Update header
  updateChatHeader(candidateName, candidateEmail)

  // Enable input
  messageInput.disabled = false
  sendBtn.disabled = false
  messageInput.placeholder = `Type your message to ${candidateName}...`

  // Load messages
  loadMessages(candidateId)

  // Mark messages as read
  markMessagesAsRead(candidateId)
}

// Update chat header
function updateChatHeader(name, email) {
  selectedCandidate.innerHTML = `
        <div class="candidate-avatar-large">
            ${getInitials(name)}
        </div>
        <div class="candidate-info-large">
            <h2>${name}</h2>
            <p>${email}</p>
        </div>
    `
}

// Load messages for selected candidate
function loadMessages(candidateId) {
  // Clear existing listener
  if (messagesListener) {
    messagesListener()
  }

  // Show loading
  chatMessages.innerHTML = `
        <div class="loading-messages">
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin"></i>
            </div>
            <p>Loading messages...</p>
        </div>
    `

  // Listen for messages
  messagesListener = db
    .collection("chats")
    .doc(candidateId)
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
    chatMessages.innerHTML = `
            <div class="no-messages">
                <div class="no-messages-icon">
                    <i class="fas fa-comment"></i>
                </div>
                <h4>Start the Conversation</h4>
                <p>Send the first message to ${currentCandidateName}</p>
            </div>
        `
    return
  }

  chatMessages.innerHTML = messages
    .map(
      (message) => `
        <div class="message ${message.senderId === "doom" ? "sent" : "received"}">
            <div class="message-avatar">
                ${message.senderId === "doom" ? '<i class="fas fa-crown"></i>' : getInitials(currentCandidateName)}
            </div>
            <div class="message-content">
                <div class="message-bubble">
                    ${message.text}
                </div>
                <div class="message-time">
                    ${formatTime(message.timestamp)}
                </div>
            </div>
        </div>
    `,
    )
    .join("")

  // Scroll to bottom
  chatMessages.scrollTop = chatMessages.scrollHeight
}

// Send message
async function sendMessage() {
  if (!currentCandidateId || !messageInput.value.trim()) {
    return
  }

  const messageText = messageInput.value.trim()
  messageInput.value = ""
  messageInput.style.height = "auto"

  // Disable send button temporarily
  sendBtn.disabled = true

  try {
    const timestamp = firebase.firestore.FieldValue.serverTimestamp()

    // Add message to subcollection
    await db.collection("chats").doc(currentCandidateId).collection("messages").add({
      text: messageText,
      senderId: "doom",
      senderName: "Dr. Doom",
      timestamp: timestamp,
      read: false,
    })

    // Update chat document
    await db.collection("chats").doc(currentCandidateId).update({
      lastMessage: messageText,
      lastMessageTime: timestamp,
      lastMessageSender: "doom",
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

// Mark messages as read
async function markMessagesAsRead(candidateId) {
  try {
    await db.collection("chats").doc(candidateId).update({
      unreadCount: 0,
    })
  } catch (error) {
    console.error("Error marking messages as read:", error)
  }
}

// Filter candidates
function filterCandidates(searchTerm) {
  const candidateItems = document.querySelectorAll(".candidate-item")
  candidateItems.forEach((item) => {
    const name = item.dataset.candidateName.toLowerCase()
    const email = item.dataset.candidateEmail.toLowerCase()

    if (name.includes(searchTerm) || email.includes(searchTerm)) {
      item.style.display = "flex"
    } else {
      item.style.display = "none"
    }
  })
}

// Show candidate info modal
function showCandidateInfo() {
  if (!currentCandidateId) {
    showError("Please select a candidate first")
    return
  }

  // Load candidate details
  db.collection("candidates")
    .doc(currentCandidateId)
    .get()
    .then((doc) => {
      if (doc.exists) {
        const candidate = doc.data()
        modalBody.innerHTML = `
                    <div class="candidate-details">
                        <div class="detail-row">
                            <strong>Name:</strong>
                            <span>${candidate.name}</span>
                        </div>
                        <div class="detail-row">
                            <strong>Email:</strong>
                            <span>${candidate.email}</span>
                        </div>
                        <div class="detail-row">
                            <strong>Phone:</strong>
                            <span>${candidate.phone || "Not provided"}</span>
                        </div>
                        <div class="detail-row">
                            <strong>Position:</strong>
                            <span>${candidate.position || "Not specified"}</span>
                        </div>
                        <div class="detail-row">
                            <strong>Status:</strong>
                            <span class="status-badge status-${candidate.status || "pending"}">${candidate.status || "Pending"}</span>
                        </div>
                        <div class="detail-row">
                            <strong>Applied:</strong>
                            <span>${formatDate(candidate.appliedDate)}</span>
                        </div>
                    </div>
                `
      } else {
        modalBody.innerHTML = `
                    <div class="no-data">
                        <p>Candidate details not found.</p>
                    </div>
                `
      }
      candidateModal.classList.add("active")
    })
    .catch((error) => {
      console.error("Error loading candidate details:", error)
      showError("Failed to load candidate details")
    })
}

// Clear chat
function clearChat() {
  if (!currentCandidateId) {
    showError("Please select a candidate first")
    return
  }

  if (confirm("Are you sure you want to clear this chat? This action cannot be undone.")) {
    // Implementation for clearing chat
    console.log("Clearing chat for:", currentCandidateId)
    showSuccess("Chat cleared successfully")
  }
}

// Archive chat
function archiveChat() {
  if (!currentCandidateId) {
    showError("Please select a candidate first")
    return
  }

  if (confirm("Are you sure you want to archive this chat?")) {
    // Implementation for archiving chat
    console.log("Archiving chat for:", currentCandidateId)
    showSuccess("Chat archived successfully")
  }
}

// Close modal
function closeModal() {
  candidateModal.classList.remove("active")
}

// Update stats
function updateStats(candidatesCount, unreadCount) {
  document.getElementById("candidatesCount").textContent = candidatesCount
  document.getElementById("activeCandidatesCount").textContent = candidatesCount
  document.getElementById("unreadMessagesCount").textContent = unreadCount
}

// Show loading skeleton
function showLoadingSkeleton() {
  document.querySelector(".loading-candidates").style.display = "block"
}

// Hide loading skeleton
function hideLoadingSkeleton() {
  document.querySelector(".loading-candidates").style.display = "none"
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
  } else {
    return date.toLocaleDateString()
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
  // Create toast notification
  const toast = document.createElement("div")
  toast.className = "toast toast-error"
  toast.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <span>${message}</span>
    `
  document.body.appendChild(toast)

  setTimeout(() => {
    toast.classList.add("show")
  }, 100)

  setTimeout(() => {
    toast.classList.remove("show")
    setTimeout(() => {
      document.body.removeChild(toast)
    }, 300)
  }, 3000)
}

function showSuccess(message) {
  // Create toast notification
  const toast = document.createElement("div")
  toast.className = "toast toast-success"
  toast.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>${message}</span>
    `
  document.body.appendChild(toast)

  setTimeout(() => {
    toast.classList.add("show")
  }, 100)

  setTimeout(() => {
    toast.classList.remove("show")
    setTimeout(() => {
      document.body.removeChild(toast)
    }, 300)
  }, 3000)
}

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

.no-candidates,
.no-messages,
.loading-messages {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 3rem 2rem;
    color: var(--text-muted);
}

.no-candidates-icon,
.no-messages-icon {
    width: 64px;
    height: 64px;
    border-radius: 16px;
    background: var(--bg-glass);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    margin-bottom: 1rem;
    color: var(--text-secondary);
}

.no-candidates h4,
.no-messages h4 {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 0.5rem;
}

.no-candidates p,
.no-messages p {
    font-size: 0.875rem;
    line-height: 1.5;
}

.loading-spinner {
    font-size: 2rem;
    color: var(--primary-400);
    margin-bottom: 1rem;
}

.candidate-details {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.detail-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 0;
    border-bottom: 1px solid var(--border-secondary);
}

.detail-row:last-child {
    border-bottom: none;
}

.detail-row strong {
    color: var(--text-primary);
    font-weight: 600;
}

.detail-row span {
    color: var(--text-secondary);
}

.no-data {
    text-align: center;
    padding: 2rem;
    color: var(--text-muted);
}
`

// Add styles to document
const styleSheet = document.createElement("style")
styleSheet.textContent = toastStyles
document.head.appendChild(styleSheet)

// Cleanup on page unload
window.addEventListener("beforeunload", () => {
  if (messagesListener) messagesListener()
  if (candidatesListener) candidatesListener()
})
