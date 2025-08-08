// Global variables
let acceptedCandidates = []
let filteredCandidates = []
let selectedCandidate = null
const currentDate = new Date()
let selectedDate = null
let selectedTimeSlot = null
let bookedSlots = []
let currentCall = null
let localStream = null
let peerConnection = null
let signalingUnsubscribe = null

// Global variable for selected decision
let selectedDecision = null

// Add a flag to track if a decision was made during the interview
let interviewDecisionMade = false

// WebRTC configuration
const rtcConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }],
}

// Function to show toast messages
function showToast(message, type = "success") {
  const toast = document.getElementById("toast")
  const toastMessage = document.getElementById("toastMessage")

  if (!toast || !toastMessage) return

  // Remove existing classes
  toast.classList.remove("toast-success", "toast-error", "toast-warning")

  // Add appropriate class
  toast.classList.add(`toast-${type}`)

  // Set message
  toastMessage.textContent = message

  // Show toast
  toast.classList.add("show")

  // Hide after 3 seconds
  setTimeout(() => {
    toast.classList.remove("show")
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

// Immediately expose functions to global scope
window.openScheduleModal = openScheduleModal
window.openAssignModal = openAssignModal
window.closeScheduleModal = closeScheduleModal
window.closeAssignModal = closeAssignModal
window.scheduleInterview = scheduleInterview
window.assignCandidate = assignCandidate
window.filterCandidates = filterCandidates
window.previousMonth = previousMonth
window.nextMonth = nextMonth
window.viewInterviewDetails = viewInterviewDetails
window.rescheduleInterview = rescheduleInterview
window.viewCandidateDetails = viewCandidateDetails
window.startVideoCall = startVideoCall
window.toggleMute = toggleMute
window.toggleVideo = toggleVideo
window.endCall = endCall
// Remove these old function references
// window.assignCandidateAfterInterview = assignCandidateAfterInterview
// window.rejectCandidateAfterInterview = rejectCandidateAfterInterview
// window.skipDecisionAndEndCall = skipDecisionAndEndCall

// Initialize the page
document.addEventListener("DOMContentLoaded", async () => {
  try {
    await waitForFirebase()
    await loadAcceptedCandidates()
    await loadBookedSlots()

    // Start checking for upcoming interviews every minute
    setInterval(checkUpcomingInterviews, 60000)
    checkUpcomingInterviews() // Initial check
  } catch (error) {
    console.error("Error initializing page:", error)
    window.showToast("Error initializing application", "error")
  }
})

// Load accepted candidates from Firebase
async function loadAcceptedCandidates() {
  try {
    const { collection, query, where, getDocs } = window.firestoreUtils
    const applicationsRef = collection(window.db, "applications")
    const q = query(applicationsRef, where("status", "==", "accepted"))
    const querySnapshot = await getDocs(q)

    acceptedCandidates = []
    querySnapshot.forEach((doc) => {
      acceptedCandidates.push({
        id: doc.id,
        ...doc.data(),
      })
    })

    filteredCandidates = [...acceptedCandidates]
    displayCandidates()
    updateStats()

    document.getElementById("loadingState").style.display = "none"

    if (acceptedCandidates.length === 0) {
      document.getElementById("emptyState").style.display = "flex"
    } else {
      document.getElementById("candidatesList").style.display = "grid"
    }
  } catch (error) {
    console.error("Error loading candidates:", error)
    window.showToast("Error loading candidates", "error")
    document.getElementById("loadingState").style.display = "none"
    document.getElementById("emptyState").style.display = "flex"
  }
}

// Load booked time slots
async function loadBookedSlots() {
  try {
    const { collection, getDocs } = window.firestoreUtils
    const interviewsRef = collection(window.db, "interviews")
    const querySnapshot = await getDocs(interviewsRef)

    bookedSlots = []
    querySnapshot.forEach((doc) => {
      const data = doc.data()

      // Exclude current reschedule slot
      if (
        window.currentReschedule &&
        data.date === window.currentReschedule.currentDate &&
        data.time === window.currentReschedule.currentTime &&
        data.candidateId === window.currentReschedule.candidateId
      ) {
        return // Skip this slot as it's being rescheduled
      }

      bookedSlots.push({
        date: data.date,
        time: data.time,
        candidateId: data.candidateId,
      })
    })
  } catch (error) {
    console.error("Error loading booked slots:", error)
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

  const statusClass = candidate.interviewStatus || "accepted"
  const statusText = getStatusText(statusClass)

  // Check if interview is starting soon
  const showJoinButton = shouldShowJoinButton(candidate)

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
      <h4>Applied Position</h4>
      <p>${candidate.jobTitle || "Not specified"}</p>
      
      ${
        candidate.interviewDate && candidate.interviewTime
          ? `
        <h4>Interview Scheduled</h4>
        <p><i class="fas fa-calendar"></i> ${formatDate(candidate.interviewDate)} at ${candidate.interviewTime}</p>
      `
          : ""
      }
      
      ${
        candidate.skills
          ? `
        <h4>Skills</h4>
        <div class="candidate-skills">
          ${candidate.skills
            .split(",")
            .map((skill) => `<span class="skill-tag">${skill.trim()}</span>`)
            .join("")}
        </div>
      `
          : ""
      }
      
      <div class="candidate-meta">
        <p><i class="fas fa-calendar"></i> Applied: ${formatDate(candidate.appliedDate)}</p>
        <p><i class="fas fa-phone"></i> ${candidate.candidatePhone || "No phone provided"}</p>
      </div>
    </div>
    
    <div class="candidate-actions">
      ${
        showJoinButton
          ? `
        <button class="btn success join-interview-btn" onclick="startVideoCall('${candidate.id}')">
          <i class="fas fa-video"></i>
          Join Interview
        </button>
      `
          : ""
      }
      
      ${
        statusClass === "accepted"
          ? `
        <button class="btn primary" onclick="openScheduleModal('${candidate.id}')">
          <i class="fas fa-calendar-plus"></i>
          Schedule Interview
        </button>
        <button class="btn success" onclick="openAssignModal('${candidate.id}')">
          <i class="fas fa-user-plus"></i>
          Assign Without Meeting
        </button>
      `
          : statusClass === "interview_scheduled"
            ? `
        <button class="btn secondary" onclick="viewInterviewDetails('${candidate.id}')">
          <i class="fas fa-eye"></i>
          View Interview
        </button>
        <button class="btn primary" onclick="rescheduleInterview('${candidate.id}')">
          <i class="fas fa-calendar-alt"></i>
          Reschedule
        </button>
      `
            : statusClass === "completed"
              ? `
        <button class="btn secondary" onclick="viewCandidateDetails('${candidate.id}')">
          <i class="fas fa-eye"></i>
          View Details
        </button>
      `
              : `
        <button class="btn secondary" onclick="viewCandidateDetails('${candidate.id}')">
          <i class="fas fa-eye"></i>
          View Details
        </button>
      `
      }
    </div>
  `

  return card
}

// Check if join button should be shown
function shouldShowJoinButton(candidate) {
  if (candidate.interviewStatus !== "interview_scheduled" || !candidate.interviewDate || !candidate.interviewTime) {
    return false
  }

  const now = new Date()
  const interviewDateTime = new Date(`${candidate.interviewDate}T${candidate.interviewTime}:00`)
  const fifteenMinutesBefore = new Date(interviewDateTime.getTime() - 15 * 60000)

  return now >= fifteenMinutesBefore && now <= interviewDateTime
}

// Get status text
function getStatusText(status) {
  switch (status) {
    case "accepted":
      return "Accepted"
    case "interview_scheduled":
      return "Interview Scheduled"
    case "assigned":
      return "Assigned"
    case "completed":
      return "Interview Completed"
    case "rejected":
      return "Rejected"
    default:
      return "Accepted"
  }
}

// Format date - FIXED: Proper date formatting to avoid timezone issues
function formatDate(dateString) {
  if (!dateString) return "Unknown"

  // Handle both ISO string and date-only formats
  let date
  if (dateString.includes("T")) {
    date = new Date(dateString)
  } else {
    // For date-only strings, create date in local timezone
    const parts = dateString.split("-")
    date = new Date(parts[0], parts[1] - 1, parts[2])
  }

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

// Update statistics
function updateStats() {
  const acceptedCount = acceptedCandidates.filter((c) => !c.interviewStatus || c.interviewStatus === "accepted").length
  const scheduledCount = acceptedCandidates.filter((c) => c.interviewStatus === "interview_scheduled").length
  const assignedCount = acceptedCandidates.filter((c) => c.interviewStatus === "assigned").length

  document.getElementById("acceptedCount").textContent = acceptedCount
  document.getElementById("scheduledCount").textContent = scheduledCount
  document.getElementById("assignedCount").textContent = assignedCount
}

// Filter candidates
function filterCandidates() {
  const searchTerm = document.getElementById("searchInput").value.toLowerCase()
  const statusFilter = document.getElementById("filterStatus").value

  filteredCandidates = acceptedCandidates.filter((candidate) => {
    const matchesSearch =
      !searchTerm ||
      candidate.candidateName?.toLowerCase().includes(searchTerm) ||
      candidate.candidateEmail?.toLowerCase().includes(searchTerm) ||
      candidate.jobTitle?.toLowerCase().includes(searchTerm)

    const matchesStatus = statusFilter === "all" || (candidate.interviewStatus || "accepted") === statusFilter

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

// Open schedule modal
function openScheduleModal(candidateId) {
  selectedCandidate = acceptedCandidates.find((c) => c.id === candidateId)
  if (!selectedCandidate) return

  // Populate candidate info
  document.getElementById("selectedCandidateInfo").innerHTML = `
    <div class="candidate-info-header">
      <div class="candidate-info-avatar">
        ${selectedCandidate.candidateName.charAt(0).toUpperCase()}
      </div>
      <div class="candidate-info-details">
        <h4>${selectedCandidate.candidateName}</h4>
        <p>${selectedCandidate.candidateEmail} • ${selectedCandidate.jobTitle}</p>
      </div>
    </div>
  `

  // Reset form
  selectedDate = null
  selectedTimeSlot = null
  document.getElementById("interviewType").value = "video"
  document.getElementById("interviewNotes").value = ""
  document.getElementById("timeSlotsSection").style.display = "none"
  document.getElementById("interviewDetailsSection").style.display = "none"
  document.getElementById("scheduleBtn").disabled = true

  // Initialize calendar
  initializeCalendar()

  // Show modal
  document.getElementById("scheduleModal").style.display = "flex"
}

// Close schedule modal
function closeScheduleModal() {
  document.getElementById("scheduleModal").style.display = "none"
  selectedCandidate = null
  selectedDate = null
  selectedTimeSlot = null
}

// Initialize calendar
function initializeCalendar() {
  updateCalendarHeader()
  renderCalendar()
}

// Update calendar header
function updateCalendarHeader() {
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

  document.getElementById("currentMonth").textContent =
    `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`
}

// Render calendar
function renderCalendar() {
  const calendar = document.getElementById("calendar")
  calendar.innerHTML = ""

  // Add day headers
  const dayHeaders = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  dayHeaders.forEach((day) => {
    const dayHeader = document.createElement("div")
    dayHeader.className = "calendar-day-header"
    dayHeader.textContent = day
    calendar.appendChild(dayHeader)
  })

  // Get first day of month and number of days
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
  const startDate = new Date(firstDay)
  startDate.setDate(startDate.getDate() - firstDay.getDay())

  // Render 42 days (6 weeks)
  for (let i = 0; i < 42; i++) {
    const date = new Date(startDate)
    date.setDate(startDate.getDate() + i)

    const dayElement = document.createElement("div")
    dayElement.className = "calendar-day"
    dayElement.textContent = date.getDate()

    // Add classes
    if (date.getMonth() !== currentDate.getMonth()) {
      dayElement.classList.add("other-month")
    }

    if (isToday(date)) {
      dayElement.classList.add("today")
    }

    if (selectedDate && isSameDate(date, selectedDate)) {
      dayElement.classList.add("selected")
    }

    // Check if date has interviews
    const dateString = formatDateForStorage(date)
    if (bookedSlots.some((slot) => slot.date === dateString)) {
      dayElement.classList.add("has-interviews")
    }

    // Add click handler (only for current month and future dates)
    if (date.getMonth() === currentDate.getMonth() && date >= new Date().setHours(0, 0, 0, 0)) {
      dayElement.addEventListener("click", () => selectDate(date))
    } else {
      dayElement.style.cursor = "not-allowed"
      dayElement.style.opacity = "0.5"
    }

    calendar.appendChild(dayElement)
  }
}

// Select date
function selectDate(date) {
  selectedDate = new Date(date)
  selectedTimeSlot = null

  renderCalendar()
  generateTimeSlots()

  document.getElementById("timeSlotsSection").style.display = "block"
  document.getElementById("interviewDetailsSection").style.display = "none"
  document.getElementById("scheduleBtn").disabled = true
}

// Generate time slots
function generateTimeSlots() {
  const timeSlotsContainer = document.getElementById("timeSlots")
  timeSlotsContainer.innerHTML = ""

  const timeSlots = [
    "09:00",
    "09:30",
    "10:00",
    "10:30",
    "11:00",
    "11:30",
    "12:00",
    "12:30",
    "13:00",
    "13:30",
    "14:00",
    "14:30",
    "15:00",
    "15:30",
    "16:00",
    "16:30",
    "17:00",
    "17:30",
  ]

  const selectedDateString = formatDateForStorage(selectedDate)

  timeSlots.forEach((time) => {
    const timeSlot = document.createElement("div")
    timeSlot.className = "time-slot"
    timeSlot.textContent = time

    // Check if slot is booked
    const isBooked = bookedSlots.some((slot) => slot.date === selectedDateString && slot.time === time)

    if (isBooked) {
      timeSlot.classList.add("booked")
      timeSlot.title = "This time slot is already booked"
    } else {
      timeSlot.addEventListener("click", () => selectTimeSlot(time, timeSlot))
    }

    timeSlotsContainer.appendChild(timeSlot)
  })
}

// Select time slot
function selectTimeSlot(time, element) {
  // Remove previous selection
  document.querySelectorAll(".time-slot.selected").forEach((slot) => {
    slot.classList.remove("selected")
  })

  // Select current slot
  element.classList.add("selected")
  selectedTimeSlot = time

  // Show interview details section
  document.getElementById("interviewDetailsSection").style.display = "block"
  document.getElementById("scheduleBtn").disabled = false
}

// Previous month
function previousMonth() {
  currentDate.setMonth(currentDate.getMonth() - 1)
  updateCalendarHeader()
  renderCalendar()
}

// Next month
function nextMonth() {
  currentDate.setMonth(currentDate.getMonth() + 1)
  updateCalendarHeader()
  renderCalendar()
}

// Schedule interview - FIXED: Proper date handling
async function scheduleInterview() {
  if (!selectedCandidate || !selectedDate || !selectedTimeSlot) {
    window.showToast("Please select a date and time", "error")
    return
  }

  const interviewType = document.getElementById("interviewType").value
  const notes = document.getElementById("interviewNotes").value

  try {
    const { collection, addDoc, doc, getDoc, updateDoc, query, where, getDocs, deleteDoc } = window.firestoreUtils

    // If this is a reschedule, delete the old interview
    if (window.currentReschedule) {
      const interviewsRef = collection(window.db, "interviews")
      const q = query(
        interviewsRef,
        where("candidateId", "==", window.currentReschedule.candidateId),
        where("date", "==", window.currentReschedule.currentDate),
        where("time", "==", window.currentReschedule.currentTime),
      )
      const querySnapshot = await getDocs(q)

      querySnapshot.forEach(async (docSnapshot) => {
        await deleteDoc(doc(window.db, "interviews", docSnapshot.id))
      })
    }

    // Add new interview
    const interviewsRef = collection(window.db, "interviews")
    const newInterviewRef = await addDoc(interviewsRef, {
      candidateId: selectedCandidate.id,
      candidateName: selectedCandidate.candidateName,
      candidateEmail: selectedCandidate.candidateEmail,
      jobTitle: selectedCandidate.jobTitle,
      date: formatDateForStorage(selectedDate),
      time: selectedTimeSlot,
      type: interviewType,
      notes: notes,
      status: "scheduled",
      createdAt: new Date().toISOString(),
      createdBy: window.auth.currentUser?.uid || "admin",
      adminJoined: false,
      candidateJoined: false,
    })

    // Update candidate status
    const candidateRef = doc(window.db, "applications", selectedCandidate.id)
    await updateDoc(candidateRef, {
      interviewStatus: "interview_scheduled",
      interviewDate: formatDateForStorage(selectedDate),
      interviewTime: selectedTimeSlot,
      interviewType: interviewType,
      interviewNotes: notes,
      interviewId: newInterviewRef.id,
      updatedAt: new Date().toISOString(),
    })

    const action = window.currentReschedule ? "rescheduled" : "scheduled"
    window.showToast(`Interview ${action} successfully!`, "success")

    // Clear reschedule data
    window.currentReschedule = null

    closeScheduleModal()
    await loadAcceptedCandidates()
    await loadBookedSlots()
    const candidateSnap = await getDoc(candidateRef);
    const candidateData = candidateSnap.data() || {}
    if(action=="rescheduled"){
      sendNotification(candidateData.candidateEmail,candidateData.candidateName,'interview-reschedule');
    }
    else{
      sendNotification(candidateData.candidateEmail,candidateData.candidateName,'interview');
    }
  } catch (error) {
    console.error("Error scheduling interview:", error)
    window.showToast("Error scheduling interview", "error")
  }
}

// Open assign modal
function openAssignModal(candidateId) {
  selectedCandidate = acceptedCandidates.find((c) => c.id === candidateId)
  if (!selectedCandidate) return

  // Populate candidate info
  document.getElementById("assignCandidateInfo").innerHTML = `
    <div class="candidate-info-header">
      <div class="candidate-info-avatar">
        ${selectedCandidate.candidateName.charAt(0).toUpperCase()}
      </div>
      <div class="candidate-info-details">
        <h4>${selectedCandidate.candidateName}</h4>
        <p>${selectedCandidate.candidateEmail} • ${selectedCandidate.jobTitle}</p>
      </div>
    </div>
  `

  // Reset form
  document.getElementById("assignmentRole").value = selectedCandidate.jobTitle || ""
  document.getElementById("assignmentNotes").value = ""

  // Show modal
  document.getElementById("assignModal").style.display = "flex"
}

// Close assign modal
function closeAssignModal() {
  document.getElementById("assignModal").style.display = "none"
  selectedCandidate = null
}

// Assign candidate
async function assignCandidate() {
  if (!selectedCandidate) return

  const assignmentRole = document.getElementById("assignmentRole").value
  const assignmentNotes = document.getElementById("assignmentNotes").value

  if (!assignmentRole.trim()) {
    window.showToast("Please enter the assigned role", "error")
    return
  }

  try {
    const { getDoc, doc, updateDoc } = window.firestoreUtils

    // Update candidate status
    const candidateRef = doc(window.db, "applications", selectedCandidate.id)
    await updateDoc(candidateRef, {
      interviewStatus: "assigned",
      assignedRole: assignmentRole,
      assignmentNotes: assignmentNotes,
      assignedAt: new Date().toISOString(),
      assignedBy: window.auth.currentUser?.uid || "admin",
      updatedAt: new Date().toISOString(),
    })
    const candidateSnap = await getDoc(candidateRef);
    const candidateData = candidateSnap.data() || {}
    sendNotification(candidateData.candidateEmail,candidateData.candidateName,'task-assigned');
    window.showToast("Candidate assigned successfully!", "success")
    closeAssignModal()
    await loadAcceptedCandidates()
  } catch (error) {
    console.error("Error assigning candidate:", error)
    window.showToast("Error assigning candidate", "error")
  }
}

// Start video call - FIXED: Improved WebRTC implementation
async function startVideoCall(candidateId) {
  try {
    const candidate = acceptedCandidates.find((c) => c.id === candidateId)
    if (!candidate) {
      window.showToast("Candidate not found", "error")
      return
    }

    // Create or join meeting room
    const meetingId = `interview_${candidate.id}_${Date.now()}`

    // Update interview status to indicate admin joined
    if (candidate.interviewId) {
      const { doc, updateDoc } = window.firestoreUtils
      const interviewRef = doc(window.db, "interviews", candidate.interviewId)
      await updateDoc(interviewRef, {
        meetingId: meetingId,
        adminJoined: true,
        adminJoinedAt: new Date().toISOString(),
        status: "in_progress",
      })
    }

    // Open video call modal for admin
    await openVideoCallModal(meetingId, candidate, "admin")

    window.showToast("Video call started. Candidate will be notified.", "success")
  } catch (error) {
    console.error("Error starting video call:", error)
    window.showToast("Error starting video call", "error")
  }
}

// Open video call modal - FIXED: Better modal handling
async function openVideoCallModal(meetingId, candidate, userType) {
  const modal = document.getElementById("videoCallModal")
  const title = document.getElementById("callTitle")
  const subtitle = document.getElementById("callSubtitle")

  title.textContent = `Interview: ${candidate.jobTitle || "Position Interview"}`
  subtitle.textContent = userType === "admin" ? "Waiting for candidate to join..." : "Connecting to interviewer..."

  modal.style.display = "flex"

  try {
    await initializeWebRTC(meetingId, candidate, userType)
  } catch (error) {
    console.error("Error initializing WebRTC:", error)
    window.showToast("Error starting video call", "error")
    modal.style.display = "none"
  }
}

// Initialize WebRTC - FIXED: Improved implementation
async function initializeWebRTC(meetingId, candidate, userType) {
  try {
    console.log("Initializing WebRTC for meeting:", meetingId)

    // Get user media
    localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    })

    const localVideo = document.getElementById("localVideo")
    localVideo.srcObject = localStream

    // Create peer connection
    peerConnection = new RTCPeerConnection(rtcConfiguration)

    // Add local stream to peer connection
    localStream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, localStream)
    })

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      console.log("Received remote stream")
      const remoteVideo = document.getElementById("remoteVideo")
      remoteVideo.srcObject = event.streams[0]

      const remoteParticipant = document.getElementById("remoteParticipant")
      remoteParticipant.innerHTML = `<span>${userType === "admin" ? "Candidate" : "Interviewer"}</span>`

      document.getElementById("callSubtitle").textContent = "Connected"
      window.showToast("Connected successfully!", "success")
    }

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      console.log("Connection state:", peerConnection.connectionState)

      const subtitle = document.getElementById("callSubtitle")
      switch (peerConnection.connectionState) {
        case "connecting":
          subtitle.textContent = "Connecting..."
          break
        case "connected":
          subtitle.textContent = "Connected"
          break
        case "disconnected":
          subtitle.textContent = "Disconnected"
          break
        case "failed":
          subtitle.textContent = "Connection failed"
          window.showToast("Connection lost. Trying to reconnect...", "warning")
          break
      }
    }

    // Handle ICE candidates - FIXED: Convert to plain object for Firestore
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        const candidateData = {
          candidate: event.candidate.candidate,
          sdpMLineIndex: event.candidate.sdpMLineIndex,
          sdpMid: event.candidate.sdpMid,
        }

        sendSignalingMessage(meetingId, {
          type: "ice-candidate",
          candidate: candidateData,
          from: userType,
        })
      }
    }

    // Listen for signaling messages
    listenForSignalingMessages(meetingId, userType)

    // If admin, create offer after a short delay
    if (userType === "admin") {
      setTimeout(async () => {
        try {
          const offer = await peerConnection.createOffer()
          await peerConnection.setLocalDescription(offer)

          sendSignalingMessage(meetingId, {
            type: "offer",
            offer: offer,
            from: userType,
          })
        } catch (error) {
          console.error("Error creating offer:", error)
        }
      }, 1000)
    }

    currentCall = {
      meetingId,
      candidate,
      userType,
      startTime: new Date(),
    }

    console.log("WebRTC initialization completed for", userType)
  } catch (error) {
    console.error("Error in initializeWebRTC:", error)

    if (error.name === "NotAllowedError") {
      window.showToast("Please allow camera and microphone access", "error")
    } else {
      window.showToast("Error accessing camera/microphone", "error")
    }

    throw error
  }
}

// Send signaling message - FIXED: Better error handling
async function sendSignalingMessage(meetingId, message) {
  try {
    const { collection, addDoc } = window.firestoreUtils
    const signalingRef = collection(window.db, "signaling", meetingId, "messages")

    await addDoc(signalingRef, {
      ...message,
      timestamp: new Date().toISOString(),
    })

    console.log("Sent signaling message:", message.type)
  } catch (error) {
    console.error("Error sending signaling message:", error)
  }
}

// Listen for signaling messages - FIXED: Better message handling
function listenForSignalingMessages(meetingId, userType) {
  const { collection, onSnapshot, orderBy, query } = window.firestoreUtils
  const signalingRef = collection(window.db, "signaling", meetingId, "messages")
  const q = query(signalingRef, orderBy("timestamp"))

  signalingUnsubscribe = onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach(async (change) => {
      if (change.type === "added") {
        const message = change.doc.data()

        // Ignore messages from self
        if (message.from === userType) return

        console.log("Received signaling message:", message.type, "from", message.from)

        try {
          switch (message.type) {
            case "offer":
              await handleOffer(message.offer)
              break
            case "answer":
              await handleAnswer(message.answer)
              break
            case "ice-candidate":
              await handleIceCandidate(message.candidate)
              break
          }
        } catch (error) {
          console.error("Error handling signaling message:", error)
        }
      }
    })
  })
}

// Handle WebRTC offer - FIXED: Better error handling
async function handleOffer(offer) {
  try {
    console.log("Handling offer")
    await peerConnection.setRemoteDescription(offer)
    const answer = await peerConnection.createAnswer()
    await peerConnection.setLocalDescription(answer)

    sendSignalingMessage(currentCall.meetingId, {
      type: "answer",
      answer: answer,
      from: currentCall.userType,
    })
  } catch (error) {
    console.error("Error handling offer:", error)
  }
}

// Handle WebRTC answer - FIXED: Better error handling
async function handleAnswer(answer) {
  try {
    console.log("Handling answer")
    await peerConnection.setRemoteDescription(answer)
  } catch (error) {
    console.error("Error handling answer:", error)
  }
}

// Handle ICE candidate - FIXED: Create RTCIceCandidate from plain object
async function handleIceCandidate(candidateData) {
  try {
    console.log("Handling ICE candidate")
    const candidate = new RTCIceCandidate({
      candidate: candidateData.candidate,
      sdpMLineIndex: candidateData.sdpMLineIndex,
      sdpMid: candidateData.sdpMid,
    })
    await peerConnection.addIceCandidate(candidate)
  } catch (error) {
    console.error("Error handling ICE candidate:", error)
  }
}

// Toggle mute
function toggleMute() {
  if (!localStream) return

  const audioTrack = localStream.getAudioTracks()[0]
  if (audioTrack) {
    audioTrack.enabled = !audioTrack.enabled
    const muteBtn = document.getElementById("muteBtn")

    muteBtn.innerHTML = audioTrack.enabled
      ? '<i class="fas fa-microphone"></i>'
      : '<i class="fas fa-microphone-slash"></i>'

    muteBtn.classList.toggle("muted", !audioTrack.enabled)
  }
}

// Toggle video
function toggleVideo() {
  if (!localStream) return

  const videoTrack = localStream.getVideoTracks()[0]
  if (videoTrack) {
    videoTrack.enabled = !videoTrack.enabled
    const videoBtn = document.getElementById("videoBtn")

    videoBtn.innerHTML = videoTrack.enabled ? '<i class="fas fa-video"></i>' : '<i class="fas fa-video-slash"></i>'

    videoBtn.classList.toggle("muted", !videoTrack.enabled)
  }
}

// End call - FIXED: Show proper modal for decision
async function endCall() {
  try {
    // Show confirmation dialog for admin
    if (currentCall && currentCall.userType === "admin") {
      const shouldShowActions = confirm(
        "Do you want to make a decision about this candidate now?\n\nClick 'OK' to assign/reject, or 'Cancel' to end the call without deciding.",
      )

      if (shouldShowActions) {
        // Show post-interview decision modal
        await showPostInterviewModal()
        return // Don't close video modal yet, wait for admin decision
      } else {
        // User chose not to make a decision
        interviewDecisionMade = false
      }
    }

    // End call immediately
    await finalizeCallEnd()
  } catch (error) {
    console.error("Error ending call:", error)
    window.showToast("Error ending call", "error")
  }
}

// Show post-interview decision modal
async function showPostInterviewModal() {
  if (!currentCall) return

  const modal = document.getElementById("postInterviewModal")
  const candidateInfo = document.getElementById("postInterviewCandidateInfo")
  const durationSpan = document.getElementById("interviewDuration")
  const completedTimeSpan = document.getElementById("interviewCompletedTime")

  // Populate candidate info
  candidateInfo.innerHTML = `
    <div class="candidate-info-header">
      <div class="candidate-info-avatar">
        ${currentCall.candidate.candidateName.charAt(0).toUpperCase()}
      </div>
      <div class="candidate-info-details">
        <h4>${currentCall.candidate.candidateName}</h4>
        <p>${currentCall.candidate.candidateEmail} • ${currentCall.candidate.jobTitle}</p>
      </div>
    </div>
  `

  // Calculate and show interview duration
  const duration = Math.floor((new Date() - currentCall.startTime) / 1000)
  const minutes = Math.floor(duration / 60)
  const seconds = duration % 60
  durationSpan.textContent = `${minutes}m ${seconds}s`

  // Show completion time
  completedTimeSpan.textContent = new Date().toLocaleTimeString()

  // Reset form
  selectedDecision = null
  document.getElementById("postInterviewRole").value = currentCall.candidate.jobTitle || ""
  document.getElementById("decisionNotes").value = ""
  document.getElementById("decisionDetails").style.display = "none"
  document.getElementById("confirmDecisionBtn").disabled = true

  // Clear previous selections
  document.querySelectorAll(".decision-option").forEach((option) => {
    option.classList.remove("selected")
  })

  // Show modal
  modal.style.display = "flex"
}

// Select decision option
function selectDecisionOption(decision) {
  selectedDecision = decision

  // Update UI
  document.querySelectorAll(".decision-option").forEach((option) => {
    option.classList.remove("selected")
  })

  const selectedOption = document.querySelector(`.${decision}-option`)
  selectedOption.classList.add("selected")

  // Show decision details
  const detailsDiv = document.getElementById("decisionDetails")
  const roleGroup = document.getElementById("assignmentRoleGroup")
  const notesLabel = document.getElementById("decisionNotesLabel")
  const notesTextarea = document.getElementById("decisionNotes")

  detailsDiv.style.display = "block"

  if (decision === "assign") {
    roleGroup.style.display = "block"
    notesLabel.textContent = "Assignment Notes"
    notesTextarea.placeholder = "Add notes about the assignment and role details..."
  } else {
    roleGroup.style.display = "none"
    notesLabel.textContent = "Rejection Notes"
    notesTextarea.placeholder = "Add notes about why the candidate was rejected..."
  }

  // Enable confirm button
  document.getElementById("confirmDecisionBtn").disabled = false
}

// Confirm interview decision
async function confirmInterviewDecision() {
  if (!selectedDecision || !currentCall) return

  try {
    const notes = document.getElementById("decisionNotes").value
    const { getDoc, doc, updateDoc } = window.firestoreUtils
    const candidateRef = doc(window.db, "applications", currentCall.candidate.id)

    // Set the flag that a decision was made
    interviewDecisionMade = true

    console.log("Making decision:", selectedDecision) // Debug log

    if (selectedDecision === "assign") {
      const role = document.getElementById("postInterviewRole").value

      if (!role.trim()) {
        window.showToast("Please enter the assigned role", "error")
        return
      }

      await updateDoc(candidateRef, {
        interviewStatus: "assigned",
        assignedRole: role,
        assignmentNotes: notes || "Assigned after successful interview",
        assignedAt: new Date().toISOString(),
        assignedBy: window.auth.currentUser?.uid || "admin",
        updatedAt: new Date().toISOString(),
      })

      console.log("Candidate assigned successfully") // Debug log
      window.showToast("Candidate assigned successfully!", "success")
    } else {
      await updateDoc(candidateRef, {
        interviewStatus: "rejected",
        rejectionReason: notes || "Not selected after interview",
        rejectedAt: new Date().toISOString(),
        rejectedBy: window.auth.currentUser?.uid || "admin",
        updatedAt: new Date().toISOString(),
      })
      const candidateSnap = await getDoc(candidateRef);
      const candidateData = candidateSnap.data() || {}
      sendNotification(candidateData.candidateEmail,candidateData.candidateName,'rejected');
      console.log("Candidate rejected") // Debug log
      window.showToast("Candidate rejected", "info")
    }

    // Close modal and end call
    closePostInterviewModal()

    // Wait a moment for Firebase to update before finalizing
    setTimeout(async () => {
      await finalizeCallEnd()
    }, 1000)
  } catch (error) {
    console.error("Error confirming decision:", error)
    window.showToast("Error saving decision", "error")
  }
}

// Close post-interview modal
function closePostInterviewModal() {
  document.getElementById("postInterviewModal").style.display = "none"
  selectedDecision = null
}

// Remove the old functions and update global scope
window.selectDecisionOption = selectDecisionOption
window.confirmInterviewDecision = confirmInterviewDecision
window.closePostInterviewModal = closePostInterviewModal
window.showPostInterviewModal = showPostInterviewModal

// Finalize call end
async function finalizeCallEnd() {
  try {
    console.log("Finalizing call end. Decision made:", interviewDecisionMade) // Debug log

    if (currentCall) {
      // Update interview status
      const { doc, updateDoc } = window.firestoreUtils

      if (currentCall.candidate.interviewId) {
        const interviewRef = doc(window.db, "interviews", currentCall.candidate.interviewId)
        await updateDoc(interviewRef, {
          status: "completed",
          endedAt: new Date().toISOString(),
          duration: Math.floor((new Date() - currentCall.startTime) / 1000),
        })
      }

      // Only update candidate status to completed if no decision was made
      if (!interviewDecisionMade) {
        console.log("No decision made, setting status to completed") // Debug log
        const candidateRef = doc(window.db, "applications", currentCall.candidate.id)
        await updateDoc(candidateRef, {
          interviewStatus: "completed",
          interviewEndedAt: new Date().toISOString(),
          interviewDuration: Math.floor((new Date() - currentCall.startTime) / 1000),
        })
      } else {
        console.log("Decision was made, not overriding status") // Debug log
      }
    }

    // Clean up WebRTC
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop())
    }

    if (peerConnection) {
      peerConnection.close()
    }

    if (signalingUnsubscribe) {
      signalingUnsubscribe()
      signalingUnsubscribe = null
    }

    // Close modal
    document.getElementById("videoCallModal").style.display = "none"
    document.getElementById("postInterviewModal").style.display = "none"

    // Reset variables
    currentCall = null
    localStream = null
    peerConnection = null
    selectedDecision = null
    interviewDecisionMade = false // Reset the decision flag

    window.showToast("Interview ended successfully", "success")

    // Wait a bit more before reloading to ensure Firebase has updated
    setTimeout(async () => {
      await loadAcceptedCandidates()
    }, 2000)
  } catch (error) {
    console.error("Error finalizing call end:", error)
    window.showToast("Error ending call", "error")
  }
}

// Utility functions
function isToday(date) {
  const today = new Date()
  return isSameDate(date, today)
}

function isSameDate(date1, date2) {
  return (
    date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear()
  )
}

// FIXED: Proper date formatting for storage to avoid timezone issues
function formatDateForStorage(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

// Check if interview is starting soon (15 minutes before)
function checkUpcomingInterviews() {
  const now = new Date()

  acceptedCandidates.forEach((candidate) => {
    if (candidate.interviewStatus === "interview_scheduled" && candidate.interviewDate && candidate.interviewTime) {
      const interviewDateTime = new Date(`${candidate.interviewDate}T${candidate.interviewTime}:00`)

      // Show join button if within 15 minutes of interview
      if (now >= new Date(interviewDateTime.getTime() - 15 * 60000) && now <= interviewDateTime) {
        showJoinInterviewButton(candidate)
      }
    }
  })
}

// Show join interview button
function showJoinInterviewButton(candidate) {
  const candidateCard = document.querySelector(`[data-candidate-id="${candidate.id}"]`)
  if (candidateCard) {
    const actionsDiv = candidateCard.querySelector(".candidate-actions")

    // Check if join button already exists
    if (!actionsDiv.querySelector(".join-interview-btn")) {
      const joinBtn = document.createElement("button")
      joinBtn.className = "btn success join-interview-btn"
      joinBtn.innerHTML = `
        <i class="fas fa-video"></i>
        Join Interview
      `
      joinBtn.onclick = () => startVideoCall(candidate.id)
      actionsDiv.insertBefore(joinBtn, actionsDiv.firstChild)
    }
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

// View interview details
function viewInterviewDetails(candidateId) {
  window.showToast("Interview details feature coming soon", "info")
}

// Reschedule interview
async function rescheduleInterview(candidateId) {
  const candidate = acceptedCandidates.find((c) => c.id === candidateId)
  if (!candidate) return

  // Store the current interview details for unblocking
  window.currentReschedule = {
    candidateId: candidateId,
    currentDate: candidate.interviewDate,
    currentTime: candidate.interviewTime,
  }

  openScheduleModal(candidateId)
}

// View candidate details
function viewCandidateDetails(candidateId) {
  const candidate = acceptedCandidates.find((c) => c.id === candidateId)
  if (!candidate) return

  window.showToast(`Viewing details for ${candidate.candidateName}`, "info")
  console.log("Candidate details:", candidate)
}
