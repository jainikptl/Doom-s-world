// Import Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.1.1/firebase-app.js"
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.1.1/firebase-auth.js"
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  Timestamp,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  setDoc,
  orderBy,
  increment,
} from "https://www.gstatic.com/firebasejs/9.1.1/firebase-firestore.js"

// Firebase Configuration
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

// Global Variables
let currentUser = null
let messagesListener = null
let typingTimeout = null
let isTyping = false
let userType = null // 'candidate' or 'doom'

// DOM Elements
const statusScreen = document.getElementById("statusScreen")
const chatInterface = document.getElementById("chatInterface")
const loadingScreen = document.getElementById("loadingScreen")
const chatMessages = document.getElementById("chatMessages")
const messageInput = document.getElementById("messageInput")
const sendBtn = document.getElementById("sendBtn")
const characterCount = document.getElementById("characterCount")
const typingIndicator = document.getElementById("typingIndicator")
const connectionStatus = document.getElementById("connectionStatus")
const welcomeMessage = document.getElementById("welcomeMessage")
const userStatus = document.getElementById("userStatus")
const statusMessage = document.getElementById("statusMessage")

// Modal elements
const profileModal = document.getElementById("profileModal")
const settingsModal = document.getElementById("settingsModal")
const profileBtn = document.getElementById("profileBtn")
const settingsBtn = document.getElementById("settingsBtn")
const logoutBtn = document.getElementById("logoutBtn")

// Initialize the application
document.addEventListener("DOMContentLoaded", () => {
  showLoadingScreen()
  setupEventListeners()
  initializeAuth()
})

// Show loading screen
function showLoadingScreen() {
  if (loadingScreen) {
    loadingScreen.style.display = "flex"
  }
  if (statusScreen) {
    statusScreen.style.display = "none"
  }
  if (chatInterface) {
    chatInterface.style.display = "none"
  }
}

// Hide loading screen
function hideLoadingScreen() {
  if (loadingScreen) {
    loadingScreen.style.display = "none"
  }
}

// Initialize authentication
function initializeAuth() {
  // Use Firebase Auth State Changed for authentication check
  onAuthStateChanged(auth, (firebaseUser) => {
    console.log("Firebase auth state changed:", firebaseUser)

    if (!firebaseUser) {
      console.log("No authenticated user found, redirecting to login")
      hideLoadingScreen()
      redirectToLogin()
      return
    }

    // Set user type from Firebase user (you can modify based on your logic)
    // const userType = firebaseUser?.displayName?.toLowerCase() || "candidate" // Default to 'candidate' if not set

    // if (userType !== "candidate" && userType !== "doom") {
    //   console.log("Invalid user type:", userType)
    //   hideLoadingScreen()
    //   redirectToLogin()
    //   return
    // }

    // Initialize chat or any other feature with the authenticated user
    initializeChat(firebaseUser)
  })
}


// Redirect to login
function redirectToLogin() {
  showError("Please login to access chat")
  setTimeout(() => {
    window.location.href = "../../../Login/login.html"
  }, 2000)
}

// Initialize chat
async function initializeChat(userData) {
  try {
    console.log("Initializing chat with user data:", userData)
    hideLoadingScreen()

    await loadUserData(userData)
  } catch (error) {
    console.error("Error initializing chat:", error)
    hideLoadingScreen()
    showError("Error initializing chat")
  }
}

// Load user data from candidates or users collection
async function loadUserData(userData) {
  try {
    let userFound = false

    // For Doom user, skip database lookup and allow direct access
    if (userType === "doom") {
      currentUser = {
        id: userData.id || "doom",
        name: userData.name || "Dr. Doom",
        email: userData.email || "doom@digitalworld.com",
        status: "admin",
        source: "doom",
        userType: "doom",
      }
      showChatInterface()
      return
    }

    // For candidates, check database and status
    if (userData.email) {
      // First try to find user in candidates collection
      try {
        const candidatesRef = collection(db, "candidates")
        const candidateQuery = query(candidatesRef, where("email", "==", userData.email))
        const candidateSnapshot = await getDocs(candidateQuery)

        if (!candidateSnapshot.empty) {
          candidateSnapshot.forEach((doc) => {
            currentUser = {
              id: doc.id,
              ...doc.data(),
              source: "candidates",
              userType: "candidate",
            }
            userFound = true
          })
        }
      } catch (error) {
        console.log("Error querying candidates collection:", error)
      }

      // If not found in candidates, try users collection
      if (!userFound) {
        try {
          const usersRef = collection(db, "users")
          const userQuery = query(usersRef, where("email", "==", userData.email))
          const userSnapshot = await getDocs(userQuery)

          if (!userSnapshot.empty) {
            userSnapshot.forEach((doc) => {
              currentUser = {
                id: doc.id,
                ...doc.data(),
                source: "users",
                userType: "candidate",
              }
              userFound = true
            })
          }
        } catch (error) {
          console.log("Error querying users collection:", error)
        }
      }
    }

    // Fallback to userData from localStorage
    if (!userFound) {
      currentUser = {
        id: userData.id || Date.now().toString(),
        name: userData.name || "Unknown User",
        email: userData.email || "unknown@example.com",
        source: "localStorage",
        userType: "candidate",
      }
    }

    console.log("Current user loaded:", currentUser)

    // Check user status for candidates
    await checkUserStatus()
  } catch (error) {
    console.error("Error loading user data:", error)
    showError("Error loading user data")
  }
}

// Check user status from users collection
async function checkUserStatus() {
  try {
    if (!currentUser.email) {
      showStatusScreen("Unable to verify user status")
      return
    }

    // Always check status from users collection for candidates
    const usersRef = collection(db, "users")
    const userQuery = query(usersRef, where("email", "==", currentUser.email))
    const userSnapshot = await getDocs(userQuery)

    let userStatus = "idle" // default status

    if (!userSnapshot.empty) {
      userSnapshot.forEach((doc) => {
        const userData = doc.data()
        userStatus = userData.status || "idle"
        currentUser.status = userStatus
      })
    }

    console.log("User status:", userStatus)

    // Check if user can access chat
    const allowedStatuses = ["shortlisted", "assigned"]

    if (allowedStatuses.includes(userStatus)) {
      // User can access chat
      showChatInterface()
    } else {
      // User cannot access chat
      showStatusScreen(
        `Your current status is "${userStatus}". Only shortlisted or assigned candidates can access chat.`,
      )
    }
  } catch (error) {
    console.error("Error checking user status:", error)
    showStatusScreen("Error checking user status. Please try again later.")
  }
}

// Show status screen when user can't access chat
function showStatusScreen(message) {
  if (statusScreen) {
    statusScreen.style.display = "flex"
  }
  if (chatInterface) {
    chatInterface.style.display = "none"
  }

  if (currentUser && currentUser.status && userStatus) {
    userStatus.textContent = currentUser.status
  }

  if (message && statusMessage) {
    statusMessage.textContent = message
  }
}

// Show chat interface
function showChatInterface() {
  console.log("Showing chat interface for user:", currentUser)

  if (statusScreen) {
    statusScreen.style.display = "none"
  }
  if (chatInterface) {
    chatInterface.style.display = "flex"
  }

  // Load messages
  loadMessages()

  // Update online status
  updateOnlineStatus(true)

  // Load profile data
  loadProfileData()

  // Listen for typing indicators
  if (currentUser.userType === "candidate") {
    listenForDoomTyping()
  }

  // Focus on input
  setTimeout(() => {
    if (messageInput) {
      messageInput.focus()
    }
  }, 500)

  showSuccess("Connected to chat successfully!")
}

// Event Listeners
function setupEventListeners() {
  // Chat functionality
  if (sendBtn) {
    sendBtn.addEventListener("click", sendMessage)
  }

  if (messageInput) {
    messageInput.addEventListener("keypress", handleKeyPress)
    messageInput.addEventListener("input", handleInputChange)

    // Auto-resize textarea
    messageInput.addEventListener("input", function () {
      this.style.height = "auto"
      this.style.height = Math.min(this.scrollHeight, 120) + "px"
    })
  }

  // Quick actions
  document.querySelectorAll(".quick-action").forEach((btn) => {
    btn.addEventListener("click", function () {
      const message = this.dataset.message
      if (messageInput) {
        messageInput.value = message
        messageInput.focus()
        updateCharacterCount()
      }
    })
  })

  // Header buttons
  if (profileBtn) {
    profileBtn.addEventListener("click", () => showModal(profileModal))
  }
  if (settingsBtn) {
    settingsBtn.addEventListener("click", () => showModal(settingsModal))
  }
  if (logoutBtn) {
    logoutBtn.addEventListener("click", handleLogout)
  }

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
}

// Load messages
function loadMessages() {
  if (!currentUser) return

  console.log("Loading messages for user:", currentUser.email)

  // Clear existing listener
  if (messagesListener) {
    messagesListener()
  }

  // Listen for messages
  const messagesRef = collection(db, "chats", currentUser.email, "messages")
  const messagesQuery = query(messagesRef, orderBy("timestamp", "asc"))

  messagesListener = onSnapshot(
    messagesQuery,
    (snapshot) => {
      const messages = []
      snapshot.forEach((doc) => {
        messages.push({
          id: doc.id,
          ...doc.data(),
        })
      })

      console.log("Messages loaded:", messages.length)
      renderMessages(messages)

      // Hide welcome message if there are messages
      if (messages.length > 0 && welcomeMessage) {
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
  if (!chatMessages) return

  if (messages.length === 0) {
    if (welcomeMessage) {
      welcomeMessage.style.display = "flex"
    }
    return
  }

  const messagesHTML = messages
    .map((message) => {
      const isSent = message.senderId === currentUser.email
      const senderName = isSent ? currentUser.name : "Dr. Doom"
      const avatar = isSent ? getInitials(currentUser.name) : '<i class="fas fa-skull"></i>'

      return `
        <div class="message ${isSent ? "sent" : "received"}">
          <div class="message-avatar">
            ${avatar}
          </div>
          <div class="message-content">
            <div class="message-bubble">
              ${escapeHtml(message.text)}
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
  if (!messageInput || !characterCount) return

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
  if (!isTyping && messageInput && messageInput.value.trim()) {
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
    const chatRef = doc(db, "chats", currentUser.email)
    const typingField = currentUser.userType === "candidate" ? "candidateTyping" : "doomTyping"

    await setDoc(
      chatRef,
      {
        [typingField]: typing,
        lastTypingTime: Timestamp.now(),
      },
      { merge: true },
    )
  } catch (error) {
    console.error("Error updating typing status:", error)
  }
}

// Send message
async function sendMessage() {
  if (!currentUser || !messageInput || !messageInput.value.trim()) {
    return
  }

  const messageText = messageInput.value.trim()
  messageInput.value = ""
  messageInput.style.height = "auto"
  updateCharacterCount()

  // Disable send button temporarily
  if (sendBtn) {
    sendBtn.disabled = true
  }

  // Stop typing indicator
  if (isTyping) {
    isTyping = false
    updateTypingStatus(false)
  }

  try {
    const timestamp = Timestamp.now()

    // Add message to subcollection
    const messagesRef = collection(db, "chats", currentUser.email, "messages")
    await addDoc(messagesRef, {
      text: messageText,
      senderId: currentUser.email,
      senderName: currentUser.name,
      timestamp: timestamp,
      read: false,
    })

    // Update or create chat document
    const chatRef = doc(db, "chats", currentUser.email)
    await setDoc(
      chatRef,
      {
        candidateName: currentUser.name,
        candidateEmail: currentUser.email,
        candidatePosition: currentUser.status || "Candidate",
        lastMessage: messageText,
        lastMessageTime: timestamp,
        lastMessageSender: currentUser.email,
        unreadCount: increment(1),
        isOnline: true,
      },
      { merge: true },
    )

    // Update candidate message count if in candidates collection
    if (currentUser.source === "candidates") {
      const candidateRef = doc(db, "candidates", currentUser.id)
      await updateDoc(candidateRef, {
        messageCount: increment(1),
        lastActive: timestamp,
      })
    }

    console.log("Message sent successfully")
  } catch (error) {
    console.error("Error sending message:", error)
    showError("Failed to send message")
    if (messageInput) {
      messageInput.value = messageText // Restore message
    }
  } finally {
    if (sendBtn) {
      sendBtn.disabled = false
    }
  }
}

// Update online status
async function updateOnlineStatus(online) {
  if (!currentUser) return

  try {
    const updates = {
      isOnline: online,
      lastActive: Timestamp.now(),
    }

    // Update in the source collection
    if (currentUser.source === "candidates") {
      const candidateRef = doc(db, "candidates", currentUser.id)
      await updateDoc(candidateRef, updates)
    }

    // Also update chat document
    const chatRef = doc(db, "chats", currentUser.email)
    await setDoc(chatRef, updates, { merge: true })
  } catch (error) {
    console.error("Error updating online status:", error)
  }
}

// Load profile data
async function loadProfileData() {
  if (!currentUser) return

  try {
    // Update profile modal elements if they exist
    const profileAvatarLarge = document.getElementById("profileAvatarLarge")
    const profileName = document.getElementById("profileName")
    const profileEmail = document.getElementById("profileEmail")
    const profilePosition = document.getElementById("profilePosition")
    const messageCount = document.getElementById("messageCount")
    const joinDate = document.getElementById("joinDate")
    const lastActive = document.getElementById("lastActive")

    if (profileAvatarLarge) {
      profileAvatarLarge.textContent = getInitials(currentUser.name)
    }
    if (profileName) {
      profileName.textContent = currentUser.name
    }
    if (profileEmail) {
      profileEmail.textContent = currentUser.email
    }
    if (profilePosition) {
      profilePosition.textContent = currentUser.status || "Candidate"
    }
    if (messageCount) {
      messageCount.textContent = currentUser.messageCount || 0
    }
    if (joinDate) {
      joinDate.textContent = formatDate(currentUser.joinDate || currentUser.createdAt)
    }
    if (lastActive) {
      lastActive.textContent = formatTime(currentUser.lastActive)
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
    localStorage.removeItem("userData")
    localStorage.removeItem("userLoggedIn")
    localStorage.removeItem("loggedInUser")
    localStorage.removeItem("currentUser")
    currentUser = null

    // Redirect to login
    window.location.href = "../../../Login/login.html"
  }
}

// Modal functions
function showModal(modal) {
  if (modal) {
    modal.classList.add("active")
  }
}

function hideModal(modal) {
  if (modal) {
    modal.classList.remove("active")
  }
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

// Listen for Doom's typing status (only for candidates)
function listenForDoomTyping() {
  if (!currentUser || currentUser.userType !== "candidate") return

  const chatRef = doc(db, "chats", currentUser.email)
  onSnapshot(chatRef, (doc) => {
    if (doc.exists()) {
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
  if (typingIndicator) {
    typingIndicator.classList.add("show")
  }
}

// Hide typing indicator
function hideTypingIndicator() {
  if (typingIndicator) {
    typingIndicator.classList.remove("show")
  }
}

// Utility Functions
function getInitials(name) {
  if (!name) return "?"
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
}

function escapeHtml(text) {
  const div = document.createElement("div")
  div.textContent = text
  return div.innerHTML
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
  if (connectionStatus) {
    window.addEventListener("online", () => {
      connectionStatus.innerHTML = '<i class="fas fa-circle"></i> <span>Connected</span>'
      connectionStatus.style.color = "var(--accent-green)"
    })

    window.addEventListener("offline", () => {
      connectionStatus.innerHTML = '<i class="fas fa-circle"></i> <span>Disconnected</span>'
      connectionStatus.style.color = "var(--accent-red)"
    })
  }
}

// Initialize connection monitoring
monitorConnection()

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
.loading-screen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: var(--bg-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.loading-content {
  text-align: center;
  color: var(--text-primary);
}

.loading-spinner {
  font-size: 3rem;
  color: var(--accent-primary);
  animation: spin 2s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

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

.status-screen {
  display: none;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  text-align: center;
  padding: 2rem;
  background: var(--bg-primary);
}

.status-card {
  background: var(--bg-card);
  border: 1px solid var(--border-primary);
  border-radius: 16px;
  padding: 3rem 2rem;
  max-width: 500px;
  width: 100%;
  box-shadow: var(--shadow-xl);
}

.status-icon {
  font-size: 4rem;
  color: var(--accent-orange);
  margin-bottom: 1.5rem;
}

.status-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 1rem;
}

.status-description {
  color: var(--text-muted);
  line-height: 1.6;
  margin-bottom: 2rem;
}

.status-info {
  margin-bottom: 2rem;
}

.current-status {
  display: inline-block;
  background: var(--accent-orange);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 500;
  text-transform: capitalize;
}

.status-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.btn-primary, .btn-secondary {
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  border: none;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
}

.btn-primary {
  background: var(--accent-primary);
  color: white;
}

.btn-secondary {
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-primary);
}

.btn-primary:hover, .btn-secondary:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}
`

// Add styles to document
const styleSheet = document.createElement("style")
styleSheet.textContent = toastStyles
document.head.appendChild(styleSheet)
