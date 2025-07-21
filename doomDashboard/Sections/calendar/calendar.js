// Global variables
let currentView = "month"
const currentDate = new Date()
let interviews = []
let upcomingInterviews = []

// Function to show toast messages
function showToast(message, type) {
  const toastContainer = document.createElement("div")
  toastContainer.className = `toast ${type}`
  toastContainer.textContent = message
  document.body.appendChild(toastContainer)

  setTimeout(() => {
    document.body.removeChild(toastContainer)
  }, 3000)
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

// Initialize the page
document.addEventListener("DOMContentLoaded", async () => {
  try {
    await waitForFirebase()
    setCalendarView("month")
    await loadInterviews()
  } catch (error) {
    console.error("Error initializing calendar:", error)
    showToast("Error initializing calendar", "error")
  }
})

// Set calendar view
function setCalendarView(view) {
  currentView = view

  // Update button states
  document.querySelectorAll(".calendar-view-controls .btn").forEach((btn) => {
    btn.classList.remove("active")
  })
  document.getElementById(`${view}View`).classList.add("active")

  // Update period header
  updatePeriodHeader()

  // Render appropriate view
  renderCalendarView()
}

// Load interviews from Firebase
async function loadInterviews() {
  try {
    const { collection, query, where, orderBy, getDocs } = window.firestoreUtils
    const interviewsRef = collection(window.db, "interviews")
    const q = query(interviewsRef, where("status", "==", "scheduled"), orderBy("date"), orderBy("time"))
    const querySnapshot = await getDocs(q)

    interviews = []
    querySnapshot.forEach((doc) => {
      interviews.push({
        id: doc.id,
        ...doc.data(),
      })
    })

    renderCalendarView()
    loadUpcomingInterviews()
  } catch (error) {
    console.error("Error loading interviews:", error)
    showToast("Error loading interviews", "error")
  }
}

// Load upcoming interviews
function loadUpcomingInterviews() {
  const filterDays = Number.parseInt(document.getElementById("filterDays").value)
  const today = new Date()
  const futureDate = new Date()
  futureDate.setDate(today.getDate() + filterDays)

  upcomingInterviews = interviews.filter((interview) => {
    const interviewDate = new Date(interview.date)
    return interviewDate >= today && interviewDate <= futureDate
  })

  displayUpcomingInterviews()
}

// Display upcoming interviews
function displayUpcomingInterviews() {
  const container = document.getElementById("upcomingInterviewsList")
  container.innerHTML = ""

  if (upcomingInterviews.length === 0) {
    container.innerHTML = `
      <div class="loading-jobs">
        <div class="loading-spinner">
          <i class="fas fa-calendar"></i>
        </div>
        <p>No upcoming interviews in the selected period.</p>
      </div>
    `
    return
  }

  upcomingInterviews.forEach((interview) => {
    const interviewCard = createInterviewCard(interview)
    container.appendChild(interviewCard)
  })
}

// Create interview card
function createInterviewCard(interview) {
  const card = document.createElement("div")
  card.className = "interview-card"

  const interviewDate = new Date(interview.date)
  const formattedDate = interviewDate.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })

  card.innerHTML = `
    <div class="interview-header">
      <div class="interview-candidate">
        <div class="interview-avatar">
          ${interview.candidateName.charAt(0).toUpperCase()}
        </div>
        <div class="interview-candidate-info">
          <h4>${interview.candidateName}</h4>
          <p>${interview.jobTitle}</p>
        </div>
      </div>
      <div class="interview-time">
        <div class="date">${formattedDate}</div>
        <div class="time">${interview.time}</div>
      </div>
    </div>
    
    <div class="interview-details">
      <div class="interview-detail">
        <i class="fas fa-video"></i>
        <span>${getInterviewTypeText(interview.type)}</span>
      </div>
      <div class="interview-detail">
        <i class="fas fa-envelope"></i>
        <span>${interview.candidateEmail}</span>
      </div>
      ${
        interview.notes
          ? `
        <div class="interview-detail">
          <i class="fas fa-sticky-note"></i>
          <span>${interview.notes}</span>
        </div>
      `
          : ""
      }
    </div>
    
    <div class="interview-actions">
      <button class="btn secondary" onclick="openInterviewDetails('${interview.id}')">
        <i class="fas fa-eye"></i>
        View Details
      </button>
      <button class="btn primary" onclick="rescheduleInterview('${interview.id}')">
        <i class="fas fa-calendar-alt"></i>
        Reschedule
      </button>
      <button class="btn danger" onclick="cancelInterview('${interview.id}')">
        <i class="fas fa-times"></i>
        Cancel
      </button>
    </div>
  `

  return card
}

// Get interview type text
function getInterviewTypeText(type) {
  switch (type) {
    case "video":
      return "Video Call"
    case "phone":
      return "Phone Call"
    case "in-person":
      return "In-Person"
    default:
      return "Interview"
  }
}

// Update period header
function updatePeriodHeader() {
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]

  let headerText = ""

  switch (currentView) {
    case "month":
      headerText = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`
      break
    case "week":
      const weekStart = getWeekStart(currentDate)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      headerText = `${formatDateShort(weekStart)} - ${formatDateShort(weekEnd)}`
      break
    case "day":
      headerText = currentDate.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
      break
  }

  document.getElementById("currentPeriod").textContent = headerText
}

// Render calendar view
function renderCalendarView() {
  const calendarView = document.getElementById("calendarView")

  switch (currentView) {
    case "month":
      renderMonthView(calendarView)
      break
    case "week":
      renderWeekView(calendarView)
      break
    case "day":
      renderDayView(calendarView)
      break
  }
}

// Render month view
function renderMonthView(container) {
  container.innerHTML = ""
  container.className = "calendar-view month-view"

  // Add day headers
  const dayHeaders = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
  dayHeaders.forEach((day) => {
    const dayHeader = document.createElement("div")
    dayHeader.className = "month-day-header"
    dayHeader.textContent = day
    container.appendChild(dayHeader)
  })

  // Get first day of month and create calendar grid
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
  const startDate = new Date(firstDay)
  startDate.setDate(startDate.getDate() - firstDay.getDay())

  // Render 42 days (6 weeks)
  for (let i = 0; i < 42; i++) {
    const date = new Date(startDate)
    date.setDate(startDate.getDate() + i)

    const dayElement = document.createElement("div")
    dayElement.className = "month-day"

    if (date.getMonth() !== currentDate.getMonth()) {
      dayElement.classList.add("other-month")
    }

    if (isToday(date)) {
      dayElement.classList.add("today")
    }

    // Add day number
    const dayNumber = document.createElement("div")
    dayNumber.className = "month-day-number"
    dayNumber.textContent = date.getDate()
    dayElement.appendChild(dayNumber)

    // Add interviews for this day
    const dayInterviews = getInterviewsForDate(date)
    dayInterviews.forEach((interview) => {
      const interviewElement = document.createElement("div")
      interviewElement.className = "interview-item"
      interviewElement.textContent = `${interview.time} - ${interview.candidateName}`
      interviewElement.onclick = () => openInterviewDetails(interview.id)
      dayElement.appendChild(interviewElement)
    })

    container.appendChild(dayElement)
  }
}

// Render week view
function renderWeekView(container) {
  container.innerHTML = ""
  container.className = "calendar-view week-view"

  // Implementation for week view
  container.innerHTML = `
    <div class="week-view-placeholder">
      <div class="loading-jobs">
        <div class="loading-spinner">
          <i class="fas fa-calendar-week"></i>
        </div>
        <p>Week view coming soon...</p>
      </div>
    </div>
  `
}

// Render day view
function renderDayView(container) {
  container.innerHTML = ""
  container.className = "calendar-view day-view"

  // Implementation for day view
  container.innerHTML = `
    <div class="day-view-placeholder">
      <div class="loading-jobs">
        <div class="loading-spinner">
          <i class="fas fa-calendar-day"></i>
        </div>
        <p>Day view coming soon...</p>
      </div>
    </div>
  `
}

// Get interviews for a specific date
function getInterviewsForDate(date) {
  const dateString = formatDateForStorage(date)
  return interviews.filter((interview) => interview.date === dateString)
}

// Navigation functions
function previousPeriod() {
  switch (currentView) {
    case "month":
      currentDate.setMonth(currentDate.getMonth() - 1)
      break
    case "week":
      currentDate.setDate(currentDate.getDate() - 7)
      break
    case "day":
      currentDate.setDate(currentDate.getDate() - 1)
      break
  }

  updatePeriodHeader()
  renderCalendarView()
}

function nextPeriod() {
  switch (currentView) {
    case "month":
      currentDate.setMonth(currentDate.getMonth() + 1)
      break
    case "week":
      currentDate.setDate(currentDate.getDate() + 7)
      break
    case "day":
      currentDate.setDate(currentDate.getDate() + 1)
      break
  }

  updatePeriodHeader()
  renderCalendarView()
}

// Filter upcoming interviews
function filterUpcomingInterviews() {
  loadUpcomingInterviews()
}

// Open interview details modal
function openInterviewDetails(interviewId) {
  const interview = interviews.find((i) => i.id === interviewId)
  if (!interview) return

  const modal = document.getElementById("interviewDetailsModal")
  const content = document.getElementById("interviewDetailsContent")

  const interviewDate = new Date(interview.date)
  const formattedDate = interviewDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  content.innerHTML = `
    <div class="candidate-info-card">
      <div class="candidate-info-header">
        <div class="candidate-info-avatar">
          ${interview.candidateName.charAt(0).toUpperCase()}
        </div>
        <div class="candidate-info-details">
          <h4>${interview.candidateName}</h4>
          <p>${interview.candidateEmail}</p>
        </div>
      </div>
      
      <div class="interview-details-grid">
        <div class="form-group">
          <label>Position</label>
          <p>${interview.jobTitle}</p>
        </div>
        
        <div class="form-group">
          <label>Date & Time</label>
          <p>${formattedDate} at ${interview.time}</p>
        </div>
        
        <div class="form-group">
          <label>Interview Type</label>
          <p>${getInterviewTypeText(interview.type)}</p>
        </div>
        
        <div class="form-group">
          <label>Status</label>
          <p class="candidate-status ${interview.status}">${interview.status.toUpperCase()}</p>
        </div>
        
        ${
          interview.notes
            ? `
          <div class="form-group">
            <label>Notes</label>
            <p>${interview.notes}</p>
          </div>
        `
            : ""
        }
      </div>
    </div>
  `

  // Store current interview ID for actions
  modal.dataset.interviewId = interviewId
  modal.classList.add("active")
}

// Close interview details modal
function closeInterviewDetailsModal() {
  document.getElementById("interviewDetailsModal").classList.remove("active")
}

// Cancel interview
async function cancelInterview(interviewId) {
  if (!interviewId) {
    interviewId = document.getElementById("interviewDetailsModal").dataset.interviewId
  }

  if (!confirm("Are you sure you want to cancel this interview?")) {
    return
  }

  try {
    const { doc, updateDoc, collection, query, where, getDocs } = window.firestoreUtils
    const interview = interviews.find((i) => i.id === interviewId)
    if (!interview) return

    // Update interview status
    const interviewRef = doc(window.db, "interviews", interviewId)
    await updateDoc(interviewRef, {
      status: "cancelled",
      cancelledAt: new Date().toISOString(),
      cancelledBy: window.auth.currentUser.uid,
    })

    // Update candidate status back to accepted
    const applicationsRef = collection(window.db, "applications")
    const q = query(
      applicationsRef,
      where("interviewDate", "==", interview.date),
      where("interviewTime", "==", interview.time),
    )
    const querySnapshot = await getDocs(q)

    const updatePromises = []
    querySnapshot.forEach((docSnapshot) => {
      const candidateRef = doc(window.db, "applications", docSnapshot.id)
      updatePromises.push(
        updateDoc(candidateRef, {
          interviewStatus: "accepted",
          interviewDate: null,
          interviewTime: null,
          interviewType: null,
          interviewNotes: null,
          updatedAt: new Date().toISOString(),
        }),
      )
    })

    await Promise.all(updatePromises)

    showToast("Interview cancelled successfully", "success")
    closeInterviewDetailsModal()
    await loadInterviews()
  } catch (error) {
    console.error("Error cancelling interview:", error)
    showToast("Error cancelling interview", "error")
  }
}

// Reschedule interview
function rescheduleInterview(interviewId) {
  if (!interviewId) {
    interviewId = document.getElementById("interviewDetailsModal").dataset.interviewId
  }

  // This would redirect to the scheduling page with the interview data
  window.location.href = `accepted-candidates.html?reschedule=${interviewId}`
}

// Utility functions
function isToday(date) {
  const today = new Date()
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  )
}

function formatDateForStorage(date) {
  return date.toISOString().split("T")[0]
}

function formatDateShort(date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

function getWeekStart(date) {
  const start = new Date(date)
  start.setDate(date.getDate() - date.getDay())
  return start
}

// Make functions globally accessible
window.setCalendarView = setCalendarView
window.previousPeriod = previousPeriod
window.nextPeriod = nextPeriod
window.filterUpcomingInterviews = filterUpcomingInterviews
window.openInterviewDetails = openInterviewDetails
window.closeInterviewDetailsModal = closeInterviewDetailsModal
window.cancelInterview = cancelInterview
window.rescheduleInterview = rescheduleInterview
