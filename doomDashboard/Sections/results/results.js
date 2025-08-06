// Results Page JavaScript - Category-based Task Completion Management

// Global variables
let assignedCandidates = []
let filteredCandidates = []
let selectedCandidate = null
let selectedEvaluation = null
let jobDetails = null

// Ability categories with their icons
const ABILITY_CATEGORIES = {
  combatPoints: { name: "Combat", icon: "fas fa-fist-raised" },
  defensePoints: { name: "Defense", icon: "fas fa-shield-alt" },
  techPoints: { name: "Tech", icon: "fas fa-microchip" },
  intelligencePoints: { name: "Intelligence", icon: "fas fa-brain" },
  stealthPoints: { name: "Stealth", icon: "fas fa-user-ninja" },
  leadershipPoints: { name: "Leadership", icon: "fas fa-crown" },
}

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

// Expose functions to global scope
window.openEvaluationModal = openEvaluationModal
window.closeEvaluationModal = closeEvaluationModal
window.openAbilitiesHistoryModal = openAbilitiesHistoryModal
window.closeAbilitiesHistoryModal = closeAbilitiesHistoryModal
window.openBulkActionsModal = openBulkActionsModal
window.closeBulkActionsModal = closeBulkActionsModal
window.selectEvaluation = selectEvaluation
window.confirmEvaluation = confirmEvaluation
window.filterCandidates = filterCandidates
window.sortCandidates = sortCandidates
window.refreshResults = refreshResults
window.bulkMarkCompleted = bulkMarkCompleted
window.bulkMarkFailed = bulkMarkFailed
window.bulkExportData = bulkExportData
window.logout = logout

// Initialize the page
document.addEventListener("DOMContentLoaded", async () => {
  try {
    await waitForFirebase()
    await loadAssignedCandidates()
    setupEventListeners()
    showNotification("Results page loaded successfully", "success")
  } catch (error) {
    console.error("Error initializing results page:", error)
    showNotification("Error initializing application", "error")
  }
})

// Setup event listeners
function setupEventListeners() {
  // Search input
  const searchInput = document.getElementById("searchInput")
  if (searchInput) {
    searchInput.addEventListener("input", filterCandidates)
  }

  // Filter and sort dropdowns
  const statusFilter = document.getElementById("statusFilter")
  const sortBy = document.getElementById("sortBy")

  if (statusFilter) {
    statusFilter.addEventListener("change", filterCandidates)
  }

  if (sortBy) {
    sortBy.addEventListener("change", sortCandidates)
  }

  // Keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeAllModals()
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "r") {
      e.preventDefault()
      refreshResults()
    }
  })
}

// Load assigned candidates from Firebase
async function loadAssignedCandidates() {
  try {
    showLoadingState()

    const { collection, query, where, getDocs, orderBy } = window.firestoreUtils
    const applicationsRef = collection(window.db, "applications")
    const q = query(
      applicationsRef,
      where("interviewStatus", "in", ["assigned", "pending_evaluation", "task_completed", "task_failed"]),
      orderBy("assignedAt", "desc"),
    )

    const querySnapshot = await getDocs(q)

    assignedCandidates = []
    for (const doc of querySnapshot.docs) {
      const data = doc.data()

      // Get job details for this candidate
      const jobData = await getJobDetails(data.jobId)

      // Get candidate abilities from users collection
      const candidateAbilities = await getCandidateAbilities(data.candidateId)

      assignedCandidates.push({
        id: doc.id,
        ...data,
        jobDetails: jobData,
        abilities: candidateAbilities,
        taskStatus: data.interviewStatus || "assigned",
      })
    }

    filteredCandidates = [...assignedCandidates]
    displayCandidates()
    updateStats()
    hideLoadingState()

    if (assignedCandidates.length === 0) {
      showEmptyState()
    } else {
      showCandidatesSection()
    }

    console.log(`Loaded ${assignedCandidates.length} assigned candidates`)
  } catch (error) {
    console.error("Error loading assigned candidates:", error)
    showNotification("Error loading candidates", "error")
    hideLoadingState()
    showEmptyState()
  }
}

// Get job details from jobs collection
async function getJobDetails(jobId) {
  if (!jobId) return null

  try {
    const { doc, getDoc } = window.firestoreUtils
    const jobRef = doc(window.db, "jobs", jobId)
    const jobSnap = await getDoc(jobRef)

    if (jobSnap.exists()) {
      return jobSnap.data()
    }
    return null
  } catch (error) {
    console.error("Error fetching job details:", error)
    return null
  }
}

// Get candidate abilities from users collection
async function getCandidateAbilities(candidateId) {
  if (!candidateId) return getDefaultAbilities()

  try {
    const { doc, getDoc } = window.firestoreUtils
    const userRef = doc(window.db, "users", candidateId)
    const userSnap = await getDoc(userRef)

    if (userSnap.exists()) {
      const userData = userSnap.data()
      return {
        combatPoints: userData.combatPoints || 0,
        defensePoints: userData.defensePoints || 0,
        techPoints: userData.techPoints || 0,
        intelligencePoints: userData.intelligencePoints || 0,
        stealthPoints: userData.stealthPoints || 0,
        leadershipPoints: userData.leadershipPoints || 0,
      }
    }
    return getDefaultAbilities()
  } catch (error) {
    console.error("Error fetching candidate abilities:", error)
    return getDefaultAbilities()
  }
}

// Get default abilities
function getDefaultAbilities() {
  return {
    combatPoints: 0,
    defensePoints: 0,
    techPoints: 0,
    intelligencePoints: 0,
    stealthPoints: 0,
    leadershipPoints: 0,
  }
}

// Display candidates
function displayCandidates() {
  const candidatesList = document.getElementById("candidatesList")
  if (!candidatesList) return

  candidatesList.innerHTML = ""

  if (filteredCandidates.length === 0) {
    candidatesList.innerHTML = `
      <div class="loading-jobs">
        <div class="loading-spinner">
          <i class="fas fa-search"></i>
        </div>
        <p>No candidates match your search criteria.</p>
      </div>
    `
    return
  }

  filteredCandidates.forEach((candidate) => {
    const candidateCard = createCandidateCard(candidate)
    candidatesList.appendChild(candidateCard)
  })
}

// Create candidate card
function createCandidateCard(candidate) {
  const card = document.createElement("div")
  card.className = "candidate-card animate-in"
  card.setAttribute("data-candidate-id", candidate.id)

  const statusClass = candidate.taskStatus || candidate.interviewStatus || "assigned"
  const statusText = getStatusText(statusClass)

  // Create abilities display
  const abilitiesHtml = Object.entries(ABILITY_CATEGORIES)
    .map(([key, category]) => {
      const value = candidate.abilities[key] || 0
      return `
      <div class="ability-item">
        <i class="ability-icon ${category.icon}"></i>
        <div class="ability-name">${category.name}</div>
        <div class="ability-value">${value}</div>
      </div>
    `
    })
    .join("")

  card.innerHTML = `
    <div class="candidate-header">
      <div class="candidate-avatar">
        ${candidate.candidateName ? candidate.candidateName.charAt(0).toUpperCase() : "C"}
      </div>
      <div class="candidate-info">
        <h3>${candidate.candidateName || "Unknown Candidate"}</h3>
        <p>${candidate.candidateEmail || "No email provided"}</p>
      </div>
      <div class="candidate-status ${statusClass}">
        ${statusText}
      </div>
    </div>
    
    <div class="candidate-details">
      <div class="task-info">
        <h5>Assigned Role</h5>
        <p>${candidate.assignedRole || candidate.jobTitle || "Not specified"}</p>
        ${candidate.assignmentNotes ? `<p><strong>Notes:</strong> ${candidate.assignmentNotes}</p>` : ""}
      </div>
      
      <div class="abilities-display">
        ${abilitiesHtml}
      </div>
      
      <div class="candidate-meta">
        <p><i class="fas fa-calendar"></i> Assigned: ${formatDate(candidate.assignedAt)}</p>
        <p><i class="fas fa-user"></i> Assigned by: ${candidate.assignedBy || "Admin"}</p>
        <p><i class="fas fa-phone"></i> ${candidate.candidatePhone || "No phone provided"}</p>
        ${candidate.evaluatedAt ? `<p><i class="fas fa-clock"></i> Evaluated: ${formatDate(candidate.evaluatedAt)}</p>` : ""}
      </div>
    </div>
    
    <div class="candidate-actions">
      ${getActionButtons(candidate, statusClass)}
    </div>
  `

  return card
}

// Get action buttons based on status
function getActionButtons(candidate, statusClass) {
  const candidateId = candidate.id

  switch (statusClass) {
    case "assigned":
    case "pending_evaluation":
      return `
        <button class="btn success" onclick="openEvaluationModal('${candidateId}')">
          <i class="fas fa-check-circle"></i>
          Evaluate Task
        </button>
        <button class="btn secondary" onclick="openAbilitiesHistoryModal('${candidateId}')">
          <i class="fas fa-history"></i>
          Abilities History
        </button>
      `
    case "task_completed":
      return `
        <button class="btn primary" onclick="openEvaluationModal('${candidateId}')">
          <i class="fas fa-edit"></i>
          Re-evaluate
        </button>
        <button class="btn secondary" onclick="openAbilitiesHistoryModal('${candidateId}')">
          <i class="fas fa-history"></i>
          Abilities History
        </button>
      `
    case "task_failed":
      return `
        <button class="btn warning" onclick="openEvaluationModal('${candidateId}')">
          <i class="fas fa-redo"></i>
          Re-evaluate
        </button>
        <button class="btn secondary" onclick="openAbilitiesHistoryModal('${candidateId}')">
          <i class="fas fa-history"></i>
          Abilities History
        </button>
      `
    default:
      return `
        <button class="btn secondary" onclick="openAbilitiesHistoryModal('${candidateId}')">
          <i class="fas fa-history"></i>
          Abilities History
        </button>
      `
  }
}

// Get status text
function getStatusText(status) {
  switch (status) {
    case "assigned":
      return "Assigned"
    case "pending_evaluation":
      return "Pending Evaluation"
    case "task_completed":
      return "Task Completed"
    case "task_failed":
      return "Task Failed"
    default:
      return "Assigned"
  }
}

// Update statistics
function updateStats() {
  const assignedCount = assignedCandidates.filter(
    (c) => c.taskStatus === "assigned" || c.interviewStatus === "assigned",
  ).length

  const pendingCount = assignedCandidates.filter(
    (c) => c.taskStatus === "pending_evaluation" || c.interviewStatus === "pending_evaluation",
  ).length

  const completedCount = assignedCandidates.filter(
    (c) => c.taskStatus === "task_completed" || c.interviewStatus === "task_completed",
  ).length

  const failedCount = assignedCandidates.filter(
    (c) => c.taskStatus === "task_failed" || c.interviewStatus === "task_failed",
  ).length

  document.getElementById("assignedCount").textContent = assignedCount
  document.getElementById("pendingCount").textContent = pendingCount
  document.getElementById("completedCount").textContent = completedCount
  document.getElementById("failedCount").textContent = failedCount
}

// Filter candidates
function filterCandidates() {
  const searchTerm = document.getElementById("searchInput").value.toLowerCase()
  const statusFilter = document.getElementById("statusFilter").value

  filteredCandidates = assignedCandidates.filter((candidate) => {
    const matchesSearch =
      !searchTerm ||
      candidate.candidateName?.toLowerCase().includes(searchTerm) ||
      candidate.candidateEmail?.toLowerCase().includes(searchTerm) ||
      candidate.assignedRole?.toLowerCase().includes(searchTerm) ||
      candidate.jobTitle?.toLowerCase().includes(searchTerm)

    const candidateStatus = candidate.taskStatus || candidate.interviewStatus || "assigned"
    const matchesStatus = statusFilter === "all" || candidateStatus === statusFilter

    return matchesSearch && matchesStatus
  })

  displayCandidates()
}

// Sort candidates
function sortCandidates() {
  const sortBy = document.getElementById("sortBy").value

  filteredCandidates.sort((a, b) => {
    switch (sortBy) {
      case "candidateName":
        return (a.candidateName || "").localeCompare(b.candidateName || "")
      case "assignedRole":
        return (a.assignedRole || a.jobTitle || "").localeCompare(b.assignedRole || b.jobTitle || "")
      case "assignedAt":
      default:
        const dateA = a.assignedAt ? new Date(a.assignedAt) : new Date(0)
        const dateB = b.assignedAt ? new Date(b.assignedAt) : new Date(0)
        return dateB - dateA
    }
  })

  displayCandidates()
}

// Open evaluation modal
function openEvaluationModal(candidateId) {
  selectedCandidate = assignedCandidates.find((c) => c.id === candidateId)
  if (!selectedCandidate) return

  jobDetails = selectedCandidate.jobDetails

  // Populate candidate info
  document.getElementById("evaluationCandidateInfo").innerHTML = `
    <div class="candidate-info-header">
      <div class="candidate-info-avatar">
        ${selectedCandidate.candidateName.charAt(0).toUpperCase()}
      </div>
      <div class="candidate-info-details">
        <h4>${selectedCandidate.candidateName}</h4>
        <p>${selectedCandidate.candidateEmail} • ${selectedCandidate.assignedRole || selectedCandidate.jobTitle}</p>
      </div>
    </div>
  `

  // Populate task details
  document.getElementById("taskDetails").innerHTML = `
    <div class="task-detail-item">
      <h5>Assigned Role</h5>
      <p>${selectedCandidate.assignedRole || selectedCandidate.jobTitle || "Not specified"}</p>
    </div>
    <div class="task-detail-item">
      <h5>Assignment Date</h5>
      <p>${formatDate(selectedCandidate.assignedAt)}</p>
    </div>
    ${
      selectedCandidate.assignmentNotes
        ? `
      <div class="task-detail-item">
        <h5>Assignment Notes</h5>
        <p>${selectedCandidate.assignmentNotes}</p>
      </div>
    `
        : ""
    }
  `

  // Display current abilities
  displayCurrentAbilities()

  // Reset form
  selectedEvaluation = null
  document.getElementById("evaluationNotes").value = ""
  document.getElementById("evaluationDetails").style.display = "none"
  document.getElementById("abilitiesImpact").style.display = "none"
  document.getElementById("confirmEvaluationBtn").disabled = true

  // Clear previous selections
  document.querySelectorAll(".evaluation-option").forEach((option) => {
    option.classList.remove("selected")
  })

  // Show modal
  document.getElementById("evaluationModal").style.display = "flex"
}

// Display current abilities
function displayCurrentAbilities() {
  const abilitiesGrid = document.getElementById("currentAbilities")
  if (!abilitiesGrid || !selectedCandidate) return

  const abilitiesHtml = Object.entries(ABILITY_CATEGORIES)
    .map(([key, category]) => {
      const value = selectedCandidate.abilities[key] || 0
      return `
      <div class="ability-card">
        <i class="ability-icon ${category.icon}"></i>
        <div class="ability-name">${category.name}</div>
        <div class="ability-value">${value}</div>
      </div>
    `
    })
    .join("")

  abilitiesGrid.innerHTML = abilitiesHtml
}

// Close evaluation modal
function closeEvaluationModal() {
  document.getElementById("evaluationModal").style.display = "none"
  selectedCandidate = null
  selectedEvaluation = null
  jobDetails = null
}

// Select evaluation option
function selectEvaluation(evaluation) {
  selectedEvaluation = evaluation

  // Update UI
  document.querySelectorAll(".evaluation-option").forEach((option) => {
    option.classList.remove("selected")
  })

  const selectedOption = document.querySelector(`.${evaluation === "completed" ? "success" : "danger"}-option`)
  selectedOption.classList.add("selected")

  // Show evaluation details and abilities impact
  document.getElementById("evaluationDetails").style.display = "block"
  document.getElementById("abilitiesImpact").style.display = "block"
  document.getElementById("confirmEvaluationBtn").disabled = false

  // Update notes placeholder
  const notesTextarea = document.getElementById("evaluationNotes")
  if (evaluation === "completed") {
    notesTextarea.placeholder = "Add notes about successful task completion..."
  } else {
    notesTextarea.placeholder = "Add notes about why the task failed..."
  }

  // Display abilities impact preview
  displayAbilitiesImpact(evaluation)
}

// Display abilities impact preview
function displayAbilitiesImpact(evaluation) {
  const impactGrid = document.getElementById("abilitiesImpactGrid")
  if (!impactGrid || !selectedCandidate || !jobDetails) return

  const isCompleted = evaluation === "completed"
  const impactData = isCompleted ? jobDetails.rewards : jobDetails.penalties

  if (!impactData) {
    impactGrid.innerHTML = `
      <div class="ability-card">
        <p>No ability changes defined for this job</p>
      </div>
    `
    return
  }

  const impactHtml = Object.entries(ABILITY_CATEGORIES)
    .map(([key, category]) => {
      const currentValue = selectedCandidate.abilities[key] || 0
      const change = impactData[key] || 0
      const newValue = Math.max(0, Math.min(100, currentValue + (isCompleted ? change : -change)))
      const actualChange = newValue - currentValue

      return `
      <div class="ability-impact-card ${actualChange > 0 ? "positive" : actualChange < 0 ? "negative" : ""}">
        <i class="ability-icon ${category.icon}"></i>
        <div class="ability-name">${category.name}</div>
        <div class="ability-value">${currentValue} → ${newValue}</div>
        ${actualChange !== 0 ? `<div class="ability-change ${actualChange > 0 ? "positive" : "negative"}">${actualChange > 0 ? "+" : ""}${actualChange}</div>` : ""}
      </div>
    `
    })
    .join("")

  impactGrid.innerHTML = impactHtml
}

// Confirm evaluation
async function confirmEvaluation() {
  if (!selectedCandidate || !selectedEvaluation || !jobDetails) return

  try {
    const notes = document.getElementById("evaluationNotes").value
    const isCompleted = selectedEvaluation === "completed"
    const impactData = isCompleted ? jobDetails.rewards : jobDetails.penalties

    if (!impactData) {
      showNotification("No ability changes defined for this job", "warning")
      return
    }

    const { getDoc, doc, updateDoc, arrayUnion } = window.firestoreUtils

    // Calculate new abilities
    const newAbilities = { ...selectedCandidate.abilities }
    const abilityChanges = {}

    Object.keys(ABILITY_CATEGORIES).forEach((ability) => {
      const currentValue = selectedCandidate.abilities[ability] || 0
      const change = impactData[ability] || 0
      const newValue = Math.max(0, Math.min(100, currentValue + (isCompleted ? change : -change)))

      newAbilities[ability] = newValue
      abilityChanges[ability] = newValue - currentValue
    })

    // Create history entry
    const historyEntry = {
      date: new Date().toISOString(),
      type: isCompleted ? "reward" : "penalty",
      reason: isCompleted ? "Task completed successfully" : "Task failed",
      notes: notes || "",
      evaluatedBy: window.auth.currentUser?.uid || "admin",
      jobTitle: selectedCandidate.jobTitle || selectedCandidate.assignedRole,
      abilityChanges: abilityChanges,
    }

    // Update candidate record in applications collection
    const candidateRef = doc(window.db, "applications", selectedCandidate.id)
    await updateDoc(candidateRef, {
      interviewStatus: isCompleted ? "task_completed" : "task_failed",
      taskStatus: isCompleted ? "task_completed" : "task_failed",
      evaluationNotes: notes || "",
      evaluatedAt: new Date().toISOString(),
      evaluatedBy: window.auth.currentUser?.uid || "admin",
      abilitiesHistory: arrayUnion(historyEntry),
      updatedAt: new Date().toISOString(),
    })

    // Update abilities in users collection
    if (selectedCandidate.candidateId) {
      const userRef = doc(window.db, "users", selectedCandidate.candidateId)
      const userUpdateData = {
        ...newAbilities,
        updatedAt: new Date().toISOString(),
      }

      // Add abilities history to user record as well
      userUpdateData.abilitiesHistory = arrayUnion(historyEntry)

      await updateDoc(userRef, userUpdateData)
    }

    // Also update candidates collection if it exists
    try {
      const candidatesRef = doc(window.db, "candidates", selectedCandidate.candidateId || selectedCandidate.id)
      await updateDoc(candidatesRef, {
        ...newAbilities,
        abilitiesHistory: arrayUnion(historyEntry),
        updatedAt: new Date().toISOString(),
      })
    } catch (error) {
      // Candidates collection might not exist, that's okay
      console.log("Candidates collection not found, skipping update")
    }

    const actionText = isCompleted ? "completed" : "failed"
    showNotification(`Task marked as ${actionText} and abilities updated successfully!`, "success")

    closeEvaluationModal()
    await loadAssignedCandidates()
    if(isCompleted){
      const candidateSnap = await getDoc(candidateRef);
      const candidateData = candidateSnap.data() || {}
      sendNotification(candidateData.candidateEmail,candidateData.candidateName,'task-success');
    }
    else{
      const candidateSnap = await getDoc(candidateRef);
      const candidateData = candidateSnap.data() || {}
      sendNotification(candidateData.candidateEmail,candidateData.candidateName,'task-failure');
    }
  } catch (error) {
    console.error("Error confirming evaluation:", error)
    showNotification("Error saving evaluation", "error")
  }
}

// Open abilities history modal
function openAbilitiesHistoryModal(candidateId) {
  const candidate = assignedCandidates.find((c) => c.id === candidateId)
  if (!candidate) return

  // Populate candidate info
  document.getElementById("historyCandidateInfo").innerHTML = `
    <div class="candidate-info-header">
      <div class="candidate-info-avatar">
        ${candidate.candidateName.charAt(0).toUpperCase()}
      </div>
      <div class="candidate-info-details">
        <h4>${candidate.candidateName}</h4>
        <p>${candidate.candidateEmail} • ${candidate.assignedRole || candidate.jobTitle}</p>
      </div>
    </div>
  `

  // Display current abilities summary
  const currentAbilitiesHtml = Object.entries(ABILITY_CATEGORIES)
    .map(([key, category]) => {
      const value = candidate.abilities[key] || 0
      return `
      <div class="ability-card">
        <i class="ability-icon ${category.icon}"></i>
        <div class="ability-name">${category.name}</div>
        <div class="ability-value">${value}</div>
      </div>
    `
    })
    .join("")

  document.getElementById("currentAbilitiesSummary").innerHTML = currentAbilitiesHtml

  // Populate abilities history
  const historyList = document.getElementById("abilitiesHistoryList")
  const history = candidate.abilitiesHistory || []

  if (history.length === 0) {
    historyList.innerHTML = `
      <div class="loading-jobs">
        <div class="loading-spinner">
          <i class="fas fa-history"></i>
        </div>
        <p>No abilities history available.</p>
      </div>
    `
  } else {
    historyList.innerHTML = history
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .map((entry) => {
        const abilityChangesHtml = Object.entries(entry.abilityChanges || {})
          .filter(([_, change]) => change !== 0)
          .map(
            ([ability, change]) =>
              `<span class="history-ability ${change > 0 ? "positive" : "negative"}">
              ${ABILITY_CATEGORIES[ability]?.name || ability}: ${change > 0 ? "+" : ""}${change}
            </span>`,
          )
          .join("")

        return `
          <div class="history-item">
            <div class="history-icon ${entry.type}">
              <i class="fas fa-${entry.type === "reward" ? "plus" : "minus"}"></i>
            </div>
            <div class="history-content">
              <h5>${entry.reason}</h5>
              <p>${formatDate(entry.date)} • ${entry.jobTitle || "Unknown Job"}</p>
              <p>${entry.notes || "No additional notes"}</p>
              <div class="history-abilities">
                ${abilityChangesHtml}
              </div>
            </div>
          </div>
        `
      })
      .join("")
  }

  // Show modal
  document.getElementById("abilitiesHistoryModal").style.display = "flex"
}

// Close abilities history modal
function closeAbilitiesHistoryModal() {
  document.getElementById("abilitiesHistoryModal").style.display = "none"
}

// Open bulk actions modal
function openBulkActionsModal() {
  const selectedCandidates = getSelectedCandidates()
  if (selectedCandidates.length === 0) {
    showNotification("Please select candidates first", "warning")
    return
  }

  document.getElementById("bulkActionsModal").style.display = "flex"
}

// Close bulk actions modal
function closeBulkActionsModal() {
  document.getElementById("bulkActionsModal").style.display = "none"
}

// Get selected candidates (for bulk operations)
function getSelectedCandidates() {
  const checkboxes = document.querySelectorAll('.candidate-card input[type="checkbox"]:checked')
  return Array.from(checkboxes).map((cb) => cb.getAttribute("data-candidate-id"))
}

// Bulk mark as completed
async function bulkMarkCompleted() {
  const selectedIds = getSelectedCandidates()
  if (selectedIds.length === 0) {
    showNotification("No candidates selected", "warning")
    return
  }

  try {
    const {getDoc, doc, updateDoc, arrayUnion } = window.firestoreUtils

    for (const candidateId of selectedIds) {
      const candidate = assignedCandidates.find((c) => c.id === candidateId)
      if (!candidate || !candidate.jobDetails?.rewards) continue

      // Calculate new abilities
      const newAbilities = { ...candidate.abilities }
      const abilityChanges = {}

      Object.keys(ABILITY_CATEGORIES).forEach((ability) => {
        const currentValue = candidate.abilities[ability] || 0
        const change = candidate.jobDetails.rewards[ability] || 0
        const newValue = Math.max(0, Math.min(100, currentValue + change))

        newAbilities[ability] = newValue
        abilityChanges[ability] = newValue - currentValue
      })

      const historyEntry = {
        date: new Date().toISOString(),
        type: "reward",
        reason: "Bulk task completion",
        notes: "Marked as completed via bulk action",
        evaluatedBy: window.auth.currentUser?.uid || "admin",
        jobTitle: candidate.jobTitle || candidate.assignedRole,
        abilityChanges: abilityChanges,
      }

      // Update applications collection
      const candidateRef = doc(window.db, "applications", candidateId)
      await updateDoc(candidateRef, {
        interviewStatus: "task_completed",
        taskStatus: "task_completed",
        evaluatedAt: new Date().toISOString(),
        evaluatedBy: window.auth.currentUser?.uid || "admin",
        abilitiesHistory: arrayUnion(historyEntry),
        updatedAt: new Date().toISOString(),
      })

      // Update users collection
      if (candidate.candidateId) {
        const userRef = doc(window.db, "users", candidate.candidateId)
        await updateDoc(userRef, {
          ...newAbilities,
          abilitiesHistory: arrayUnion(historyEntry),
          updatedAt: new Date().toISOString(),
        })
      }
    }

    const candidateSnap = await getDoc(candidateRef);
    const candidateData = candidateSnap.data() || {}
    sendNotification(candidateData.candidateEmail,candidateData.candidateName,'task-success');
    showNotification(`${selectedIds.length} candidates marked as completed`, "success")
    closeBulkActionsModal()
    await loadAssignedCandidates()
  } catch (error) {
    console.error("Error in bulk completion:", error)
    showNotification("Error processing bulk action", "error")
  }
}

async function sendNotification(email, name, event) {
  try {
    const response = await fetch('http://localhost:5000/api/notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, name, event })
    });

    const data = await response.json();
    console.log('✅ Email Sent:', data.message);
  } catch (error) {
    console.error('❌ Failed to send email:', error);
  }
}


// Bulk mark as failed
async function bulkMarkFailed() {
  const selectedIds = getSelectedCandidates()
  if (selectedIds.length === 0) {
    showNotification("No candidates selected", "warning")
    return
  }

  try {
    const { getDoc, doc, updateDoc, arrayUnion } = window.firestoreUtils

    for (const candidateId of selectedIds) {
      const candidate = assignedCandidates.find((c) => c.id === candidateId)
      if (!candidate || !candidate.jobDetails?.penalties) continue

      // Calculate new abilities
      const newAbilities = { ...candidate.abilities }
      const abilityChanges = {}

      Object.keys(ABILITY_CATEGORIES).forEach((ability) => {
        const currentValue = candidate.abilities[ability] || 0
        const change = candidate.jobDetails.penalties[ability] || 0
        const newValue = Math.max(0, Math.min(100, currentValue - change))

        newAbilities[ability] = newValue
        abilityChanges[ability] = newValue - currentValue
      })

      const historyEntry = {
        date: new Date().toISOString(),
        type: "penalty",
        reason: "Bulk task failure",
        notes: "Marked as failed via bulk action",
        evaluatedBy: window.auth.currentUser?.uid || "admin",
        jobTitle: candidate.jobTitle || candidate.assignedRole,
        abilityChanges: abilityChanges,
      }

      // Update applications collection
      const candidateRef = doc(window.db, "applications", candidateId)
      await updateDoc(candidateRef, {
        interviewStatus: "task_failed",
        taskStatus: "task_failed",
        evaluatedAt: new Date().toISOString(),
        evaluatedBy: window.auth.currentUser?.uid || "admin",
        abilitiesHistory: arrayUnion(historyEntry),
        updatedAt: new Date().toISOString(),
      })

      // Update users collection
      if (candidate.candidateId) {
        const userRef = doc(window.db, "users", candidate.candidateId)
        await updateDoc(userRef, {
          ...newAbilities,
          abilitiesHistory: arrayUnion(historyEntry),
          updatedAt: new Date().toISOString(),
        })
      }
    }

    const candidateSnap = await getDoc(candidateRef);
    const candidateData = candidateSnap.data() || {}
    sendNotification(candidateData.candidateEmail,candidateData.candidateName,'task-failure');
    showNotification(`${selectedIds.length} candidates marked as failed`, "info")
    closeBulkActionsModal()
    await loadAssignedCandidates()
  } catch (error) {
    console.error("Error in bulk failure:", error)
    showNotification("Error processing bulk action", "error")
  }
}

// Bulk export data
function bulkExportData() {
  const selectedIds = getSelectedCandidates()
  if (selectedIds.length === 0) {
    showNotification("No candidates selected", "warning")
    return
  }

  const selectedCandidates = assignedCandidates.filter((c) => selectedIds.includes(c.id))

  // Create CSV content with abilities
  const headers = [
    "Name",
    "Email",
    "Phone",
    "Assigned Role",
    "Status",
    "Combat Points",
    "Defense Points",
    "Tech Points",
    "Intelligence Points",
    "Stealth Points",
    "Leadership Points",
    "Assigned Date",
    "Evaluated Date",
  ]

  const csvContent = [
    headers.join(","),
    ...selectedCandidates.map((candidate) =>
      [
        candidate.candidateName || "",
        candidate.candidateEmail || "",
        candidate.candidatePhone || "",
        candidate.assignedRole || candidate.jobTitle || "",
        getStatusText(candidate.taskStatus || candidate.interviewStatus || "assigned"),
        candidate.abilities.combatPoints || 0,
        candidate.abilities.defensePoints || 0,
        candidate.abilities.techPoints || 0,
        candidate.abilities.intelligencePoints || 0,
        candidate.abilities.stealthPoints || 0,
        candidate.abilities.leadershipPoints || 0,
        formatDate(candidate.assignedAt),
        candidate.evaluatedAt ? formatDate(candidate.evaluatedAt) : "",
      ]
        .map((field) => `"${field}"`)
        .join(","),
    ),
  ].join("\n")

  // Download CSV
  const blob = new Blob([csvContent], { type: "text/csv" })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `task_results_${new Date().toISOString().split("T")[0]}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(url)

  showNotification("Data exported successfully", "success")
  closeBulkActionsModal()
}

// Refresh results
async function refreshResults() {
  showNotification("Refreshing results...", "info")
  await loadAssignedCandidates()
  showNotification("Results refreshed successfully", "success")
}

// Utility functions
function formatDate(dateString) {
  if (!dateString) return "Unknown"

  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function showLoadingState() {
  document.getElementById("loadingState").style.display = "flex"
  document.getElementById("candidatesSection").style.display = "none"
  document.getElementById("emptyState").style.display = "none"
}

function hideLoadingState() {
  document.getElementById("loadingState").style.display = "none"
}

function showEmptyState() {
  document.getElementById("emptyState").style.display = "flex"
  document.getElementById("candidatesSection").style.display = "none"
}

function showCandidatesSection() {
  document.getElementById("candidatesSection").style.display = "block"
  document.getElementById("emptyState").style.display = "none"
}

function closeAllModals() {
  document.querySelectorAll(".modal-overlay").forEach((modal) => {
    modal.style.display = "none"
  })
}

// Notification system
function showNotification(message, type = "info") {
  const toast = document.getElementById("toast")
  const toastMessage = document.getElementById("toastMessage")

  if (!toast || !toastMessage) return

  // Remove existing classes
  toast.classList.remove("toast-success", "toast-error", "toast-warning", "toast-info")

  // Add appropriate class
  toast.classList.add(`toast-${type}`)

  // Update icon
  const icon = toast.querySelector("i")
  const iconClasses = {
    success: "fas fa-check-circle",
    error: "fas fa-exclamation-circle",
    warning: "fas fa-exclamation-triangle",
    info: "fas fa-info-circle",
  }
  icon.className = iconClasses[type] || iconClasses.info

  // Set message
  toastMessage.textContent = message

  // Show toast
  toast.classList.add("show")

  // Hide after 3 seconds
  setTimeout(() => {
    toast.classList.remove("show")
  }, 3000)
}

// Logout function
function logout() {
  if (confirm("Are you sure you want to logout?")) {
    // Clear any stored data
    localStorage.clear()
    localStorage.removeItem("userLoggedIn");
    sessionStorage.clear()

    // Redirect to login page
    window.location.href = "../../../Login/login.html"
  }
}

console.log("🎯 Results page with category-based abilities system initialized successfully!")
