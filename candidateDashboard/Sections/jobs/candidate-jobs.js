// Import Firebase
// Firebase Core
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.1.1/firebase-app.js";

// Firestore
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.1.1/firebase-firestore.js";

// Storage
import { getStorage } from "https://www.gstatic.com/firebasejs/9.1.1/firebase-storage.js";


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

// Global Variables
let currentUser = null
let jobsListener = null
let currentJobData = null

// DOM Elements
const loginScreen = document.getElementById("loginScreen")
const jobBoard = document.getElementById("jobBoard")
const loginForm = document.getElementById("loginForm")
const loginBtn = document.getElementById("loginBtn")

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
  setupEventListeners()
  checkExistingSession()
})

// Event Listeners
function setupEventListeners() {
  // Login
  loginForm.addEventListener("submit", handleLogin)

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

// Check for existing session
function checkExistingSession() {
  const savedUser = localStorage.getItem("candidateJobUser")
  if (savedUser) {
    currentUser = JSON.parse(savedUser)
    showJobBoard()
  }
}

// Handle login
async function handleLogin(e) {
  e.preventDefault()

  const email = document.getElementById("candidateEmail").value.trim()
  const name = document.getElementById("candidateName").value.trim()

  if (!email || !name) {
    showError("Please fill in all fields")
    return
  }

  loginBtn.disabled = true
  loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Connecting...</span>'

  try {
    // Check if candidate exists, if not create with default stats
    let candidateDoc = await db.collection("candidates").doc(email).get()

    if (!candidateDoc.exists) {
      // Create new candidate with default stats
      const candidateData = {
        name: name,
        email: email,
        combatPoints: Math.floor(Math.random() * 50) + 10, // Random 10-60
        defensePoints: Math.floor(Math.random() * 50) + 10,
        techPoints: Math.floor(Math.random() * 50) + 10,
        leadershipPoints: Math.floor(Math.random() * 50) + 10,
        stealthPoints: Math.floor(Math.random() * 50) + 10,
        intelligencePoints: Math.floor(Math.random() * 50) + 10,
        joinDate: firebase.firestore.FieldValue.serverTimestamp(),
        lastActive: firebase.firestore.FieldValue.serverTimestamp(),
      }

      await db.collection("candidates").doc(email).set(candidateData)
      candidateDoc = await db.collection("candidates").doc(email).get()
    } else {
      // Update last active
      await db.collection("candidates").doc(email).update({
        lastActive: firebase.firestore.FieldValue.serverTimestamp(),
      })
    }

    const candidateData = candidateDoc.data()

    currentUser = {
      email: email,
      name: name,
      ...candidateData,
      avatar: getInitials(name),
    }

    localStorage.setItem("candidateJobUser", JSON.stringify(currentUser))

    showSuccess("Welcome to the Job Board!")
    setTimeout(() => {
      showJobBoard()
    }, 1000)
  } catch (error) {
    console.error("Login error:", error)
    showError("Failed to connect. Please try again.")
  } finally {
    loginBtn.disabled = false
    loginBtn.innerHTML = '<span>Access Job Board</span> <i class="fas fa-arrow-right"></i>'
  }
}

// Show job board
function showJobBoard() {
  loginScreen.style.display = "none"
  jobBoard.style.display = "block"

  // Update profile display
  updateProfileDisplay()

  // Load jobs
  loadJobs()
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
    showError("Please login first")
    return
  }

  try {
    // Check if already applied
    const existingApplication = await db
      .collection("applications")
      .where("jobId", "==", jobId)
      .where("candidateEmail", "==", currentUser.email)
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
      const storageRef = storage.ref(`resumes/${currentUser.email}/${Date.now()}_${file.name}`)
      const uploadTask = await storageRef.put(file)
      resumeFileUrl = await uploadTask.ref.getDownloadURL()
    }

    // Create application
    const applicationData = {
      jobId: currentJobData.id,
      jobTitle: currentJobData.title,
      candidateId: currentUser.email,
      candidateName: currentUser.name,
      candidateEmail: currentUser.email,
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
function handleLogout() {
  if (confirm("Are you sure you want to logout?")) {
    // Clear listeners
    if (jobsListener) {
      jobsListener()
    }

    // Clear session
    localStorage.removeItem("candidateJobUser")
    currentUser = null
    currentJobData = null

    // Show login screen
    jobBoard.style.display = "none"
    loginScreen.style.display = "flex"

    // Reset form
    loginForm.reset()

    showSuccess("Logged out successfully")
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
window.addEventListener("beforeunload", () => {
  if (jobsListener) jobsListener()
})

// Make functions globally available
window.applyForJob = applyForJob
