// Import Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.1.1/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.1.1/firebase-firestore.js";

import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/9.1.1/firebase-storage.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.1.1/firebase-auth.js";


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
const storage = firebase.storage()
const auth = firebase.auth()

// Global Variables
let currentUser = null
let jobsListener = null
let currentJobData = null

// DOM Elements
const loadingScreen = document.getElementById("loadingScreen")
const jobBoard = document.getElementById("jobBoard")
const jobsContainer = document.getElementById("jobsContainer")
const jobSearchInput = document.getElementById("jobSearchInput")
const categoryFilter = document.getElementById("categoryFilter")
const priorityFilter = document.getElementById("priorityFilter")

const applicationModal = document.getElementById("applicationModal")
const applicationClose = document.getElementById("applicationClose")
const applicationForm = document.getElementById("applicationForm")
const applicationJobInfo = document.getElementById("applicationJobInfo")
const currentStats = document.getElementById("currentStats")
const requirementsCheck = document.getElementById("requirementsCheck")

// Profile elements
const profileName = document.getElementById("profileName")
const profileInitials = document.getElementById("profileInitials")
const combatPoints = document.getElementById("combatPoints")
const defensePoints = document.getElementById("defensePoints")
const techPoints = document.getElementById("techPoints")
const logoutBtn = document.getElementById("logoutBtn")

// Resume elements
const resumeTextOption = document.getElementById("resumeText")
const resumeFileOption = document.getElementById("resumeFile")
const resumeTextInput = document.getElementById("resumeTextInput")
const resumeFileInput = document.getElementById("resumeFileInput")
const resumeTextArea = document.getElementById("resumeTextArea")
const resumeFileUpload = document.getElementById("resumeFileUpload")
const fileInfo = document.getElementById("fileInfo")
const fileName = document.getElementById("fileName")
const removeFile = document.getElementById("removeFile")

// Initialize the application
document.addEventListener("DOMContentLoaded", () => {
  // Check authentication state
  auth.onAuthStateChanged((user) => {
    if (user) {
      // User is signed in
      console.log("Firebase recognizes user:", user.uid);
      initializeWithUser(user)
    } else {
      // No user is signed in, try anonymous auth for demo
      signInAnonymously()
    }
  })
})

// Sign in anonymously for demo purposes
async function signInAnonymously() {
  try {
    const result = await auth.signInAnonymously()
    console.log("Signed in anonymously:", result.user.uid)
  } catch (error) {
    console.error("Error signing in anonymously:", error)
    showError("Authentication failed")
  }
}

// Initialize with authenticated user
async function initializeWithUser(user) {
  try {
    // Get or create candidate profile
    await ensureCandidateProfile(user)

    // Setup event listeners
    setupEventListeners()

    // Show job board
    showJobBoard()
  } catch (error) {
    console.error("Error initializing:", error)
    showError("Failed to initialize application")
  }
}

// Ensure candidate profile exists
async function ensureCandidateProfile(user) {
  try {
    const candidateRef = db.collection("candidates").doc(user.uid)
    const candidateDoc = await candidateRef.get()

    if (!candidateDoc.exists) {
      // Create new candidate with random stats
      const candidateData = {
        uid: user.uid,
        email: user.email || `candidate_${user.uid}@example.com`,
        name: user.displayName || `Candidate ${user.uid.substring(0, 6)}`,
        combatPoints: Math.floor(Math.random() * 50) + 10,
        defensePoints: Math.floor(Math.random() * 50) + 10,
        techPoints: Math.floor(Math.random() * 50) + 10,
        leadershipPoints: Math.floor(Math.random() * 50) + 10,
        stealthPoints: Math.floor(Math.random() * 50) + 10,
        intelligencePoints: Math.floor(Math.random() * 50) + 10,
        joinDate: firebase.firestore.FieldValue.serverTimestamp(),
        lastActive: firebase.firestore.FieldValue.serverTimestamp(),
        isOnline: true,
      }

      await candidateRef.set(candidateData)
      currentUser = candidateData
    } else {
      // Update existing candidate
      const candidateData = candidateDoc.data()
      await candidateRef.update({
        lastActive: firebase.firestore.FieldValue.serverTimestamp(),
        isOnline: true,
      })

      currentUser = {
        uid: user.uid,
        ...candidateData,
      }
    }

    currentUser.avatar = getInitials(currentUser.name)
  } catch (error) {
    console.error("Error ensuring candidate profile:", error)
    throw error
  }
}

// Show job board
function showJobBoard() {
  loadingScreen.style.display = "none"
  jobBoard.style.display = "block"

  updateProfileDisplay()
  loadJobs()
}

// Event Listeners
function setupEventListeners() {
  // Logout
  logoutBtn.addEventListener("click", handleLogout)

  // Search and filters
  jobSearchInput.addEventListener("input", filterJobs)
  categoryFilter.addEventListener("change", filterJobs)
  priorityFilter.addEventListener("change", filterJobs)

  // Application modal
  applicationClose.addEventListener("click", () => hideModal(applicationModal))
  applicationForm.addEventListener("submit", handleApplicationSubmit)
  document.getElementById("cancelApplicationBtn").addEventListener("click", () => hideModal(applicationModal))

  // Resume type selection
  resumeTextOption.addEventListener("change", toggleResumeInput)
  resumeFileOption.addEventListener("change", toggleResumeInput)

  // File upload
  resumeFileUpload.addEventListener("change", handleFileSelect)
  removeFile.addEventListener("click", handleFileRemove)

  // Modal overlay clicks
  document.querySelectorAll(".modal-overlay").forEach((modal) => {
    modal.addEventListener("click", function (e) {
      if (e.target === this) {
        hideModal(this)
      }
    })
  })
}

// Update profile display
function updateProfileDisplay() {
  if (!currentUser) return

  profileName.textContent = currentUser.name
  profileInitials.textContent = currentUser.avatar
  combatPoints.textContent = currentUser.combatPoints || 0
  defensePoints.textContent = currentUser.defensePoints || 0
  techPoints.textContent = currentUser.techPoints || 0
}

// Load jobs
function loadJobs() {
  showLoadingJobs()

  jobsListener = db
    .collection("jobs")
    .where("status", "==", "active")
    .orderBy("createdAt", "desc")
    .onSnapshot(
      (snapshot) => {
        const jobs = []
        snapshot.forEach((doc) => {
          jobs.push({
            id: doc.id,
            ...doc.data(),
          })
        })

        renderJobs(jobs)
        hideLoadingJobs()
      },
      (error) => {
        console.error("Error loading jobs:", error)
        showError("Failed to load jobs")
        hideLoadingJobs()
      },
    )
}

// Render jobs
function renderJobs(jobs) {
  if (jobs.length === 0) {
    jobsContainer.innerHTML = `
      <div class="no-jobs">
        <div class="no-jobs-icon">
          <i class="fas fa-briefcase"></i>
        </div>
        <h3>No Active Missions</h3>
        <p>Check back later for new mission opportunities from Doom's Digital World.</p>
      </div>
    `
    return
  }

  jobsContainer.innerHTML = jobs
    .map((job) => {
      const priorityClass = job.priority || "medium"
      const canApply = checkJobEligibility(job)

      return `
        <div class="job-card" data-job-id="${job.id}" data-category="${job.category}" data-priority="${job.priority}">
          <div class="job-header">
            <div>
              <h3 class="job-title">${job.title}</h3>
              <span class="job-category">${job.category || "General"}</span>
            </div>
            <span class="job-priority ${priorityClass}">${job.priority || "Medium"}</span>
          </div>
          
          <p class="job-description">${job.description}</p>
          
          <div class="job-requirements">
            <h4>Requirements</h4>
            <div class="requirements-grid">
              ${generateRequirementsHTML(job.requirements || {}, currentUser)}
            </div>
          </div>
          
          <div class="job-rewards">
            <h4>Success Rewards</h4>
            <div class="rewards-grid">
              ${generateRewardsHTML(job.rewards || {})}
            </div>
          </div>
          
          ${
            Object.values(job.penalties || {}).some((p) => p > 0)
              ? `
            <div class="job-penalties">
              <h4>Failure Penalties</h4>
              <div class="penalties-grid">
                ${generatePenaltiesHTML(job.penalties || {})}
              </div>
            </div>
          `
              : ""
          }
          
          <div class="job-actions">
            <div class="job-meta">
              <span><i class="fas fa-calendar"></i> ${formatDate(job.createdAt)}</span>
              <span><i class="fas fa-users"></i> ${job.applicationsCount || 0} applicants</span>
            </div>
            
            <div class="job-buttons">
              <button class="btn ${canApply.eligible ? "primary" : "secondary"}" 
                      ${canApply.eligible ? "" : "disabled"} 
                      onclick="applyForJob('${job.id}')"
                      title="${canApply.eligible ? "Apply for this mission" : canApply.reason}">
                <i class="fas fa-${canApply.eligible ? "paper-plane" : "lock"}"></i>
                <span>${canApply.eligible ? "Apply Now" : "Requirements Not Met"}</span>
              </button>
            </div>
          </div>
        </div>
      `
    })
    .join("")
}

// Check job eligibility
function checkJobEligibility(job) {
  if (!currentUser || !job.requirements) {
    return { eligible: false, reason: "Unable to check requirements" }
  }

  const requirements = job.requirements
  const userStats = {
    combat: currentUser.combatPoints || 0,
    defense: currentUser.defensePoints || 0,
    tech: currentUser.techPoints || 0,
    leadership: currentUser.leadershipPoints || 0,
    stealth: currentUser.stealthPoints || 0,
    intelligence: currentUser.intelligencePoints || 0,
  }

  const unmetRequirements = []

  Object.entries(requirements).forEach(([skill, required]) => {
    if (required > 0 && userStats[skill] < required) {
      unmetRequirements.push(`${skill}: ${userStats[skill]}/${required}`)
    }
  })

  if (unmetRequirements.length > 0) {
    return {
      eligible: false,
      reason: `Insufficient points: ${unmetRequirements.join(", ")}`,
    }
  }

  return { eligible: true, reason: "" }
}

// Generate requirements HTML with user comparison
function generateRequirementsHTML(requirements, user) {
  const skillIcons = {
    combat: "fist-raised",
    defense: "shield-alt",
    tech: "cog",
    leadership: "crown",
    stealth: "user-ninja",
    intelligence: "brain",
  }

  const userStats = {
    combat: user?.combatPoints || 0,
    defense: user?.defensePoints || 0,
    tech: user?.techPoints || 0,
    leadership: user?.leadershipPoints || 0,
    stealth: user?.stealthPoints || 0,
    intelligence: user?.intelligencePoints || 0,
  }

  return Object.entries(requirements)
    .filter(([key, value]) => value > 0)
    .map(([skill, required]) => {
      const userPoints = userStats[skill]
      const meets = userPoints >= required

      return `
        <div class="requirement-item ${meets ? "met" : "not-met"}">
          <i class="fas fa-${skillIcons[skill] || "star"}"></i>
          <span>${skill}: ${userPoints}/${required}</span>
          <i class="fas fa-${meets ? "check" : "times"} requirement-status"></i>
        </div>
      `
    })
    .join("")
}

// Generate rewards HTML
function generateRewardsHTML(rewards) {
  const skillIcons = {
    combat: "fist-raised",
    defense: "shield-alt",
    tech: "cog",
    leadership: "crown",
    stealth: "user-ninja",
    intelligence: "brain",
  }

  return Object.entries(rewards)
    .filter(([key, value]) => value > 0)
    .map(
      ([skill, points]) => `
      <div class="reward-item">
        <i class="fas fa-${skillIcons[skill] || "star"}"></i>
        <span>+${points}</span>
      </div>
    `,
    )
    .join("")
}

// Generate penalties HTML
function generatePenaltiesHTML(penalties) {
  const skillIcons = {
    combat: "fist-raised",
    defense: "shield-alt",
    tech: "cog",
    leadership: "crown",
    stealth: "user-ninja",
    intelligence: "brain",
  }

  return Object.entries(penalties)
    .filter(([key, value]) => value > 0)
    .map(
      ([skill, points]) => `
      <div class="penalty-item">
        <i class="fas fa-${skillIcons[skill] || "star"}"></i>
        <span>-${points}</span>
      </div>
    `,
    )
    .join("")
}

// Apply for job
async function applyForJob(jobId) {
  if (!currentUser) {
    showError("Please wait for authentication")
    return
  }

  try {
    // Check if already applied
    const existingApplication = await db
      .collection("applications")
      .where("jobId", "==", jobId)
      .where("candidateId", "==", currentUser.uid)
      .get()

    if (!existingApplication.empty) {
      showWarning("You have already applied for this job")
      return
    }

    // Get job details
    const jobDoc = await db.collection("jobs").doc(jobId).get()
    if (!jobDoc.exists) {
      showError("Job not found")
      return
    }

    const job = { id: jobDoc.id, ...jobDoc.data() }
    currentJobData = job

    // Check eligibility
    const eligibility = checkJobEligibility(job)
    if (!eligibility.eligible) {
      showError(eligibility.reason)
      return
    }

    // Show application modal
    showApplicationModal(job)
  } catch (error) {
    console.error("Error applying for job:", error)
    showError("Failed to load application form")
  }
}

// Show application modal
function showApplicationModal(job) {
  // Update job info
  applicationJobInfo.innerHTML = `
    <div class="application-job-header">
      <h3>${job.title}</h3>
      <span class="job-category">${job.category}</span>
      <span class="job-priority ${job.priority}">${job.priority}</span>
    </div>
    <p>${job.description}</p>
  `

  // Update current stats
  const userStats = {
    combat: currentUser.combatPoints || 0,
    defense: currentUser.defensePoints || 0,
    tech: currentUser.techPoints || 0,
    leadership: currentUser.leadershipPoints || 0,
    stealth: currentUser.stealthPoints || 0,
    intelligence: currentUser.intelligencePoints || 0,
  }

  currentStats.innerHTML = Object.entries(userStats)
    .map(
      ([skill, points]) => `
      <div class="current-stat">
        <i class="fas fa-${getSkillIcon(skill)}"></i>
        <div class="current-stat-info">
          <strong>${points}</strong>
          <span>${skill.charAt(0).toUpperCase() + skill.slice(1)}</span>
        </div>
      </div>
    `,
    )
    .join("")

  // Update requirements check
  requirementsCheck.innerHTML = Object.entries(job.requirements || {})
    .map(([skill, required]) => {
      const userPoints = userStats[skill]
      const meets = userPoints >= required

      return `
        <div class="requirement-check ${meets ? "met" : "not-met"}">
          <i class="fas fa-${meets ? "check-circle" : "times-circle"}"></i>
          <div class="requirement-check-info">
            <strong>${skill.charAt(0).toUpperCase() + skill.slice(1)}</strong>
            <span>${userPoints}/${required} points</span>
          </div>
        </div>
      `
    })
    .join("")

  showModal(applicationModal)
}

// Handle resume type toggle
function toggleResumeInput() {
  if (resumeTextOption.checked) {
    resumeTextInput.style.display = "block"
    resumeFileInput.style.display = "none"
  } else {
    resumeTextInput.style.display = "none"
    resumeFileInput.style.display = "block"
  }
}

// Handle file selection
function handleFileSelect(e) {
  const file = e.target.files[0]
  if (file) {
    if (file.type !== "application/pdf") {
      showError("Please select a PDF file")
      e.target.value = ""
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      // 5MB limit
      showError("File size must be less than 5MB")
      e.target.value = ""
      return
    }

    fileName.textContent = file.name
    fileInfo.style.display = "flex"
  }
}

// Handle file removal
function handleFileRemove() {
  resumeFileUpload.value = ""
  fileInfo.style.display = "none"
}

// Handle application submission
async function handleApplicationSubmit(e) {
  e.preventDefault()

  if (!currentUser || !currentJobData) {
    showError("Invalid application state")
    return
  }

  const submitBtn = document.getElementById("submitApplicationBtn")
  submitBtn.disabled = true
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Submitting...</span>'

  try {
    let resumeText = ""
    let resumeFileUrl = ""

    if (resumeTextOption.checked) {
      resumeText = resumeTextArea.value.trim()
      if (!resumeText) {
        showError("Please enter your resume text")
        return
      }
    } else {
      const file = resumeFileUpload.files[0]
      if (!file) {
        showError("Please select a PDF file")
        return
      }

      // Upload file to Firebase Storage
      const storageRef = storage.ref(`resumes/${currentUser.uid}/${Date.now()}_${file.name}`)
      const uploadTask = await storageRef.put(file)
      resumeFileUrl = await uploadTask.ref.getDownloadURL()
    }

    // Create application
    const applicationData = {
      jobId: currentJobData.id,
      jobTitle: currentJobData.title,
      candidateId: currentUser.uid,
      candidateName: currentUser.name,
      candidateEmail: currentUser.email,
      adminAction: null,
      candidateStats: {
        combat: currentUser.combatPoints || 0,
        defense: currentUser.defensePoints || 0,
        tech: currentUser.techPoints || 0,
        leadership: currentUser.leadershipPoints || 0,
        stealth: currentUser.stealthPoints || 0,
        intelligence: currentUser.intelligencePoints || 0,
      },
      resumeText: resumeText,
      resumeFileUrl: resumeFileUrl,
      appliedAt: firebase.firestore.FieldValue.serverTimestamp(),
      status: "pending",
    }

    await db.collection("applications").add(applicationData)

    // Update job applications count
    await db
      .collection("jobs")
      .doc(currentJobData.id)
      .update({
        applicationsCount: firebase.firestore.FieldValue.increment(1),
      })

    showSuccess("Application submitted successfully!")
    hideModal(applicationModal)
    applicationForm.reset()
    toggleResumeInput()
    handleFileRemove()
  } catch (error) {
    console.error("Error submitting application:", error)
    showError("Failed to submit application")
  } finally {
    submitBtn.disabled = false
    submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> <span>Submit Application</span>'
  }
}

// Filter jobs
function filterJobs() {
  const searchTerm = jobSearchInput.value.toLowerCase()
  const categoryValue = categoryFilter.value
  const priorityValue = priorityFilter.value

  const jobCards = document.querySelectorAll(".job-card")

  jobCards.forEach((card) => {
    const title = card.querySelector(".job-title").textContent.toLowerCase()
    const description = card.querySelector(".job-description").textContent.toLowerCase()
    const category = card.dataset.category
    const priority = card.dataset.priority

    const matchesSearch = title.includes(searchTerm) || description.includes(searchTerm)
    const matchesCategory = categoryValue === "all" || category === categoryValue
    const matchesPriority = priorityValue === "all" || priority === priorityValue

    if (matchesSearch && matchesCategory && matchesPriority) {
      card.style.display = "block"
    } else {
      card.style.display = "none"
    }
  })
}

// Handle logout
async function handleLogout() {
  if (confirm("Are you sure you want to logout?")) {
    try {
      // Update user status
      if (currentUser) {
        await db.collection("candidates").doc(currentUser.uid).update({
          isOnline: false,
          lastActive: firebase.firestore.FieldValue.serverTimestamp(),
        })
      }

      // Clear listeners
      if (jobsListener) {
        jobsListener()
      }

      // Sign out
      await auth.signOut()

      // Redirect
      window.location.href = "index.html"
    } catch (error) {
      console.error("Error logging out:", error)
      showError("Failed to logout")
    }
  }
}

// Utility Functions
function showModal(modal) {
  modal.classList.add("active")
}

function hideModal(modal) {
  modal.classList.remove("active")
}

function showLoadingJobs() {
  document.querySelector(".loading-jobs").style.display = "flex"
}

function hideLoadingJobs() {
  document.querySelector(".loading-jobs").style.display = "none"
}

function getInitials(name) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
}

function getSkillIcon(skill) {
  const skillIcons = {
    combat: "fist-raised",
    defense: "shield-alt",
    tech: "cog",
    leadership: "crown",
    stealth: "user-ninja",
    intelligence: "brain",
  }
  return skillIcons[skill] || "star"
}

function formatDate(timestamp) {
  if (!timestamp) return "Unknown"

  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function showError(message) {
  createToast(message, "error")
}

function showSuccess(message) {
  createToast(message, "success")
}

function showWarning(message) {
  createToast(message, "warning")
}

function createToast(message, type) {
  const toast = document.createElement("div")
  toast.className = `toast toast-${type}`

  const icons = {
    error: "fas fa-exclamation-circle",
    success: "fas fa-check-circle",
    warning: "fas fa-exclamation-triangle",
  }

  toast.innerHTML = `
    <i class="${icons[type]}"></i>
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

// Cleanup on page unload
window.addEventListener("beforeunload", async () => {
  if (jobsListener) jobsListener()

  if (currentUser) {
    try {
      await db.collection("candidates").doc(currentUser.uid).update({
        isOnline: false,
        lastActive: firebase.firestore.FieldValue.serverTimestamp(),
      })
    } catch (error) {
      console.error("Error updating status on unload:", error)
    }
  }
})

// Make functions globally available
window.applyForJob = applyForJob
