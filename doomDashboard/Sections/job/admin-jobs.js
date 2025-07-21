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
let jobsListener = null
const applicationsListener = null
let currentJobId = null

// DOM Elements
const createJobBtn = document.getElementById("createJobBtn")
const createJobModal = document.getElementById("createJobModal")
const createJobClose = document.getElementById("createJobClose")
const createJobForm = document.getElementById("createJobForm")
const cancelJobBtn = document.getElementById("cancelJobBtn")
const submitJobBtn = document.getElementById("submitJobBtn")

const jobDetailsModal = document.getElementById("jobDetailsModal")
const jobDetailsClose = document.getElementById("jobDetailsClose")
const jobDetailsTitle = document.getElementById("jobDetailsTitle")
const jobDetailsBody = document.getElementById("jobDetailsBody")

const applicationsModal = document.getElementById("applicationsModal")
const applicationsClose = document.getElementById("applicationsClose")
const applicationsList = document.getElementById("applicationsList")

const jobsGrid = document.getElementById("jobsGrid")
const jobSearch = document.getElementById("jobSearch")
const statusFilter = document.getElementById("statusFilter")

// Stats elements
const totalJobs = document.getElementById("totalJobs")
const totalApplications = document.getElementById("totalApplications")
const pendingApplications = document.getElementById("pendingApplications")
const acceptedApplications = document.getElementById("acceptedApplications")

// Initialize the application
document.addEventListener("DOMContentLoaded", () => {
  setupEventListeners()
  loadJobs()
  loadStats()
})

// Event Listeners
function setupEventListeners() {
  // Modal controls
  createJobBtn.addEventListener("click", () => showModal(createJobModal))
  createJobClose.addEventListener("click", () => hideModal(createJobModal))
  cancelJobBtn.addEventListener("click", () => hideModal(createJobModal))

  jobDetailsClose.addEventListener("click", () => hideModal(jobDetailsModal))
  applicationsClose.addEventListener("click", () => hideModal(applicationsModal))

  // Form submission
  createJobForm.addEventListener("submit", handleCreateJob)

  // Search and filters
  jobSearch.addEventListener("input", filterJobs)
  statusFilter.addEventListener("change", filterJobs)

  // Modal overlay clicks
  document.querySelectorAll(".modal-overlay").forEach((modal) => {
    modal.addEventListener("click", function (e) {
      if (e.target === this) {
        hideModal(this)
      }
    })
  })

  // Header navigation
  document.getElementById("dashboardBtn").addEventListener("click", () => {
    // Navigate to dashboard
    console.log("Navigate to dashboard")
  })

  document.getElementById("applicationsBtn").addEventListener("click", () => {
    loadAllApplications()
    showModal(applicationsModal)
  })
}

// Load jobs from Firestore
function loadJobs() {
  showLoadingJobs()

  jobsListener = db
    .collection("jobs")
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
    jobsGrid.innerHTML = `
      <div class="no-jobs">
        <div class="no-jobs-icon">
          <i class="fas fa-briefcase"></i>
        </div>
        <h3>No Job Postings Yet</h3>
        <p>Create your first job posting to start recruiting candidates.</p>
        <button class="btn primary" onclick="document.getElementById('createJobBtn').click()">
          <i class="fas fa-plus"></i>
          <span>Create First Job</span>
        </button>
      </div>
    `
    return
  }

  jobsGrid.innerHTML = jobs
    .map((job) => {
      const priorityClass = job.priority || "medium"
      const statusClass = job.status === "active" ? "success" : "secondary"

      return `
        <div class="job-card" data-job-id="${job.id}">
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
              ${generateRequirementsHTML(job.requirements || {})}
            </div>
          </div>
          
          <div class="job-rewards">
            <h4>Rewards</h4>
            <div class="rewards-grid">
              ${generateRewardsHTML(job.rewards || {})}
            </div>
          </div>
          
          <div class="job-actions">
            <div class="job-meta">
              <span><i class="fas fa-calendar"></i> ${formatDate(job.createdAt)}</span>
              <span><i class="fas fa-users"></i> ${job.applicationsCount || 0} applications</span>
              <span class="job-status ${statusClass}">
                <i class="fas fa-circle"></i> ${job.status === "active" ? "Active" : "Closed"}
              </span>
            </div>
            
            <div class="job-buttons">
              <button class="btn secondary" onclick="viewJobDetails('${job.id}')">
                <i class="fas fa-eye"></i>
                <span>View</span>
              </button>
              <button class="btn primary" onclick="viewJobApplications('${job.id}')">
                <i class="fas fa-users"></i>
                <span>Applications</span>
              </button>
              <button class="btn ${job.status === "active" ? "danger" : "success"}" onclick="toggleJobStatus('${job.id}', '${job.status}')">
                <i class="fas fa-${job.status === "active" ? "pause" : "play"}"></i>
                <span>${job.status === "active" ? "Close" : "Activate"}</span>
              </button>
            </div>
          </div>
        </div>
      `
    })
    .join("")
}

// Generate requirements HTML
function generateRequirementsHTML(requirements) {
  const skillIcons = {
    combat: "fist-raised",
    defense: "shield-alt",
    tech: "cog",
    leadership: "crown",
    stealth: "user-ninja",
    intelligence: "brain",
  }

  return Object.entries(requirements)
    .filter(([key, value]) => value > 0)
    .map(
      ([skill, points]) => `
      <div class="requirement-item">
        <i class="fas fa-${skillIcons[skill] || "star"}"></i>
        <span>${skill}: ${points}</span>
      </div>
    `,
    )
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

// Handle create job form submission
async function handleCreateJob(e) {
  e.preventDefault()

  const formData = new FormData(e.target)
  const jobData = {
    title: document.getElementById("jobTitle").value.trim(),
    description: document.getElementById("jobDescription").value.trim(),
    category: document.getElementById("jobCategory").value,
    priority: document.getElementById("jobPriority").value,
    requirements: {
      combat: Number.parseInt(document.getElementById("reqCombat").value) || 0,
      defense: Number.parseInt(document.getElementById("reqDefense").value) || 0,
      tech: Number.parseInt(document.getElementById("reqTech").value) || 0,
      leadership: Number.parseInt(document.getElementById("reqLeadership").value) || 0,
      stealth: Number.parseInt(document.getElementById("reqStealth").value) || 0,
      intelligence: Number.parseInt(document.getElementById("reqIntelligence").value) || 0,
    },
    rewards: {
      combat: Number.parseInt(document.getElementById("rewardCombat").value) || 0,
      defense: Number.parseInt(document.getElementById("rewardDefense").value) || 0,
      tech: Number.parseInt(document.getElementById("rewardTech").value) || 0,
      leadership: Number.parseInt(document.getElementById("rewardLeadership").value) || 0,
      stealth: Number.parseInt(document.getElementById("rewardStealth").value) || 0,
      intelligence: Number.parseInt(document.getElementById("rewardIntelligence").value) || 0,
    },
    penalties: {
      combat: Number.parseInt(document.getElementById("penaltyCombat").value) || 0,
      defense: Number.parseInt(document.getElementById("penaltyDefense").value) || 0,
      tech: Number.parseInt(document.getElementById("penaltyTech").value) || 0,
      leadership: Number.parseInt(document.getElementById("penaltyLeadership").value) || 0,
      stealth: Number.parseInt(document.getElementById("penaltyStealth").value) || 0,
      intelligence: Number.parseInt(document.getElementById("penaltyIntelligence").value) || 0,
    },
    createdBy: "doom",
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    status: "active",
    applicationsCount: 0,
  }

  if (!jobData.title || !jobData.description || !jobData.category || !jobData.priority) {
    showError("Please fill in all required fields")
    return
  }

  submitJobBtn.disabled = true
  submitJobBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Creating...</span>'

  try {
    await db.collection("jobs").add(jobData)
    showSuccess("Job posting created successfully!")
    hideModal(createJobModal)
    createJobForm.reset()
  } catch (error) {
    console.error("Error creating job:", error)
    showError("Failed to create job posting")
  } finally {
    submitJobBtn.disabled = false
    submitJobBtn.innerHTML = '<i class="fas fa-plus"></i> <span>Create Job Posting</span>'
  }
}

// View job details
async function viewJobDetails(jobId) {
  try {
    const doc = await db.collection("jobs").doc(jobId).get()
    if (!doc.exists) {
      showError("Job not found")
      return
    }

    const job = { id: doc.id, ...doc.data() }

    jobDetailsTitle.textContent = job.title
    jobDetailsBody.innerHTML = `
      <div class="job-details-content">
        <div class="job-info-section">
          <h4>Job Information</h4>
          <div class="job-info-grid">
            <div class="info-item">
              <strong>Category:</strong>
              <span>${job.category}</span>
            </div>
            <div class="info-item">
              <strong>Priority:</strong>
              <span class="job-priority ${job.priority}">${job.priority}</span>
            </div>
            <div class="info-item">
              <strong>Status:</strong>
              <span class="job-status ${job.status === "active" ? "success" : "secondary"}">
                ${job.status === "active" ? "Active" : "Closed"}
              </span>
            </div>
            <div class="info-item">
              <strong>Created:</strong>
              <span>${formatDate(job.createdAt)}</span>
            </div>
          </div>
        </div>
        
        <div class="job-description-section">
          <h4>Description</h4>
          <p>${job.description}</p>
        </div>
        
        <div class="job-requirements-section">
          <h4>Requirements</h4>
          <div class="requirements-detail-grid">
            ${generateRequirementsDetailHTML(job.requirements || {})}
          </div>
        </div>
        
        <div class="job-rewards-section">
          <h4>Rewards (Success)</h4>
          <div class="rewards-detail-grid">
            ${generateRewardsDetailHTML(job.rewards || {})}
          </div>
        </div>
        
        <div class="job-penalties-section">
          <h4>Penalties (Failure)</h4>
          <div class="penalties-detail-grid">
            ${generatePenaltiesDetailHTML(job.penalties || {})}
          </div>
        </div>
        
        <div class="job-actions-section">
          <button class="btn primary" onclick="viewJobApplications('${job.id}')">
            <i class="fas fa-users"></i>
            <span>View Applications (${job.applicationsCount || 0})</span>
          </button>
          <button class="btn ${job.status === "active" ? "danger" : "success"}" onclick="toggleJobStatus('${job.id}', '${job.status}')">
            <i class="fas fa-${job.status === "active" ? "pause" : "play"}"></i>
            <span>${job.status === "active" ? "Close Job" : "Activate Job"}</span>
          </button>
        </div>
      </div>
    `

    showModal(jobDetailsModal)
  } catch (error) {
    console.error("Error loading job details:", error)
    showError("Failed to load job details")
  }
}

// Generate detailed requirements HTML
function generateRequirementsDetailHTML(requirements) {
  const skillIcons = {
    combat: "fist-raised",
    defense: "shield-alt",
    tech: "cog",
    leadership: "crown",
    stealth: "user-ninja",
    intelligence: "brain",
  }

  return Object.entries(requirements)
    .map(
      ([skill, points]) => `
      <div class="requirement-detail ${points > 0 ? "required" : "optional"}">
        <i class="fas fa-${skillIcons[skill] || "star"}"></i>
        <div class="requirement-info">
          <strong>${skill.charAt(0).toUpperCase() + skill.slice(1)}</strong>
          <span>${points > 0 ? `Minimum ${points} points` : "Not required"}</span>
        </div>
      </div>
    `,
    )
    .join("")
}

// Generate detailed rewards HTML
function generateRewardsDetailHTML(rewards) {
  const skillIcons = {
    combat: "fist-raised",
    defense: "shield-alt",
    tech: "cog",
    leadership: "crown",
    stealth: "user-ninja",
    intelligence: "brain",
  }

  return (
    Object.entries(rewards)
      .filter(([key, value]) => value > 0)
      .map(
        ([skill, points]) => `
      <div class="reward-detail">
        <i class="fas fa-${skillIcons[skill] || "star"}"></i>
        <div class="reward-info">
          <strong>${skill.charAt(0).toUpperCase() + skill.slice(1)}</strong>
          <span class="reward-points">+${points} points</span>
        </div>
      </div>
    `,
      )
      .join("") || '<p class="no-rewards">No rewards specified</p>'
  )
}

// Generate detailed penalties HTML
function generatePenaltiesDetailHTML(penalties) {
  const skillIcons = {
    combat: "fist-raised",
    defense: "shield-alt",
    tech: "cog",
    leadership: "crown",
    stealth: "user-ninja",
    intelligence: "brain",
  }

  return (
    Object.entries(penalties)
      .filter(([key, value]) => value > 0)
      .map(
        ([skill, points]) => `
      <div class="penalty-detail">
        <i class="fas fa-${skillIcons[skill] || "star"}"></i>
        <div class="penalty-info">
          <strong>${skill.charAt(0).toUpperCase() + skill.slice(1)}</strong>
          <span class="penalty-points">-${points} points</span>
        </div>
      </div>
    `,
      )
      .join("") || '<p class="no-penalties">No penalties specified</p>'
  )
}

// View job applications
async function viewJobApplications(jobId) {
  currentJobId = jobId

  try {
    const jobDoc = await db.collection("jobs").doc(jobId).get()
    if (!jobDoc.exists) {
      showError("Job not found")
      return
    }

    const job = jobDoc.data()

    // Load applications for this job
    const applicationsSnapshot = await db
      .collection("applications")
      .where("jobId", "==", jobId)
      .orderBy("appliedAt", "desc")
      .get()

    const applications = []
    applicationsSnapshot.forEach((doc) => {
      applications.push({
        id: doc.id,
        ...doc.data(),
      })
    })

    renderApplications(applications, job.title)
    showModal(applicationsModal)
  } catch (error) {
    console.error("Error loading applications:", error)
    showError("Failed to load applications")
  }
}

// Load all applications
async function loadAllApplications() {
  try {
    const applicationsSnapshot = await db.collection("applications").orderBy("appliedAt", "desc").get()

    const applications = []
    applicationsSnapshot.forEach((doc) => {
      applications.push({
        id: doc.id,
        ...doc.data(),
      })
    })

    renderApplications(applications, "All Applications")
    showModal(applicationsModal)
  } catch (error) {
    console.error("Error loading applications:", error)
    showError("Failed to load applications")
  }
}

// Render applications
function renderApplications(applications, title) {
  document.querySelector("#applicationsModal .modal-header h3").textContent = title

  if (applications.length === 0) {
    applicationsList.innerHTML = `
      <div class="no-applications">
        <div class="no-applications-icon">
          <i class="fas fa-inbox"></i>
        </div>
        <h3>No Applications Yet</h3>
        <p>Applications will appear here when candidates apply for jobs.</p>
      </div>
    `
    return
  }

  applicationsList.innerHTML = applications
    .map(
      (application) => `
      <div class="application-item">
        <div class="application-header">
          <div class="application-candidate">
            <div class="application-avatar">
              ${getInitials(application.candidateName)}
            </div>
            <div class="application-candidate-info">
              <h4>${application.candidateName}</h4>
              <p>${application.candidateEmail}</p>
            </div>
          </div>
          <span class="application-status ${application.status || "pending"}">
            ${application.status || "Pending"}
          </span>
        </div>
        
        <div class="application-stats">
          ${generateApplicationStatsHTML(application.candidateStats || {})}
        </div>
        
        <div class="application-resume">
          <h5>Resume:</h5>
          <p>${application.resumeText ? application.resumeText.substring(0, 200) + "..." : "No resume text provided"}</p>
          ${application.resumeFile ? `<p><i class="fas fa-file-pdf"></i> PDF Resume attached</p>` : ""}
        </div>
        
        <div class="application-actions">
          <button class="btn secondary" onclick="viewApplicationDetails('${application.id}')">
            <i class="fas fa-eye"></i>
            <span>View Details</span>
          </button>
          ${
            application.status === "pending"
              ? `
            <button class="btn success" onclick="updateApplicationStatus('${application.id}', 'accepted')">
              <i class="fas fa-check"></i>
              <span>Accept</span>
            </button>
            <button class="btn danger" onclick="updateApplicationStatus('${application.id}', 'rejected')">
              <i class="fas fa-times"></i>
              <span>Reject</span>
            </button>
          `
              : ""
          }
        </div>
      </div>
    `,
    )
    .join("")
}

// Generate application stats HTML
function generateApplicationStatsHTML(stats) {
  const skillIcons = {
    combat: "fist-raised",
    defense: "shield-alt",
    tech: "cog",
    leadership: "crown",
    stealth: "user-ninja",
    intelligence: "brain",
  }

  return Object.entries(stats)
    .map(
      ([skill, points]) => `
      <div class="application-stat">
        <i class="fas fa-${skillIcons[skill] || "star"}"></i>
        <span>${skill}: ${points}</span>
      </div>
    `,
    )
    .join("")
}

// Update application status
async function updateApplicationStatus(applicationId, status) {
  try {
    await db.collection("applications").doc(applicationId).update({
      status: status,
      reviewedAt: firebase.firestore.FieldValue.serverTimestamp(),
      reviewedBy: "doom",
    })

    showSuccess(`Application ${status} successfully!`)

    // Reload applications if modal is open
    if (currentJobId) {
      viewJobApplications(currentJobId)
    } else {
      loadAllApplications()
    }
  } catch (error) {
    console.error("Error updating application status:", error)
    showError("Failed to update application status")
  }
}

// Toggle job status
async function toggleJobStatus(jobId, currentStatus) {
  const newStatus = currentStatus === "active" ? "closed" : "active"

  try {
    await db.collection("jobs").doc(jobId).update({
      status: newStatus,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    })

    showSuccess(`Job ${newStatus === "active" ? "activated" : "closed"} successfully!`)
  } catch (error) {
    console.error("Error updating job status:", error)
    showError("Failed to update job status")
  }
}

// Filter jobs
function filterJobs() {
  const searchTerm = jobSearch.value.toLowerCase()
  const statusValue = statusFilter.value

  const jobCards = document.querySelectorAll(".job-card")

  jobCards.forEach((card) => {
    const title = card.querySelector(".job-title").textContent.toLowerCase()
    const description = card.querySelector(".job-description").textContent.toLowerCase()
    const status = card.querySelector(".job-status").textContent.toLowerCase().includes("active") ? "active" : "closed"

    const matchesSearch = title.includes(searchTerm) || description.includes(searchTerm)
    const matchesStatus = statusValue === "all" || status === statusValue

    if (matchesSearch && matchesStatus) {
      card.style.display = "block"
    } else {
      card.style.display = "none"
    }
  })
}

// Load stats
async function loadStats() {
  try {
    // Load jobs stats
    const jobsSnapshot = await db.collection("jobs").get()
    const activeJobs = jobsSnapshot.docs.filter((doc) => doc.data().status === "active")
    totalJobs.textContent = activeJobs.length

    // Load applications stats
    const applicationsSnapshot = await db.collection("applications").get()
    totalApplications.textContent = applicationsSnapshot.size

    const pendingApps = applicationsSnapshot.docs.filter((doc) => !doc.data().status || doc.data().status === "pending")
    pendingApplications.textContent = pendingApps.length

    const acceptedApps = applicationsSnapshot.docs.filter((doc) => doc.data().status === "accepted")
    acceptedApplications.textContent = acceptedApps.length
  } catch (error) {
    console.error("Error loading stats:", error)
  }
}

// Utility Functions
function showModal(modal) {
  modal.classList.add("active")
}

function hideModal(modal) {
  modal.classList.remove("active")
}

function hideLoadingJobs() {
  const loader = document.querySelector(".loading-jobs");
  if (loader) loader.style.display = "none";
}

function showLoadingJobs() {
  const loader = document.querySelector(".loading-jobs");
  if (loader) loader.style.display = "flex";
}


function getInitials(name) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
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
  if (applicationsListener) applicationsListener()
})

// Make functions globally available
window.viewJobDetails = viewJobDetails
window.viewJobApplications = viewJobApplications
window.toggleJobStatus = toggleJobStatus
window.updateApplicationStatus = updateApplicationStatus
