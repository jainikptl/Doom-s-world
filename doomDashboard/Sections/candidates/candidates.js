// Global variables
let allCandidates = []
let filteredCandidates = []
const selectedCandidate = null

// Wait for Firebase to be ready
function waitForFirebase() {
  return new Promise((resolve) => {
    const checkFirebase = () => {
      if (window.firebaseReady && window.db && window.auth && window.firestoreUtils) {
        resolve()
      } else {
        setTimeout(checkFirebase, 100)
      }
    }
    checkFirebase()
  })
}

// Initialize the page
document.addEventListener("DOMContentLoaded", async () => {
  try {
    await waitForFirebase()
    await loadCandidates()
    setupEventListeners()
  } catch (error) {
    console.error("Error initializing page:", error)
    showToast("Error initializing application", "error")
  }
})

// Setup event listeners
function setupEventListeners() {
  // Form submission
  document.getElementById("addCandidateForm").addEventListener("submit", handleAddCandidate)

  // Score input synchronization
  const scoreInputs = document.querySelectorAll('input[id$="Score"]')
  scoreInputs.forEach((input) => {
    input.addEventListener("input", () => {
      const slider = input.parentElement.querySelector('input[type="range"]')
      if (slider) {
        slider.value = input.value
      }
      updateTotalScore()
    })
  })

  // Initial total score calculation
  updateTotalScore()
}

// Load candidates from Firebase
async function loadCandidates() {
  try {
    const { collection, query, where, getDocs } = window.firestoreUtils
    const usersRef = collection(window.db, "users")
    const q = query(usersRef, where("character", "==", "candidate"))
    const querySnapshot = await getDocs(q)

    allCandidates = []
    querySnapshot.forEach((doc) => {
      const data = doc.data()
      allCandidates.push({
        id: doc.id,
        ...data,
        // Ensure ability scores exist
        abilityScores: data.abilityScores || {
          combat: data.combat || 0,
          defence: data.defence || 0,
          intelligence: data.intelligence || 0,
          leadership: data.leadership || 0,
          stealth: data.stealth || 0,
          tech: data.tech || 0,
        },
        completedAssignments: data.completedAssignments || 0,
      })
    })

    filteredCandidates = [...allCandidates]
    displayCandidates()
    updateStats()

    document.getElementById("loadingState").style.display = "none"

    if (allCandidates.length === 0) {
      document.getElementById("emptyState").style.display = "flex"
    } else {
      document.getElementById("candidatesList").style.display = "grid"
    }
  } catch (error) {
    console.error("Error loading candidates:", error)
    showToast("Error loading candidates", "error")
    document.getElementById("loadingState").style.display = "none"
    document.getElementById("emptyState").style.display = "flex"
  }
}

// Display candidates
function displayCandidates() {
  const candidatesList = document.getElementById("candidatesList")
  candidatesList.innerHTML = ""

  filteredCandidates.forEach((candidate) => {
    const candidateCard = createCandidateCard(candidate)
    candidatesList.appendChild(candidateCard)
  })
}

// Create candidate card
function createCandidateCard(candidate) {
  const card = document.createElement("div")
  card.className = "candidate-card"
  card.setAttribute("data-candidate-id", candidate.id)

  const status = candidate.status || "active"
  const totalScore = calculateTotalScore(candidate)
  const joinDate = candidate.createdAt ? new Date(candidate.createdAt).toLocaleDateString() : "Unknown"

  card.innerHTML = `
    <div class="candidate-header">
      <div class="candidate-avatar">
        ${candidate.name ? candidate.name.charAt(0).toUpperCase() : "C"}
      </div>
      <div class="candidate-info">
        <h3>${candidate.name || "Unknown Candidate"}</h3>
        <p>${candidate.email || "No email provided"}</p>
      </div>
      <div class="candidate-status ${status}">
        ${status.charAt(0).toUpperCase() + status.slice(1)}
      </div>
    </div>
    
    <div class="candidate-details">
      <div class="candidate-meta">
        <p><i class="fas fa-calendar"></i> Joined: ${joinDate}</p>
        <p><i class="fas fa-phone"></i> ${candidate.phone || "No phone provided"}</p>
        ${
          candidate.bio
            ? `<p><i class="fas fa-info-circle"></i> ${candidate.bio.substring(0, 50)}${candidate.bio.length > 50 ? "..." : ""}</p>`
            : ""
        }
      </div>
      
      <div class="ability-scores">
        <h4>Ability Scores</h4>
        <div class="ability-scores-display">
          <div class="ability-score">
            <div class="score-name">Combat</div>
            <div class="score-value">${candidate.abilityScores.combat || candidate.combat || 0}</div>
          </div>
          <div class="ability-score">
            <div class="score-name">Defence</div>
            <div class="score-value">${candidate.abilityScores.defence || candidate.defence || 0}</div>
          </div>
          <div class="ability-score">
            <div class="score-name">Intel</div>
            <div class="score-value">${candidate.abilityScores.intelligence || candidate.intelligence || 0}</div>
          </div>
          <div class="ability-score">
            <div class="score-name">Leader</div>
            <div class="score-value">${candidate.abilityScores.leadership || candidate.leadership || 0}</div>
          </div>
          <div class="ability-score">
            <div class="score-name">Stealth</div>
            <div class="score-value">${candidate.abilityScores.stealth || candidate.stealth || 0}</div>
          </div>
          <div class="ability-score">
            <div class="score-name">Tech</div>
            <div class="score-value">${candidate.abilityScores.tech || candidate.tech || 0}</div>
          </div>
        </div>
        <div class="total-score-display">
          Total Score: ${totalScore}
        </div>
      </div>
    </div>
    
    <div class="candidate-actions">
      <button class="btn secondary" onclick="viewCandidate('${candidate.id}')">
        <i class="fas fa-eye"></i>
        View Details
      </button>
      <button class="btn primary" onclick="editCandidate('${candidate.id}')">
        <i class="fas fa-edit"></i>
        Edit
      </button>
    </div>
  `

  return card
}

// Calculate total ability score
function calculateTotalScore(candidate) {
  if (!candidate) return 0
  return (
    (candidate.combat || 0) +
    (candidate.defence || 0) +
    (candidate.intelligence || 0) +
    (candidate.leadership || 0) +
    (candidate.stealth || 0) +
    (candidate.tech || 0)
  )
}

// Update statistics
function updateStats() {
  const totalCandidates = allCandidates.length
  const activeCandidates = allCandidates.filter((c) => c.status !== "inactive").length

  // Calculate average score
  const totalScores = allCandidates.reduce((sum, candidate) => {
    return sum + calculateTotalScore(candidate)
  }, 0)
  const averageScore = totalCandidates > 0 ? Math.round(totalScores / totalCandidates) : 0

  // Calculate new candidates this month
  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()
  const newThisMonth = allCandidates.filter((candidate) => {
    if (!candidate.createdAt) return false
    const candidateDate = new Date(candidate.createdAt)
    return candidateDate.getMonth() === currentMonth && candidateDate.getFullYear() === currentYear
  }).length

  document.getElementById("totalCandidates").textContent = totalCandidates
  document.getElementById("activeCandidates").textContent = activeCandidates
  document.getElementById("averageScore").textContent = averageScore
  document.getElementById("newThisMonth").textContent = newThisMonth
}

// Filter candidates
function filterCandidates() {
  const searchTerm = document.getElementById("searchInput").value.toLowerCase()
  const statusFilter = document.getElementById("filterStatus").value

  filteredCandidates = allCandidates.filter((candidate) => {
    const matchesSearch =
      !searchTerm ||
      candidate.name?.toLowerCase().includes(searchTerm) ||
      candidate.email?.toLowerCase().includes(searchTerm) ||
      candidate.bio?.toLowerCase().includes(searchTerm)

    const matchesStatus = statusFilter === "all" || (candidate.status || "active") === statusFilter

    return matchesSearch && matchesStatus
  })

  displayCandidates()

  if (filteredCandidates.length === 0) {
    document.getElementById("candidatesList").innerHTML = `
      <div class="loading-jobs">
        <div class="loading-spinner">
          <i class="fas fa-search"></i>
        </div>
        <p>No candidates match your search criteria.</p>
      </div>
    `
  }
}

// Sort candidates
function sortCandidates() {
  const sortBy = document.getElementById("sortBy").value

  filteredCandidates.sort((a, b) => {
    switch (sortBy) {
      case "name":
        return (a.name || "").localeCompare(b.name || "")
      case "email":
        return (a.email || "").localeCompare(b.email || "")
      case "score":
        return calculateTotalScore(b) - calculateTotalScore(a)
      case "date":
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
      default:
        return 0
    }
  })

  displayCandidates()
}

// Open add candidate modal
function openAddCandidateModal() {
  // Reset form
  document.getElementById("addCandidateForm").reset()

  // Reset ability scores to default
  const scoreInputs = [
    "combatScore",
    "defenceScore",
    "intelligenceScore",
    "leadershipScore",
    "stealthScore",
    "techScore",
  ]
  scoreInputs.forEach((inputId) => {
    document.getElementById(inputId).value = 0
    const slider = document.getElementById(inputId).parentElement.querySelector('input[type="range"]')
    if (slider) slider.value = 0
  })

  updateTotalScore()

  // Show modal
  document.getElementById("addCandidateModal").style.display = "flex"
}

// Close add candidate modal
function closeAddCandidateModal() {
  document.getElementById("addCandidateModal").style.display = "none"
}

// Handle add candidate form submission
async function handleAddCandidate(e) {
  e.preventDefault()

  const formData = {
    name: document.getElementById("candidateName").value.trim(),
    email: document.getElementById("candidateEmail").value.trim(),
    phone: document.getElementById("candidatePhone").value.trim(),
    password: document.getElementById("candidatePassword").value,
    bio: document.getElementById("candidateBio").value.trim(),
    status: document.getElementById("candidateStatus").value,
    combat: Number.parseInt(document.getElementById("combatScore").value),
    defence: Number.parseInt(document.getElementById("defenceScore").value),
    intelligence: Number.parseInt(document.getElementById("intelligenceScore").value),
    leadership: Number.parseInt(document.getElementById("leadershipScore").value),
    stealth: Number.parseInt(document.getElementById("stealthScore").value),
    tech: Number.parseInt(document.getElementById("techScore").value),
    completedAssignments: 0,
  }

  // Validation
  if (!formData.name || !formData.email || !formData.password) {
    showToast("Please fill in all required fields", "error")
    return
  }

  if (formData.password.length < 6) {
    showToast("Password must be at least 6 characters long", "error")
    return
  }

  try {
    // Create user in Firebase Auth
    const { createUserWithEmailAndPassword, updateProfile } = await import(
      "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js"
    )

    const userCredential = await createUserWithEmailAndPassword(window.auth, formData.email, formData.password)
    const user = userCredential.user

    // Update user profile
    await updateProfile(user, {
      displayName: formData.name,
    })

    // Add user to Firestore users collection
    const { collection, doc, setDoc } = window.firestoreUtils
    const usersRef = collection(window.db, "users")
    const userDoc = doc(usersRef, user.uid)

    await setDoc(userDoc, {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      bio: formData.bio,
      character: "candidate",
      status: formData.status,
      combat: formData.combat,
      defence: formData.defence,
      intelligence: formData.intelligence,
      leadership: formData.leadership,
      stealth: formData.stealth,
      tech: formData.tech,
      completedAssignments: formData.completedAssignments,
      createdAt: new Date().toISOString(),
      createdBy: window.auth.currentUser?.uid || "admin",
    })

    showToast("Candidate added successfully!", "success")
    closeAddCandidateModal()
    await loadCandidates()
  } catch (error) {
    console.error("Error adding candidate:", error)
    let errorMessage = "Error adding candidate"

    if (error.code === "auth/email-already-in-use") {
      errorMessage = "Email address is already in use"
    } else if (error.code === "auth/invalid-email") {
      errorMessage = "Invalid email address"
    } else if (error.code === "auth/weak-password") {
      errorMessage = "Password is too weak"
    }

    showToast(errorMessage, "error")
  }
}

// Update score input from slider
function updateScoreInput(inputId, value) {
  document.getElementById(inputId).value = value
  updateTotalScore()
}

// Update total score display
function updateTotalScore() {
  const scores = [
    Number.parseInt(document.getElementById("combatScore").value) || 0,
    Number.parseInt(document.getElementById("defenceScore").value) || 0,
    Number.parseInt(document.getElementById("intelligenceScore").value) || 0,
    Number.parseInt(document.getElementById("leadershipScore").value) || 0,
    Number.parseInt(document.getElementById("stealthScore").value) || 0,
    Number.parseInt(document.getElementById("techScore").value) || 0,
  ]

  const total = scores.reduce((sum, score) => sum + score, 0)
  document.getElementById("totalScore").textContent = total
}

// View candidate details
function viewCandidate(candidateId) {
  const candidate = allCandidates.find((c) => c.id === candidateId)
  if (!candidate) return

  const modal = document.getElementById("viewCandidateModal")
  const content = document.getElementById("candidateDetailsContent")

  const totalScore = calculateTotalScore(candidate)
  const joinDate = candidate.createdAt ? new Date(candidate.createdAt).toLocaleDateString() : "Unknown"

  content.innerHTML = `
    <div class="candidate-details-view">
      <div class="candidate-header-view">
        <div class="candidate-avatar-large">
          ${candidate.name ? candidate.name.charAt(0).toUpperCase() : "C"}
        </div>
        <div class="candidate-info-view">
          <h3>${candidate.name || "Unknown Candidate"}</h3>
          <p>${candidate.email || "No email provided"}</p>
          <div class="candidate-status ${candidate.status || "active"}">
            ${(candidate.status || "active").charAt(0).toUpperCase() + (candidate.status || "active").slice(1)}
          </div>
        </div>
      </div>
      
      <div class="candidate-meta-view">
        <div class="meta-item">
          <i class="fas fa-calendar"></i>
          <span>Joined: ${joinDate}</span>
        </div>
        <div class="meta-item">
          <i class="fas fa-phone"></i>
          <span>${candidate.phone || "No phone provided"}</span>
        </div>
        <div class="meta-item">
          <i class="fas fa-user"></i>
          <span>Character: ${candidate.character || "candidate"}</span>
        </div>
      </div>
      
      ${
        candidate.bio
          ? `
        <div class="candidate-bio-view">
          <h4>Bio</h4>
          <p>${candidate.bio}</p>
        </div>
      `
          : ""
      }
      
      <div class="ability-scores-view">
        <h4>Ability Scores</h4>
        <div class="ability-scores-grid-view">
          <div class="ability-score-large">
            <div class="score-name">Combat</div>
            <div class="score-value">${candidate.combat || 0}</div>
          </div>
          <div class="ability-score-large">
            <div class="score-name">Defence</div>
            <div class="score-value">${candidate.defence || 0}</div>
          </div>
          <div class="ability-score-large">
            <div class="score-name">Intelligence</div>
            <div class="score-value">${candidate.intelligence || 0}</div>
          </div>
          <div class="ability-score-large">
            <div class="score-name">Leadership</div>
            <div class="score-value">${candidate.leadership || 0}</div>
          </div>
          <div class="ability-score-large">
            <div class="score-name">Stealth</div>
            <div class="score-value">${candidate.stealth || 0}</div>
          </div>
          <div class="ability-score-large">
            <div class="score-name">Tech</div>
            <div class="score-value">${candidate.tech || 0}</div>
          </div>
        </div>
        <div class="total-score-large">
          Total Score: ${calculateTotalScore(candidate)}
        </div>
      </div>
      <div class="assignments-view">
        <h4>Assignments</h4>
        <div class="assignments-info">
          <div class="assignment-stat">
            <i class="fas fa-tasks"></i>
            <span>Completed: ${candidate.completedAssignments || 0}</span>
          </div>
        </div>
      </div>
    </div>
  `

  // Set up edit button
  document.getElementById("editCandidateBtn").onclick = () => {
    closeViewCandidateModal()
    editCandidate(candidateId)
  }

  modal.style.display = "flex"
}

// Close view candidate modal
function closeViewCandidateModal() {
  document.getElementById("viewCandidateModal").style.display = "none"
}

// Edit candidate (placeholder for now)
function editCandidate(candidateId) {
  const candidate = allCandidates.find((c) => c.id === candidateId)
  if (!candidate) return

  // For now, just show a toast - you can implement full edit functionality later
  showToast(`Edit functionality for ${candidate.name} coming soon`, "info")
}

// Show toast notification
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

  // Set icon based on type
  const icon = toast.querySelector("i")
  icon.className = `fas fa-${getToastIcon(type)}`

  // Show toast
  toast.classList.add("show")

  // Hide after 3 seconds
  setTimeout(() => {
    toast.classList.remove("show")
  }, 3000)
}

function getToastIcon(type) {
  switch (type) {
    case "success":
      return "check-circle"
    case "error":
      return "exclamation-circle"
    case "warning":
      return "exclamation-triangle"
    case "info":
    default:
      return "info-circle"
  }
}

// Logout function
function logout() {
  if (window.auth && window.auth.signOut) {
    window.auth
      .signOut()
      .then(() => {
        window.location.href = "login.html"
      })
      .catch((error) => {
        console.error("Error signing out:", error)
        showToast("Error signing out", "error")
      })
  } else {
    window.location.href = "login.html"
  }
}

// Make functions globally accessible
window.openAddCandidateModal = openAddCandidateModal
window.closeAddCandidateModal = closeAddCandidateModal
window.updateScoreInput = updateScoreInput
window.filterCandidates = filterCandidates
window.sortCandidates = sortCandidates
window.viewCandidate = viewCandidate
window.closeViewCandidateModal = closeViewCandidateModal
window.editCandidate = editCandidate
window.logout = logout
