// Global variables
let candidateData = null
let interviews = []
let filteredInterviews = []
let upcomingInterview = null
let countdownInterval = null
let currentCall = null
let localStream = null
let peerConnection = null
let selectedRating = 0
let signalingUnsubscribe = null

// WebRTC configuration
const rtcConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }],
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

// Initialize the application
document.addEventListener("DOMContentLoaded", async () => {
  try {
    await waitForFirebase()
    await loadCandidateData()
    await loadInterviews()
    setupRealTimeListeners()
    setupEventListeners()
    startCountdownTimer()
  } catch (error) {
    console.error("Error initializing application:", error)
    showToast("Error initializing application", "error")
  }
})

// Setup event listeners
function setupEventListeners() {
  // Rating stars event listeners
  const ratingStars = document.querySelectorAll("#ratingStars i")
  ratingStars.forEach((star, index) => {
    star.addEventListener("click", () => {
      selectedRating = index + 1
      updateStarDisplay()
    })

    star.addEventListener("mouseover", () => {
      highlightStars(index + 1)
    })
  })

  document.getElementById("ratingStars").addEventListener("mouseleave", () => {
    updateStarDisplay()
  })

  // Close modal on outside click
  document.getElementById("feedbackModal").addEventListener("click", (e) => {
    if (e.target.classList.contains("modal-overlay")) {
      closeFeedbackModal()
    }
  })
}

// Load candidate data - FIXED for correct field names
async function loadCandidateData() {
  try {
    // Wait for auth state to be ready
    const user = await new Promise((resolve) => {
      const unsubscribe = window.auth.onAuthStateChanged((user) => {
        unsubscribe()
        resolve(user)
      })
    })

    if (!user) {
      console.log("No authenticated user found, redirecting to login")
      window.location.href = "../../../Login/login.html"
      return
    }

    console.log("Authenticated user:", user.email)
    const { collection, query, where, getDocs } = window.firestoreUtils

    let candidateFound = false

    // First try: Find candidate in applications collection by email
    try {
      const applicationsRef = collection(window.db, "applications")

      // Try exact email match first
      const q1 = query(applicationsRef, where("candidateEmail", "==", user.email))
      const querySnapshot1 = await getDocs(q1)

      if (!querySnapshot1.empty) {
        querySnapshot1.forEach((doc) => {
          candidateData = {
            id: doc.id,
            ...doc.data(),
          }
          candidateFound = true
          console.log("Found candidate by candidateEmail:", candidateData)
        })
      }

      // If not found, try with regular email field
      if (!candidateFound) {
        const q2 = query(applicationsRef, where("email", "==", user.email))
        const querySnapshot2 = await getDocs(q2)

        if (!querySnapshot2.empty) {
          querySnapshot2.forEach((doc) => {
            candidateData = {
              id: doc.id,
              ...doc.data(),
            }
            candidateFound = true
            console.log("Found candidate by email:", candidateData)
          })
        }
      }

      // If still not found, try case-insensitive search
      if (!candidateFound) {
        console.log("Trying case-insensitive search...")
        const allApplicationsSnapshot = await getDocs(applicationsRef)

        allApplicationsSnapshot.forEach((doc) => {
          const data = doc.data()
          const userEmailLower = user.email.toLowerCase()

          if (
            (data.candidateEmail && data.candidateEmail.toLowerCase() === userEmailLower) ||
            (data.email && data.email.toLowerCase() === userEmailLower)
          ) {
            candidateData = {
              id: doc.id,
              ...data,
            }
            candidateFound = true
            console.log("Found candidate by case-insensitive search:", candidateData)
          }
        })
      }
    } catch (error) {
      console.log("Error querying applications:", error)
    }

    // Fallback: try users collection
    if (!candidateFound) {
      try {
        const usersRef = collection(window.db, "users")
        const userQuery = query(usersRef, where("email", "==", user.email))
        const userSnapshot = await getDocs(userQuery)

        if (!userSnapshot.empty) {
          userSnapshot.forEach((doc) => {
            const userData = doc.data()
            candidateData = {
              id: doc.id,
              candidateName: userData.candidateName || userData.name || userData.displayName || "Unknown",
              candidateEmail: userData.candidateEmail || userData.email,
              candidateId: userData.candidateId || doc.id,
              ...userData,
            }
            candidateFound = true
            console.log("Found candidate in users collection:", candidateData)
          })
        }
      } catch (error) {
        console.log("Error querying users:", error)
      }
    }

    // Final fallback: create basic profile from auth user
    if (!candidateFound) {
      candidateData = {
        id: user.uid,
        candidateName: user.displayName || "Unknown Candidate",
        candidateEmail: user.email,
        candidateId: user.uid,
        candidatePhone: user.phoneNumber || "Not provided",
        appliedDate: new Date().toISOString(),
        status: "registered",
      }
      console.log("Created fallback candidate data:", candidateData)
    }

    // Update UI
    updateCandidateUI()

    if (candidateFound) {
      showToast(`Welcome back, ${candidateData.candidateName}!`, "success")
    } else {
      showToast("Profile created. Contact admin if you don't see your interviews.", "warning")
    }
  } catch (error) {
    console.error("Error loading candidate data:", error)
    showToast("Error loading candidate data", "error")
  }
}

// Update candidate UI - FIXED for correct field names
function updateCandidateUI() {
  if (!candidateData) return

  const candidateName = candidateData.candidateName || "Unknown"
  const candidateEmail = candidateData.candidateEmail || "Unknown"

  document.getElementById("candidateName").textContent = candidateName
  document.getElementById("candidateEmail").textContent = candidateEmail

  const avatar = document.getElementById("candidateAvatar")
  avatar.innerHTML = candidateName.charAt(0).toUpperCase()
}

// Load interviews - FIXED for better fetching
async function loadInterviews() {
  try {
    if (!candidateData) {
      console.log("No candidate data available")
      return
    }

    console.log("Loading interviews for candidate:", candidateData)
    const { collection, query, where, orderBy, getDocs } = window.firestoreUtils
    const interviewsRef = collection(window.db, "interviews")

    interviews = []

    // Strategy 1: Query by candidateId if available
    if (candidateData.candidateId || candidateData.id) {
      const searchId = candidateData.candidateId || candidateData.id
      try {
        console.log("Trying query by candidateId:", searchId)
        const q1 = query(interviewsRef, where("candidateId", "==", searchId))
        const querySnapshot1 = await getDocs(q1)

        querySnapshot1.forEach((doc) => {
          interviews.push({
            id: doc.id,
            ...doc.data(),
          })
        })

        console.log(`Found ${interviews.length} interviews by candidateId`)
      } catch (error) {
        console.log("Query by candidateId failed:", error)
      }
    }

    // Strategy 2: Query by candidateEmail if no results yet
    if (interviews.length === 0 && candidateData.candidateEmail) {
      try {
        console.log("Trying query by candidateEmail:", candidateData.candidateEmail)
        const q2 = query(interviewsRef, where("candidateEmail", "==", candidateData.candidateEmail))
        const querySnapshot2 = await getDocs(q2)

        querySnapshot2.forEach((doc) => {
          interviews.push({
            id: doc.id,
            ...doc.data(),
          })
        })

        console.log(`Found ${interviews.length} interviews by candidateEmail`)
      } catch (error) {
        console.log("Query by candidateEmail failed:", error)
      }
    }

    // Strategy 3: Fallback - get all interviews and filter manually
    if (interviews.length === 0) {
      try {
        console.log("Using fallback method - getting all interviews")
        const allInterviewsSnapshot = await getDocs(interviewsRef)
        const candidateEmailLower = candidateData.candidateEmail?.toLowerCase()
        const candidateId = candidateData.candidateId || candidateData.id

        allInterviewsSnapshot.forEach((doc) => {
          const data = doc.data()

          // Check multiple possible matches
          const matches = [data.candidateId === candidateId, data.candidateEmail?.toLowerCase() === candidateEmailLower]

          if (matches.some((match) => match)) {
            interviews.push({
              id: doc.id,
              ...data,
            })
          }
        })

        console.log(`Found ${interviews.length} interviews using fallback method`)
      } catch (error) {
        console.error("Fallback query failed:", error)
      }
    }

    // Sort interviews by date and time (most recent first)
    interviews.sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time}:00`)
      const dateB = new Date(`${b.date}T${b.time}:00`)
      return dateB - dateA
    })

    console.log(`Total interviews loaded: ${interviews.length}`)
    console.log("Interviews:", interviews)

    // Update UI
    filteredInterviews = [...interviews]
    displayInterviews()
    checkUpcomingInterview()
    checkCurrentInterview()

    // Hide loading, show appropriate state
    document.getElementById("loadingState").style.display = "none"

    if (interviews.length === 0) {
      document.getElementById("emptyState").style.display = "block"
      document.getElementById("interviewsList").style.display = "none"
    } else {
      document.getElementById("emptyState").style.display = "none"
      document.getElementById("interviewsList").style.display = "block"
    }
  } catch (error) {
    console.error("Error loading interviews:", error)
    showToast("Error loading interviews", "error")

    document.getElementById("loadingState").style.display = "none"
    document.getElementById("emptyState").style.display = "block"
    document.getElementById("interviewsList").style.display = "none"
  }
}

// Check for upcoming interview
function checkUpcomingInterview() {
  const now = new Date()

  const upcomingInterviews = interviews
    .filter((interview) => {
      const interviewDateTime = new Date(`${interview.date}T${interview.time}:00`)
      return interview.status === "scheduled" && interviewDateTime > now
    })
    .sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time}:00`)
      const dateB = new Date(`${b.date}T${b.time}:00`)
      return dateA - dateB
    })

  if (upcomingInterviews.length > 0) {
    upcomingInterview = upcomingInterviews[0]
    displayUpcomingInterview()
  } else {
    upcomingInterview = null
    document.getElementById("upcomingInterviewSection").style.display = "none"
  }
}

// Check for current interview
function checkCurrentInterview() {
  const currentInterviews = interviews.filter((interview) => {
    return interview.status === "in_progress" && interview.adminJoined
  })

  if (currentInterviews.length > 0) {
    displayCurrentInterview(currentInterviews[0])
  } else {
    document.getElementById("currentInterviewSection").style.display = "none"
  }
}

// Display upcoming interview
function displayUpcomingInterview() {
  if (!upcomingInterview) return

  const section = document.getElementById("upcomingInterviewSection")
  const card = document.getElementById("upcomingInterviewCard")

  const interviewDate = new Date(`${upcomingInterview.date}T${upcomingInterview.time}:00`)
  const now = new Date()

  const canJoin =
    now >= new Date(interviewDate.getTime() - 15 * 60000) && now <= interviewDate && upcomingInterview.adminJoined

  card.innerHTML = `
    <div class="interview-card-header">
      <div class="interview-icon">
        <i class="fas fa-video"></i>
      </div>
      <div class="interview-info">
        <h3>${upcomingInterview.jobTitle || upcomingInterview.candidateJobTitle || "Interview"}</h3>
        <div class="interview-meta">
          <div class="meta-item">
            <i class="fas fa-calendar"></i>
            <span>${interviewDate.toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}</span>
          </div>
          <div class="meta-item">
            <i class="fas fa-clock"></i>
            <span>${upcomingInterview.time}</span>
          </div>
          <div class="meta-item">
            <i class="fas fa-${getInterviewTypeIcon(upcomingInterview.type)}"></i>
            <span>${getInterviewTypeText(upcomingInterview.type)}</span>
          </div>
        </div>
        ${
          upcomingInterview.notes
            ? `
          <div class="interview-notes">
            <p>${upcomingInterview.notes}</p>
          </div>
        `
            : ""
        }
      </div>
    </div>
    
    <div class="interview-actions">
      ${
        canJoin
          ? `
        <button class="btn success" onclick="joinInterview('${upcomingInterview.id}')">
          <i class="fas fa-video"></i>
          Join Interview
        </button>
      `
          : upcomingInterview.adminJoined
            ? `
        <div class="waiting-message">
          <i class="fas fa-clock"></i>
          <span>Available 15 minutes before scheduled time</span>
        </div>
      `
            : `
        <div class="waiting-message">
          <i class="fas fa-hourglass-half"></i>
          <span>Waiting for interviewer to start</span>
        </div>
      `
      }
    </div>
  `

  section.style.display = "block"
}

// Display current interview
function displayCurrentInterview(interview) {
  const section = document.getElementById("currentInterviewSection")
  const joinBtn = document.getElementById("joinCurrentInterviewBtn")

  joinBtn.onclick = () => joinInterview(interview.id)
  section.style.display = "block"
}

// Display interviews list
function displayInterviews() {
  const interviewsList = document.getElementById("interviewsList")
  interviewsList.innerHTML = ""

  if (filteredInterviews.length === 0) {
    interviewsList.innerHTML = `
      <div class="loading-jobs">
        <div class="loading-spinner">
          <i class="fas fa-search"></i>
        </div>
        <p>No interviews match your filter criteria.</p>
      </div>
    `
    return
  }

  filteredInterviews.forEach((interview) => {
    const interviewCard = createInterviewCard(interview)
    interviewsList.appendChild(interviewCard)
  })
}

// Create interview card
function createInterviewCard(interview) {
  const card = document.createElement("div")
  card.className = "interview-card"

  const interviewDate = new Date(`${interview.date}T${interview.time}:00`)
  const now = new Date()
  const isPast = interviewDate < now

  const canJoin =
    now >= new Date(interviewDate.getTime() - 15 * 60000) &&
    now <= interviewDate &&
    interview.adminJoined &&
    interview.status === "scheduled"

  card.innerHTML = `
    <div class="interview-header">
      <div class="interview-status-badge ${interview.status}">
        ${getStatusText(interview.status)}
      </div>
      <div class="interview-date-time">
        <div class="date">${interviewDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}</div>
        <div class="time">${interview.time}</div>
      </div>
    </div>

    <div class="interview-details">
      <h4>${interview.jobTitle || interview.candidateJobTitle || "Interview"}</h4>
      <div class="interview-meta">
        <div class="meta-item">
          <i class="fas fa-${getInterviewTypeIcon(interview.type)}"></i>
          <span>${getInterviewTypeText(interview.type)}</span>
        </div>
        ${
          interview.notes
            ? `
          <div class="meta-item">
            <i class="fas fa-sticky-note"></i>
            <span>${interview.notes}</span>
          </div>
        `
            : ""
        }
      </div>
    </div>

    <div class="interview-actions">
      ${
        canJoin
          ? `
        <button class="btn success" onclick="joinInterview('${interview.id}')">
          <i class="fas fa-video"></i>
          Join Interview
        </button>
      `
          : interview.status === "in_progress"
            ? `
        <button class="btn success" onclick="joinInterview('${interview.id}')">
          <i class="fas fa-video"></i>
          Rejoin Interview
        </button>
      `
            : interview.status === "completed"
              ? `
        <button class="btn secondary" onclick="viewInterviewSummary('${interview.id}')">
          <i class="fas fa-eye"></i>
          View Summary
        </button>
      `
              : isPast && interview.status === "scheduled"
                ? `
        <span class="text-muted">Interview time has passed</span>
      `
                : `
        <span class="text-muted">
          ${interview.adminJoined ? "Available 15 min before" : "Waiting for interviewer"}
        </span>
      `
      }
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

// Get interview type icon
function getInterviewTypeIcon(type) {
  switch (type) {
    case "video":
      return "video"
    case "phone":
      return "phone"
    case "in-person":
      return "handshake"
    default:
      return "calendar"
  }
}

// Get status text
function getStatusText(status) {
  switch (status) {
    case "scheduled":
      return "Scheduled"
    case "in_progress":
      return "In Progress"
    case "completed":
      return "Completed"
    case "cancelled":
      return "Cancelled"
    default:
      return "Unknown"
  }
}

// Start countdown timer
function startCountdownTimer() {
  if (countdownInterval) {
    clearInterval(countdownInterval)
  }

  countdownInterval = setInterval(() => {
    if (!upcomingInterview) return

    const now = new Date()
    const interviewTime = new Date(`${upcomingInterview.date}T${upcomingInterview.time}:00`)
    const timeDiff = interviewTime - now

    if (timeDiff <= 0) {
      clearInterval(countdownInterval)
      checkUpcomingInterview()
      return
    }

    const hours = Math.floor(timeDiff / (1000 * 60 * 60))
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000)

    const hoursEl = document.getElementById("hoursLeft")
    const minutesEl = document.getElementById("minutesLeft")
    const secondsEl = document.getElementById("secondsLeft")

    if (hoursEl) hoursEl.textContent = hours.toString().padStart(2, "0")
    if (minutesEl) minutesEl.textContent = minutes.toString().padStart(2, "0")
    if (secondsEl) secondsEl.textContent = seconds.toString().padStart(2, "0")
  }, 1000)
}

// Join interview - FIXED: Better error handling and WebRTC initialization
async function joinInterview(interviewId) {
  try {
    const interview = interviews.find((i) => i.id === interviewId)
    if (!interview) {
      showToast("Interview not found", "error")
      return
    }

    // Update interview status
    const { doc, updateDoc } = window.firestoreUtils
    const interviewRef = doc(window.db, "interviews", interviewId)

    await updateDoc(interviewRef, {
      candidateJoined: true,
      candidateJoinedAt: new Date().toISOString(),
    })

    // Open video call modal
    const meetingId = interview.meetingId || `interview_${interviewId}`
    await openVideoCallModal(meetingId, interview, "candidate")
  } catch (error) {
    console.error("Error joining interview:", error)
    showToast("Error joining interview", "error")
  }
}

// Open video call modal - FIXED: Better modal handling
async function openVideoCallModal(meetingId, interview, userType) {
  const modal = document.getElementById("videoCallModal")
  const title = document.getElementById("callTitle")
  const subtitle = document.getElementById("callSubtitle")

  title.textContent = `Interview: ${interview.jobTitle || interview.candidateJobTitle || "Interview"}`
  subtitle.textContent = "Connecting to interviewer..."

  modal.style.display = "flex"

  try {
    await initializeWebRTC(meetingId, interview, userType)
  } catch (error) {
    console.error("Error initializing WebRTC:", error)
    showToast("Error starting video call", "error")
    modal.style.display = "none"
  }
}

// Initialize WebRTC - FIXED: Improved implementation to match admin side
async function initializeWebRTC(meetingId, interview, userType) {
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
      remoteParticipant.innerHTML = "<span>Interviewer</span>"

      document.getElementById("callSubtitle").textContent = "Connected"
      showToast("Connected to interviewer!", "success")
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
          showToast("Connection lost. Trying to reconnect...", "warning")
          break
      }
    }

    // Handle ICE candidates - FIXED: Convert to plain object for Firestore
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        // Convert RTCIceCandidate to plain object for Firestore
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

    currentCall = {
      meetingId,
      interview,
      userType,
      startTime: new Date(),
    }

    console.log("WebRTC initialization completed for candidate")
  } catch (error) {
    console.error("Error in initializeWebRTC:", error)

    if (error.name === "NotAllowedError") {
      showToast("Please allow camera and microphone access", "error")
    } else {
      showToast("Error accessing camera/microphone", "error")
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
    // Convert plain object back to RTCIceCandidate
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

// End call - FIXED: Better cleanup and feedback handling
async function endCall() {
  try {
    if (currentCall) {
      // Update interview status
      const { doc, updateDoc } = window.firestoreUtils
      const interviewRef = doc(window.db, "interviews", currentCall.interview.id)

      await updateDoc(interviewRef, {
        status: "completed",
        endedAt: new Date().toISOString(),
        duration: Math.floor((new Date() - currentCall.startTime) / 1000),
      })
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

    // Show feedback modal for candidate
    if (currentCall && currentCall.userType === "candidate") {
      setTimeout(() => {
        document.getElementById("feedbackModal").style.display = "flex"
      }, 1000)
    }

    // Reset variables
    currentCall = null
    localStream = null
    peerConnection = null

    // Reload interviews
    await loadInterviews()

    showToast("Interview ended", "success")
  } catch (error) {
    console.error("Error ending call:", error)
    showToast("Error ending call", "error")
  }
}

// Setup real-time listeners - FIXED for correct field names
function setupRealTimeListeners() {
  if (!candidateData) return

  const { collection, query, where, onSnapshot } = window.firestoreUtils
  const interviewsRef = collection(window.db, "interviews")

  // Listen for interview changes using multiple possible fields
  const queries = []

  if (candidateData.candidateId || candidateData.id) {
    const searchId = candidateData.candidateId || candidateData.id
    queries.push(query(interviewsRef, where("candidateId", "==", searchId)))
  }

  if (candidateData.candidateEmail) {
    queries.push(query(interviewsRef, where("candidateEmail", "==", candidateData.candidateEmail)))
  }

  queries.forEach((q) => {
    onSnapshot(q, (snapshot) => {
      let hasChanges = false

      snapshot.docChanges().forEach((change) => {
        if (change.type === "modified") {
          const updatedInterview = { id: change.doc.id, ...change.doc.data() }

          // Update local interviews array
          const index = interviews.findIndex((i) => i.id === updatedInterview.id)
          if (index !== -1) {
            interviews[index] = updatedInterview
            hasChanges = true
          }

          // Notify if admin joined
          if (updatedInterview.adminJoined && !updatedInterview.candidateJoined) {
            showToast("Interviewer has joined. You can now join the interview!", "success")
          }
        }
      })

      if (hasChanges) {
        checkUpcomingInterview()
        checkCurrentInterview()
        displayInterviews()
      }
    })
  })
}

// Filter interviews
function filterInterviews() {
  const statusFilter = document.getElementById("statusFilter").value

  filteredInterviews = interviews.filter((interview) => {
    return statusFilter === "all" || interview.status === statusFilter
  })

  displayInterviews()
}

// Rating functionality
function highlightStars(rating) {
  const stars = document.querySelectorAll("#ratingStars i")
  stars.forEach((star, index) => {
    star.classList.toggle("active", index < rating)
  })
}

function updateStarDisplay() {
  highlightStars(selectedRating)
}

// Submit feedback - FIXED for correct field names
async function submitFeedback() {
  const comments = document.getElementById("feedbackComments").value

  try {
    const { collection, addDoc } = window.firestoreUtils
    const feedbackRef = collection(window.db, "interview_feedback")

    await addDoc(feedbackRef, {
      interviewId: currentCall?.interview?.id,
      candidateId: candidateData.candidateId || candidateData.id,
      candidateName: candidateData.candidateName,
      candidateEmail: candidateData.candidateEmail,
      candidateJobTitle: candidateData.candidateJobTitle,
      rating: selectedRating,
      comments: comments,
      submittedAt: new Date().toISOString(),
    })

    showToast("Thank you for your feedback!", "success")
    closeFeedbackModal()
  } catch (error) {
    console.error("Error submitting feedback:", error)
    showToast("Error submitting feedback", "error")
  }
}

// Close feedback modal
function closeFeedbackModal() {
  document.getElementById("feedbackModal").style.display = "none"
  selectedRating = 0
  updateStarDisplay()
  document.getElementById("feedbackComments").value = ""
}

// View interview summary
function viewInterviewSummary(interviewId) {
  showToast("Interview summary feature coming soon", "info")
}

// Logout
function logout() {
  localStorage.removeItem("userLoggedIn");
  if (window.auth && window.auth.signOut) {
    window.auth
      .signOut()
      .then(() => {
        window.location.href = "../../../Login/login.html"
      })
      .catch((error) => {
        console.error("Error signing out:", error)
        showToast("Error signing out", "error")
      })
  } else {
    window.location.href = "../../../Login/login.html"
  }
}

// Show toast notification - FIXED: Better toast handling
function showToast(message, type = "info") {
  const toast = document.getElementById("toast")
  const toastMessage = document.getElementById("toastMessage")

  // Set message
  toastMessage.textContent = message

  // Set icon based on type
  const icon = toast.querySelector("i")
  icon.className = `fas fa-${getToastIcon(type)}`

  // Set toast class
  toast.className = `toast ${type} show`

  // Hide after 4 seconds
  setTimeout(() => {
    toast.classList.remove("show")
  }, 4000)
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

// Make functions globally accessible
window.joinInterview = joinInterview
window.toggleMute = toggleMute
window.toggleVideo = toggleVideo
window.endCall = endCall
window.filterInterviews = filterInterviews
window.submitFeedback = submitFeedback
window.closeFeedbackModal = closeFeedbackModal
window.viewInterviewSummary = viewInterviewSummary
window.logout = logout
