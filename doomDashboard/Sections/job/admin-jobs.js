// Import Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.1.1/firebase-app.js"
import {
  collection,
  getFirestore,
  orderBy,
  query,
  onSnapshot,
  addDoc,
  where,
  getDocs,
  getDoc,
  updateDoc,
  doc,
  Timestamp,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/9.1.1/firebase-firestore.js"
import { getStorage } from "https://www.gstatic.com/firebasejs/9.1.1/firebase-storage.js"
import { getAuth } from "https://www.gstatic.com/firebasejs/9.1.1/firebase-auth.js"

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
const storage = getStorage(app)
const auth = getAuth(app)

// Global Variables
let jobsListener = null
let currentJobId = null
let currentAdmin = null
let currentApplications = []
let currentCardIndex = 0
let isSwipeEnabled = true

// Touch/Mouse tracking
let startX = 0
let startY = 0
let currentX = 0
let currentY = 0
let isDragging = false

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
const swipeContainer = document.getElementById("swipeContainer")
const swipeStack = document.getElementById("swipeStack")
const emptyApplications = document.getElementById("emptyApplications")

const savedApplicationsModal = document.getElementById("savedApplicationsModal")
const savedApplicationsClose = document.getElementById("savedApplicationsClose")
const savedApplicationsContainer = document.getElementById("savedApplicationsContainer")
const savedFilter = document.getElementById("savedFilter")

const jobsGrid = document.getElementById("jobsGrid")
const jobSearch = document.getElementById("jobSearch")
const statusFilter = document.getElementById("statusFilter")

// Action buttons
const rejectBtn = document.getElementById("rejectBtn")
const saveBtn = document.getElementById("saveBtn")
const likeBtn = document.getElementById("likeBtn")
const shortlistBtn = document.getElementById("shortlistBtn")
const showInstructionsBtn = document.getElementById("showInstructionsBtn")
const swipeInstructions = document.getElementById("swipeInstructions")

// Stats elements
const totalJobs = document.getElementById("totalJobs")
const totalApplications = document.getElementById("totalApplications")
const pendingApplications = document.getElementById("pendingApplications")
const acceptedApplications = document.getElementById("acceptedApplications")

// Initialize the application
document.addEventListener("DOMContentLoaded", () => {
  // Check authentication state
  auth.onAuthStateChanged((user) => {
    if (user) {
      console.log("Firebase recognizes user:", user.uid)
      initializeWithAdmin(user)
    } else {
      signInAsAdmin()
    }
  })
})

// Sign in as admin (for demo purposes)
async function signInAsAdmin() {
  try {
    const result = await auth.signInAnonymously()
    console.log("Signed in as admin:", result.user.uid)
  } catch (error) {
    console.error("Error signing in as admin:", error)
    showError("Admin authentication failed")
  }
}

// Initialize with admin user
async function initializeWithAdmin(user) {
  try {
    currentAdmin = {
      uid: user.uid,
      email: user.email || "doom@digitalworld.com",
      name: user.displayName || "Dr. Doom",
      role: "admin",
    }

    setupEventListeners()
    loadJobs()
    loadStats()
  } catch (error) {
    console.error("Error initializing admin:", error)
    showError("Failed to initialize admin panel")
  }
}

// Event Listeners
function setupEventListeners() {
  // Modal controls
  createJobBtn.addEventListener("click", () => showModal(createJobModal))
  createJobClose.addEventListener("click", () => hideModal(createJobModal))
  cancelJobBtn.addEventListener("click", () => hideModal(createJobModal))

  jobDetailsClose.addEventListener("click", () => hideModal(jobDetailsModal))
  applicationsClose.addEventListener("click", () => hideModal(applicationsModal))
  savedApplicationsClose.addEventListener("click", () => hideModal(savedApplicationsModal))

  // Form submission
  createJobForm.addEventListener("submit", handleCreateJob)

  // Search and filters
  jobSearch.addEventListener("input", filterJobs)
  statusFilter.addEventListener("change", filterJobs)
  savedFilter.addEventListener("change", filterSavedApplications)

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
    console.log("Navigate to dashboard")
  })

  document.getElementById("applicationsBtn").addEventListener("click", () => {
    loadAllApplications()
    showModal(applicationsModal)
  })

  document.getElementById("savedApplicationsBtn").addEventListener("click", () => {
    loadSavedApplications()
    showModal(savedApplicationsModal)
  })

  // Action buttons
  rejectBtn.addEventListener("click", () => handleSwipeAction("rejected"))
  saveBtn.addEventListener("click", () => handleSwipeAction("saved"))
  likeBtn.addEventListener("click", () => handleSwipeAction("liked"))
  shortlistBtn.addEventListener("click", () => handleSwipeAction("shortlisted"))

  // Instructions toggle
  showInstructionsBtn.addEventListener("click", toggleInstructions)

  // Touch/Mouse events for swipe cards will be added dynamically
}

// Toggle instructions visibility
function toggleInstructions() {
  const isVisible = swipeInstructions.style.display !== "none"
  swipeInstructions.style.display = isVisible ? "none" : "grid"
  showInstructionsBtn.innerHTML = isVisible
    ? '<i class="fas fa-question-circle"></i><span>Show Instructions</span>'
    : '<i class="fas fa-eye-slash"></i><span>Hide Instructions</span>'
}

// Load jobs from Firestore
function loadJobs() {
  showLoadingJobs()

  const jobsRef = collection(db, "jobs")
  const jobsQuery = query(jobsRef, orderBy("createdAt", "desc"))

  jobsListener = onSnapshot(
    jobsQuery,
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

// Render jobs with enhanced styling
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
            <h4><i class="fas fa-clipboard-list"></i> Requirements</h4>
            <div class="requirements-grid">
              ${generateRequirementsHTML(job.requirements || {})}
            </div>
          </div>
          
          <div class="job-rewards">
            <h4><i class="fas fa-trophy"></i> Rewards</h4>
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

  if (!currentAdmin) {
    showError("Admin authentication required")
    return
  }

  const jobData = {
    title: document.getElementById("jobTitle").value.trim(),
    description: document.getElementById("jobDescription").value.trim(),
    category: document.getElementById("jobCategory").value,
    priority: document.getElementById("jobPriority").value,
    requirements: {
      combatPoints: Number.parseInt(document.getElementById("reqCombat").value) || 0,
      defensePoints: Number.parseInt(document.getElementById("reqDefense").value) || 0,
      techPoints: Number.parseInt(document.getElementById("reqTech").value) || 0,
      leadershipPoints: Number.parseInt(document.getElementById("reqLeadership").value) || 0,
      stealthPoints: Number.parseInt(document.getElementById("reqStealth").value) || 0,
      intelligencePoints: Number.parseInt(document.getElementById("reqIntelligence").value) || 0,
    },
    rewards: {
      combatPoints: Number.parseInt(document.getElementById("rewardCombat").value) || 0,
      defensePoints: Number.parseInt(document.getElementById("rewardDefense").value) || 0,
      techPoints: Number.parseInt(document.getElementById("rewardTech").value) || 0,
      leadershipPoints: Number.parseInt(document.getElementById("rewardLeadership").value) || 0,
      stealthPoints: Number.parseInt(document.getElementById("rewardStealth").value) || 0,
      intelligencePoints: Number.parseInt(document.getElementById("rewardIntelligence").value) || 0,
    },
    penalties: {
      combatPoints: Number.parseInt(document.getElementById("penaltyCombat").value) || 0,
      defensePoints: Number.parseInt(document.getElementById("penaltyDefense").value) || 0,
      techPoints: Number.parseInt(document.getElementById("penaltyTech").value) || 0,
      leadershipPoints: Number.parseInt(document.getElementById("penaltyLeadership").value) || 0,
      stealthPoints: Number.parseInt(document.getElementById("penaltyStealth").value) || 0,
      intelligencePoints: Number.parseInt(document.getElementById("penaltyIntelligence").value) || 0,
    },
    createdBy: currentAdmin.name,
    createdByUid: currentAdmin.uid,
    createdByEmail: currentAdmin.email,
    createdAt: serverTimestamp(),
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
    const jobsRef = collection(db, "jobs")
    await addDoc(jobsRef, jobData)
    showSuccess("Job posting created successfully!")
    hideModal(createJobModal)
    createJobForm.reset()
  } catch (error) {
    console.error("Error creating job:", error)
    showError("Failed to create job posting. Please check your permissions.")
  } finally {
    submitJobBtn.disabled = false
    submitJobBtn.innerHTML = '<i class="fas fa-plus"></i> <span>Create Job Posting</span>'
  }
}

// View job details
async function viewJobDetails(jobId) {
  try {
    const jobDocRef = doc(db, "jobs", jobId)
    const jobDoc = await getDoc(jobDocRef)
    if (!jobDoc.exists()) {
      showError("Job not found")
      return
    }

    const job = { id: jobDoc.id, ...jobDoc.data() }

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

// View job applications with swipe interface
async function viewJobApplications(jobId) {
  currentJobId = jobId

  try {
    const jobDocRef = doc(db, "jobs", jobId)
    const jobDoc = await getDoc(jobDocRef)
    if (!jobDoc.exists()) {
      showError("Job not found")
      return
    }

    const job = jobDoc.data()

    // Load applications for this job that haven't been reviewed yet
    const applicationsQuery = query(
      collection(db, "applications"),
      where("jobId", "==", jobId),
      where("adminAction", "==", null), // Only unreviewed applications
      orderBy("appliedAt", "desc"),
    )

    const applicationsSnapshot = await getDocs(applicationsQuery)
    currentApplications = []
    applicationsSnapshot.forEach((doc) => {
      const appData = doc.data()
      currentApplications.push({
        id: doc.id,
        jobTitle: job.title, // Add job title to application data
        ...appData,
      })
    })

    currentCardIndex = 0
    renderSwipeCards()
    showModal(applicationsModal)
  } catch (error) {
    console.error("Error loading applications:", error)
    showError("Failed to load applications")
  }
}

// Load all applications
async function loadAllApplications() {
  try {
    // Load all jobs first to get job titles
    const jobsSnapshot = await getDocs(collection(db, "jobs"))
    const jobsMap = {}
    jobsSnapshot.forEach((doc) => {
      jobsMap[doc.id] = doc.data().title
    })

    // Load only unreviewed applications
    const applicationsQuery = query(
      collection(db, "applications"),
      where("adminAction", "==", null), // Only unreviewed applications
      orderBy("appliedAt", "desc"),
    )
    const applicationsSnapshot = await getDocs(applicationsQuery)
    currentApplications = []
    applicationsSnapshot.forEach((doc) => {
      const appData = doc.data()
      currentApplications.push({
        id: doc.id,
        jobTitle: jobsMap[appData.jobId] || "Unknown Job", // Add job title
        ...appData,
      })
    })

    currentJobId = null
    currentCardIndex = 0
    renderSwipeCards()
    showModal(applicationsModal)
  } catch (error) {
    console.error("Error loading applications:", error)
    showError("Failed to load applications")
  }
}

// Render swipe cards
function renderSwipeCards() {
  if (currentApplications.length === 0) {
    swipeContainer.style.display = "none"
    emptyApplications.style.display = "flex"
    return
  }

  swipeContainer.style.display = "block"
  emptyApplications.style.display = "none"

  // Show only the next 4 cards for performance
  const cardsToShow = currentApplications.slice(currentCardIndex, currentCardIndex + 4)

  swipeStack.innerHTML = cardsToShow.map((application, index) => createSwipeCard(application, index)).join("")

  // Add event listeners to the top card
  const topCard = swipeStack.querySelector(".swipe-card")
  if (topCard) {
    addSwipeListeners(topCard)
  }

  // Check if we've reached the end
  if (currentCardIndex >= currentApplications.length) {
    swipeContainer.style.display = "none"
    emptyApplications.style.display = "flex"
  }
}

// Create a swipe card
function createSwipeCard(application, stackIndex) {
  const skillIcons = {
    combat: "fist-raised",
    defense: "shield-alt",
    tech: "cog",
    leadership: "crown",
    stealth: "user-ninja",
    intelligence: "brain",
  }

  return `
    <div class="swipe-card" data-application-id="${application.id}" data-stack-index="${stackIndex}">
      <div class="swipe-card-header">
        <div class="swipe-card-avatar">
          ${getInitials(application.candidateName)}
        </div>
        <div class="swipe-card-info">
          <h4>${application.candidateName}</h4>
          <p>${application.candidateEmail}</p>
          <div class="job-applied-for">
            <i class="fas fa-briefcase"></i>
            <span>Applied for: ${application.jobTitle}</span>
          </div>
        </div>
      </div>
      
      <div class="swipe-card-stats">
        ${Object.entries(application.candidateStats || {})
          .map(
            ([skill, points]) => `
            <div class="swipe-card-stat">
              <i class="fas fa-${skillIcons[skill] || "star"}"></i>
              <span>${skill}: ${points}</span>
            </div>
          `,
          )
          .join("")}
      </div>
      
      <div class="swipe-card-resume">
        <h5>Resume:</h5>
        <p>${application.resumeText ? application.resumeText.substring(0, 300) + "..." : "No resume text provided"}</p>
        ${application.resumeFileUrl ? `<p><i class="fas fa-file-pdf"></i> <a href="${application.resumeFileUrl}" target="_blank">PDF Resume</a></p>` : ""}
      </div>
      
      <!-- Swipe Indicators -->
      <div class="swipe-indicator reject">
        <i class="fas fa-times"></i>
      </div>
      <div class="swipe-indicator shortlist">
        <i class="fas fa-check"></i>
      </div>
      <div class="swipe-indicator save">
        <i class="fas fa-bookmark"></i>
      </div>
      <div class="swipe-indicator like">
        <i class="fas fa-heart"></i>
      </div>
    </div>
  `
}

// Add swipe listeners to a card
function addSwipeListeners(card) {
  // Mouse events
  card.addEventListener("mousedown", handleStart)
  document.addEventListener("mousemove", handleMove)
  document.addEventListener("mouseup", handleEnd)

  // Touch events
  card.addEventListener("touchstart", handleStart, { passive: false })
  document.addEventListener("touchmove", handleMove, { passive: false })
  document.addEventListener("touchend", handleEnd)
}

// Handle start of drag/touch
function handleStart(e) {
  if (!isSwipeEnabled) return

  isDragging = true
  const clientX = e.type === "mousedown" ? e.clientX : e.touches[0].clientX
  const clientY = e.type === "mousedown" ? e.clientY : e.touches[0].clientY

  startX = clientX
  startY = clientY
  currentX = clientX
  currentY = clientY

  const card = e.currentTarget
  card.classList.add("dragging")

  e.preventDefault()
}

// Handle drag/touch move
function handleMove(e) {
  if (!isDragging || !isSwipeEnabled) return

  const clientX = e.type === "mousemove" ? e.clientX : e.touches[0].clientX
  const clientY = e.type === "mousemove" ? e.clientY : e.touches[0].clientY

  currentX = clientX
  currentY = clientY

  const deltaX = currentX - startX
  const deltaY = currentY - startY

  const card = document.querySelector(".swipe-card.dragging")
  if (!card) return

  // Apply transform
  const rotation = deltaX * 0.1
  card.style.transform = `translateX(${deltaX}px) translateY(${deltaY}px) rotate(${rotation}deg)`

  // Show appropriate indicator
  const indicators = card.querySelectorAll(".swipe-indicator")
  indicators.forEach((indicator) => (indicator.style.opacity = "0"))

  const threshold = 80
  if (Math.abs(deltaX) > Math.abs(deltaY)) {
    if (deltaX > threshold) {
      card.querySelector(".swipe-indicator.shortlist").style.opacity = "1"
    } else if (deltaX < -threshold) {
      card.querySelector(".swipe-indicator.reject").style.opacity = "1"
    }
  } else {
    if (deltaY < -threshold) {
      card.querySelector(".swipe-indicator.save").style.opacity = "1"
    } else if (deltaY > threshold) {
      card.querySelector(".swipe-indicator.like").style.opacity = "1"
    }
  }

  e.preventDefault()
}

// Handle end of drag/touch
function handleEnd(e) {
  if (!isDragging || !isSwipeEnabled) return

  isDragging = false

  const card = document.querySelector(".swipe-card.dragging")
  if (!card) return

  card.classList.remove("dragging")

  const deltaX = currentX - startX
  const deltaY = currentY - startY
  const threshold = 100

  let action = null

  if (Math.abs(deltaX) > Math.abs(deltaY)) {
    if (deltaX > threshold) {
      action = "shortlisted"
      card.classList.add("swiped-right")
    } else if (deltaX < -threshold) {
      action = "rejected"
      card.classList.add("swiped-left")
    }
  } else {
    if (deltaY < -threshold) {
      action = "saved"
      card.classList.add("swiped-up")
    } else if (deltaY > threshold) {
      action = "liked"
      card.classList.add("swiped-down")
    }
  }

  if (action) {
    const applicationId = card.dataset.applicationId
    handleSwipeAction(action, applicationId)
  } else {
    // Reset card position
    card.style.transform = ""
    const indicators = card.querySelectorAll(".swipe-indicator")
    indicators.forEach((indicator) => (indicator.style.opacity = "0"))
  }
}

// Handle swipe action
async function handleSwipeAction(action, applicationId = null) {
  if (!isSwipeEnabled) return

  isSwipeEnabled = false

  const topCard = swipeStack.querySelector(".swipe-card")
  if (!topCard) return

  const appId = applicationId || topCard.dataset.applicationId

  try {
    // Update application status in Firestore
    const applicationRef = doc(db, "applications", appId)
    const updateData = {
      adminAction: action,
      reviewedAt: serverTimestamp(),
      reviewedBy: currentAdmin.name,
      reviewedByUid: currentAdmin.uid,
    }

    // Set specific status based on action
    if (action === "rejected") {
      updateData.status = "rejected"
    } else if (action === "shortlisted") {
      updateData.status = "accepted"
      updateData.interviewEnabled = true
    }

    await updateDoc(applicationRef, updateData)

    // Animate card out if not already animated
    if (!applicationId) {
      switch (action) {
        case "rejected":
          topCard.classList.add("swiped-left")
          break
        case "shortlisted":
          topCard.classList.add("swiped-right")
          break
        case "saved":
          topCard.classList.add("swiped-up")
          break
        case "liked":
          topCard.classList.add("swiped-down")
          break
      }
    }

    // Show success message
    const actionMessages = {
      rejected: "Application rejected",
      shortlisted: "Application shortlisted for interview",
      saved: "Application saved for later review",
      liked: "Application marked as top candidate",
    }

    showSuccess(actionMessages[action])

    // Move to next card after animation
    setTimeout(() => {
      currentCardIndex++
      renderSwipeCards()
      isSwipeEnabled = true
    }, 300)
  } catch (error) {
    console.error("Error updating application:", error)
    showError("Failed to update application")
    isSwipeEnabled = true
  }
}

// Load saved applications
async function loadSavedApplications() {
  try {
    // Load all jobs first to get job titles
    const jobsSnapshot = await getDocs(collection(db, "jobs"))
    const jobsMap = {}
    jobsSnapshot.forEach((doc) => {
      jobsMap[doc.id] = doc.data().title
    })

    // Load only saved and liked applications (exclude shortlisted)
    const applicationsQuery = query(
      collection(db, "applications"),
      where("adminAction", "in", ["saved", "liked"]),
      orderBy("reviewedAt", "desc"),
    )

    const applicationsSnapshot = await getDocs(applicationsQuery)
    const savedApplications = []
    applicationsSnapshot.forEach((doc) => {
      const appData = doc.data()
      savedApplications.push({
        id: doc.id,
        jobTitle: jobsMap[appData.jobId] || "Unknown Job",
        ...appData,
      })
    })

    renderSavedApplications(savedApplications)
  } catch (error) {
    console.error("Error loading saved applications:", error)
    showError("Failed to load saved applications")
  }
}

// Render saved applications
function renderSavedApplications(applications) {
  if (applications.length === 0) {
    savedApplicationsContainer.innerHTML = `
      <div class="empty-applications">
        <div class="empty-icon">
          <i class="fas fa-bookmark"></i>
        </div>
        <h3>No Saved Applications</h3>
        <p>Applications you save or like will appear here.</p>
      </div>
    `
    return
  }

  savedApplicationsContainer.innerHTML = applications
    .map(
      (application) => `
      <div class="saved-application-card ${application.adminAction}">
        <div class="saved-card-header">
          <div class="application-candidate">
            <div class="application-avatar">
              ${getInitials(application.candidateName)}
            </div>
            <div class="application-candidate-info">
              <h4>${application.candidateName}</h4>
              <p>${application.candidateEmail}</p>
              <div class="job-applied-for">
                <i class="fas fa-briefcase"></i>
                <span>${application.jobTitle}</span>
              </div>
            </div>
          </div>
          <span class="saved-card-status ${application.adminAction}">
            ${application.adminAction}
          </span>
        </div>
        
        <div class="application-stats">
          ${generateApplicationStatsHTML(application.candidateStats || {})}
        </div>
        
        <div class="application-resume">
          <h5>Resume:</h5>
          <p>${application.resumeText ? application.resumeText.substring(0, 150) + "..." : "No resume text provided"}</p>
          ${application.resumeFileUrl ? `<p><i class="fas fa-file-pdf"></i> <a href="${application.resumeFileUrl}" target="_blank">PDF Resume</a></p>` : ""}
        </div>
        
        <div class="application-actions">
          <button class="btn secondary" onclick="viewApplicationDetails('${application.id}')">
            <i class="fas fa-eye"></i>
            <span>View Details</span>
          </button>
          <button class="btn danger" onclick="removeFromSaved('${application.id}')">
            <i class="fas fa-trash"></i>
            <span>Remove</span>
          </button>
        </div>
      </div>
    `,
    )
    .join("")
}

// Filter saved applications
function filterSavedApplications() {
  const filterValue = savedFilter.value
  const cards = savedApplicationsContainer.querySelectorAll(".saved-application-card")

  cards.forEach((card) => {
    if (filterValue === "all" || card.classList.contains(filterValue)) {
      card.style.display = "block"
    } else {
      card.style.display = "none"
    }
  })
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

// Start chat with shortlisted candidate
function startChat(applicationId) {
  // This would integrate with your chat system
  showSuccess("Chat feature would be implemented here")
  console.log("Starting chat with application:", applicationId)
}

// Remove from saved applications
async function removeFromSaved(applicationId) {
  try {
    const applicationRef = doc(db, "applications", applicationId)
    await updateDoc(applicationRef, {
      adminAction: null,
      reviewedAt: serverTimestamp(),
      reviewedBy: currentAdmin.name,
    })

    showSuccess("Application removed from saved")
    loadSavedApplications() // Refresh the list
  } catch (error) {
    console.error("Error removing application:", error)
    showError("Failed to remove application")
  }
}

// View application details
async function viewApplicationDetails(applicationId) {
  // This would show a detailed view of the application
  showSuccess("Application details would be shown here")
  console.log("Viewing application details:", applicationId)
}

// Toggle job status
async function toggleJobStatus(jobId, currentStatus) {
  if (!currentAdmin) {
    showError("Admin authentication required")
    return
  }

  const newStatus = currentStatus === "active" ? "closed" : "active"

  try {
    const jobRef = doc(db, "jobs", jobId)
    await updateDoc(jobRef, {
      status: newStatus,
      updatedAt: serverTimestamp(),
      updatedBy: currentAdmin.name,
      updatedByUid: currentAdmin.uid,
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
    const jobsRef = collection(db, "jobs")
    const jobsSnapshot = await getDocs(jobsRef)
    const activeJobs = jobsSnapshot.docs.filter((doc) => doc.data().status === "active")
    totalJobs.textContent = activeJobs.length

    // Load applications stats
    const applicationsRef = collection(db, "applications")
    const applicationsSnapshot = await getDocs(applicationsRef)
    totalApplications.textContent = applicationsSnapshot.size

    const pendingApps = applicationsSnapshot.docs.filter((doc) => !doc.data().status || doc.data().status === "pending")
    pendingApplications.textContent = pendingApps.length

    const acceptedApps = applicationsSnapshot.docs.filter(
      (doc) => doc.data().status === "accepted" || doc.data().status === "shortlisted",
    )
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

function showLoadingJobs() {
  const loadingElement = document.querySelector(".loading-jobs")
  if (loadingElement) {
    loadingElement.style.display = "flex"
  }
}

function hideLoadingJobs() {
  const loadingElement = document.querySelector(".loading-jobs")
  if (loadingElement) {
    loadingElement.style.display = "none"
  }
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

  let date

  // Handle Firebase Timestamp
  if (timestamp instanceof Timestamp) {
    date = timestamp.toDate()
  }
  // Handle object with toDate() method (fallback)
  else if (timestamp.toDate && typeof timestamp.toDate === "function") {
    date = timestamp.toDate()
  }
  // Handle plain Date or number
  else {
    date = new Date(timestamp)
  }

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
window.viewJobDetails = viewJobDetails
window.viewJobApplications = viewJobApplications
window.toggleJobStatus = toggleJobStatus
window.startChat = startChat
window.removeFromSaved = removeFromSaved
window.viewApplicationDetails = viewApplicationDetails
