// Global variables
let candidateData = null
let interviews = []
let filteredInterviews = []
let upcomingInterview = null
let countdownInterval = null
let currentCall = null
let localStream = null
const remoteStream = null
let peerConnection = null
let selectedRating = 0

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

// Initialize the page
document.addEventListener("DOMContentLoaded", async () => {
  try {
    await waitForFirebase()
    await loadCandidateData()
    await loadInterviews()
    setupRealTimeListeners()
    startCountdownTimer()
  } catch (error) {
    console.error("Error initializing page:", error)
    window.showToast("Error initializing application", "error")
  }
})

// Load candidate data
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
      window.location.href = "candidate-login.html"
      return
    }

    console.log("Authenticated user:", user.email)

    const { collection, query, where, getDocs } = window.firestoreUtils
    const applicationsRef = collection(window.db, "applications")

    // Try multiple query approaches to find the candidate
    let candidateFound = false

    // First try: exact email match
    const q = query(applicationsRef, where("email", "==", user.email))
    const querySnapshot = await getDocs(q)

    if (!querySnapshot.empty) {
      querySnapshot.forEach((doc) => {
        candidateData = {
          id: doc.id,
          ...doc.data(),
        }
        candidateFound = true
      })
    }

    // Second try: case-insensitive email match if first attempt failed
    if (!candidateFound) {
      const allApplicationsRef = collection(window.db, "applications")
      const allSnapshot = await getDocs(allApplicationsRef)

      allSnapshot.forEach((doc) => {
        const data = doc.data()
        if (data.email && data.email.toLowerCase() === user.email.toLowerCase()) {
          candidateData = {
            id: doc.id,
            ...data,
          }
          candidateFound = true
        }
      })
    }

    // Third try: check if user has a profile document
    if (!candidateFound) {
      const usersRef = collection(window.db, "users")
      const userQuery = query(usersRef, where("email", "==", user.email))
      const userSnapshot = await getDocs(userQuery)

      if (!userSnapshot.empty) {
        userSnapshot.forEach((doc) => {
          const userData = doc.data()
          candidateData = {
            id: doc.id,
            name: userData.name || userData.displayName || "Unknown",
            email: userData.email,
            ...userData,
          }
          candidateFound = true
        })
      }
    }

    if (candidateFound && candidateData) {
      console.log("Candidate data loaded:", candidateData)

      // Update UI with candidate info
      document.getElementById("candidateName").textContent = candidateData.name || user.displayName || "Unknown"
      document.getElementById("candidateEmail").textContent = candidateData.email || user.email || "Unknown"

      const avatar = document.getElementById("candidateAvatar")
      const name = candidateData.name || user.displayName || "U"
      avatar.innerHTML = name.charAt(0).toUpperCase()

      // Show success message
      window.showToast(`Welcome, ${candidateData.name || "Candidate"}!`, "success")
    } else {
      console.error("Candidate data not found for user:", user.email)

      // Create a basic candidate profile if none exists
      candidateData = {
        id: user.uid,
        name: user.displayName || "Unknown Candidate",
        email: user.email,
        phone: user.phoneNumber || "Not provided",
        appliedDate: new Date().toISOString(),
        status: "registered",
      }

      // Update UI with available user info
      document.getElementById("candidateName").textContent = candidateData.name
      document.getElementById("candidateEmail").textContent = candidateData.email

      const avatar = document.getElementById("candidateAvatar")
      avatar.innerHTML = candidateData.name.charAt(0).toUpperCase()

      window.showToast("Profile created. Please contact admin if you don't see your interviews.", "warning")
    }
  } catch (error) {
    console.error("Error loading candidate data:", error)
    window.showToast("Error loading candidate data", "error")

    // Fallback: use auth user data
    const user = window.auth.currentUser
    if (user) {
      candidateData = {
        id: user.uid,
        name: user.displayName || "Unknown",
        email: user.email,
      }

      document.getElementById("candidateName").textContent = candidateData.name
      document.getElementById("candidateEmail").textContent = candidateData.email

      const avatar = document.getElementById("candidateAvatar")
      avatar.innerHTML = candidateData.name.charAt(0).toUpperCase()
    }
  }
}

// Load interviews
async function loadInterviews() {
  try {
    if (!candidateData) {
      console.log("No candidate data available")
      return
    }

    const { collection, query, where, orderBy, getDocs, or } = window.firestoreUtils
    const interviewsRef = collection(window.db, "interviews")

    // Try multiple query approaches to find interviews
    // NO assignment to this.interviews needed---just use the global 'interviews'
    filteredInterviews = [...interviews]   // Ok!


    // First try: by candidateId
    if (candidateData.id) {
      const q = query(
        interviewsRef,
        where("candidateId", "==", candidateData.id),
        orderBy("date", "desc"),
        orderBy("time", "desc"),
      )

      try {
        const querySnapshot = await getDocs(q)
        querySnapshot.forEach((doc) => {
          interviews.push({
            id: doc.id,
            ...doc.data(),
          })
        })
      } catch (error) {
        console.log("Query by candidateId failed, trying by email")
      }
    }

    // Second try: by candidate email if no results from first try
    if (interviews.length === 0 && candidateData.candidateEmail) {
      const q = query(
        interviewsRef,
        where("candidateEmail", "==", candidateData.candidateEmail),
        orderBy("date", "desc"),
        orderBy("time", "desc"),
      )

      try {
        const querySnapshot = await getDocs(q)
        querySnapshot.forEach((doc) => {
          interviews.push({
            id: doc.id,
            ...doc.data(),
          })
        })
      } catch (error) {
        console.log("Query by candidateEmail failed")
      }
    }

    // Third try: get all interviews and filter by email (fallback)
    if (interviews.length === 0) {
      try {
        const allInterviewsSnapshot = await getDocs(interviewsRef)
        allInterviewsSnapshot.forEach((doc) => {
          const data = doc.data()
          if (data.candidateEmail && data.candidateEmail.toLowerCase() === candidateData.email.toLowerCase()) {
            interviews.push({
              id: doc.id,
              ...data,
            })
          }
        })

        // Sort manually since we couldn't use orderBy
        interviews.sort((a, b) => {
          const dateA = new Date(`${a.date}T${a.time}:00`)
          const dateB = new Date(`${b.date}T${b.time}:00`)
          return dateB - dateA
        })
      } catch (error) {
        console.error("Fallback query failed:", error)
      }
    }

    console.log(`Found ${interviews.length} interviews for candidate`)

    filteredInterviews = [...interviews]
    displayInterviews()
    checkUpcomingInterview()

    document.getElementById("loadingState").style.display = "none"

    if (interviews.length === 0) {
      document.getElementById("emptyState").style.display = "flex"
    } else {
      document.getElementById("interviewsList").style.display = "block"
    }
  } catch (error) {
    console.error("Error loading interviews:", error)
    window.showToast("Error loading interviews", "error")
    document.getElementById("loadingState").style.display = "none"
    document.getElementById("emptyState").style.display = "flex"
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
  }

  // Check for current interview
  const currentInterviews = interviews.filter((interview) => {
    return interview.status === "in_progress" && interview.adminJoined
  })

  if (currentInterviews.length > 0) {
    displayCurrentInterview(currentInterviews[0])
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
        <h3>${upcomingInterview.jobTitle}</h3>
        <p class="interview-date">
          <i class="fas fa-calendar"></i>
          ${interviewDate.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
        <p class="interview-time">
          <i class="fas fa-clock"></i>
          ${upcomingInterview.time}
        </p>
        <p class="interview-type">
          <i class="fas fa-${getInterviewTypeIcon(upcomingInterview.type)}"></i>
          ${getInterviewTypeText(upcomingInterview.type)}
        </p>
      </div>
    </div>
    
    ${
      upcomingInterview.notes
        ? `
      <div class="interview-notes">
        <h4>Interview Notes</h4>
        <p>${upcomingInterview.notes}</p>
      </div>
    `
        : ""
    }
    
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
          <span>Interview will be available 15 minutes before scheduled time</span>
        </div>
      `
            : `
        <div class="waiting-message">
          <i class="fas fa-hourglass-half"></i>
          <span>Waiting for interviewer to start the meeting</span>
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

// Display interviews
function displayInterviews() {
  const interviewsList = document.getElementById("interviewsList")
  interviewsList.innerHTML = ""

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
      <h4>${interview.jobTitle}</h4>
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
      checkUpcomingInterview() // Refresh to check for new upcoming interviews
      return
    }

    const hours = Math.floor(timeDiff / (1000 * 60 * 60))
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000)

    document.getElementById("hoursLeft").textContent = hours.toString().padStart(2, "0")
    document.getElementById("minutesLeft").textContent = minutes.toString().padStart(2, "0")
    document.getElementById("secondsLeft").textContent = seconds.toString().padStart(2, "0")
  }, 1000)
}

// Join interview
async function joinInterview(interviewId) {
  try {
    const interview = interviews.find((i) => i.id === interviewId)
    if (!interview) return

    // Update interview status to indicate candidate joined
    const { doc, updateDoc } = window.firestoreUtils
    const interviewRef = doc(window.db, "interviews", interviewId)
    await updateDoc(interviewRef, {
      candidateJoined: true,
      candidateJoinedAt: new Date().toISOString(),
    })

    // Open video call modal
    openVideoCallModal(interview.meetingId || `interview_${interviewId}`, interview, "candidate")
  } catch (error) {
    console.error("Error joining interview:", error)
    window.showToast("Error joining interview", "error")
  }
}

// Open video call modal
async function openVideoCallModal(meetingId, interview, userType) {
  const modal = document.getElementById("videoCallModal")
  const title = document.getElementById("callTitle")
  const subtitle = document.getElementById("callSubtitle")

  title.textContent = `Interview: ${interview.jobTitle}`
  subtitle.textContent = userType === "candidate" ? "Connecting to interviewer..." : "Waiting for candidate..."

  modal.classList.add("active")

  try {
    await initializeWebRTC(meetingId, interview, userType)
  } catch (error) {
    console.error("Error initializing WebRTC:", error)
    window.showToast("Error starting video call", "error")
  }
}

// Initialize WebRTC
async function initializeWebRTC(meetingId, interview, userType) {
  try {
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
      const remoteVideo = document.getElementById("remoteVideo")
      remoteVideo.srcObject = event.streams[0]

      const remoteParticipant = document.getElementById("remoteParticipant")
      remoteParticipant.innerHTML = `<span>${userType === "candidate" ? "Interviewer" : "Candidate"}</span>`
    }

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        // Send ICE candidate to remote peer via Firebase
        sendSignalingMessage(meetingId, {
          type: "ice-candidate",
          candidate: event.candidate,
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
  } catch (error) {
    console.error("Error accessing media devices:", error)
    window.showToast("Error accessing camera/microphone", "error")
  }
}

// Send signaling message
async function sendSignalingMessage(meetingId, message) {
  try {
    const { collection, addDoc } = window.firestoreUtils
    const signalingRef = collection(window.db, "signaling", meetingId, "messages")
    await addDoc(signalingRef, {
      ...message,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error sending signaling message:", error)
  }
}

// Listen for signaling messages
function listenForSignalingMessages(meetingId, userType) {
  const { collection, onSnapshot, orderBy, query } = window.firestoreUtils
  const signalingRef = collection(window.db, "signaling", meetingId, "messages")
  const q = query(signalingRef, orderBy("timestamp"))

  onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach(async (change) => {
      if (change.type === "added") {
        const message = change.doc.data()

        // Ignore messages from self
        if (message.from === userType) return

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
      }
    })
  })
}

// Handle WebRTC offer
async function handleOffer(offer) {
  try {
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

// Handle WebRTC answer
async function handleAnswer(answer) {
  try {
    await peerConnection.setRemoteDescription(answer)
  } catch (error) {
    console.error("Error handling answer:", error)
  }
}

// Handle ICE candidate
async function handleIceCandidate(candidate) {
  try {
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

// End call
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

    // Close modal
    document.getElementById("videoCallModal").classList.remove("active")

    // Show feedback modal
    if (currentCall && currentCall.userType === "candidate") {
      setTimeout(() => {
        document.getElementById("feedbackModal").classList.add("active")
      }, 1000)
    }

    currentCall = null
    localStream = null
    peerConnection = null

    // Reload interviews to update status
    await loadInterviews()
  } catch (error) {
    console.error("Error ending call:", error)
    window.showToast("Error ending call", "error")
  }
}

// Setup real-time listeners
function setupRealTimeListeners() {
  if (!candidateData) return

  const { collection, query, where, onSnapshot, or } = window.firestoreUtils
  const interviewsRef = collection(window.db, "interviews")

  // Listen for changes by candidateId
  if (candidateData.id) {
    const q = query(interviewsRef, where("candidateId", "==", candidateData.id))

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

          // Check if admin joined and notify candidate
          if (updatedInterview.adminJoined && !updatedInterview.candidateJoined) {
            window.showToast("Interviewer has joined. You can now join the interview!", "success")
          }
        }
      })

      if (hasChanges) {
        checkUpcomingInterview()
        displayInterviews()
      }
    })
  }

  // Also listen by email as fallback
  if (candidateData.email) {
    const emailQuery = query(interviewsRef, where("candidateEmail", "==", candidateData.email))

    onSnapshot(emailQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "modified") {
          const updatedInterview = { id: change.doc.id, ...change.doc.data() }

          // Check if admin joined and notify candidate
          if (updatedInterview.adminJoined && !updatedInterview.candidateJoined) {
            window.showToast("Interviewer has joined. You can now join the interview!", "success")
            checkUpcomingInterview()
          }
        }
      })
    })
  }
}

// Filter interviews
function filterInterviews() {
  const statusFilter = document.getElementById("statusFilter").value

  filteredInterviews = interviews.filter((interview) => {
    return statusFilter === "all" || interview.status === statusFilter
  })

  displayInterviews()

  if (filteredInterviews.length === 0) {
    document.getElementById("interviewsList").innerHTML = `
      <div class="loading-jobs">
        <div class="loading-spinner">
          <i class="fas fa-search"></i>
        </div>
        <p>No interviews match your filter criteria.</p>
      </div>
    `
  }
}

// Rating functionality
document.addEventListener("DOMContentLoaded", () => {
  const stars = document.querySelectorAll(".rating-stars i")
  stars.forEach((star, index) => {
    star.addEventListener("click", () => {
      selectedRating = index + 1
      updateStarDisplay()
    })

    star.addEventListener("mouseover", () => {
      highlightStars(index + 1)
    })
  })

  document.querySelector(".rating-stars").addEventListener("mouseleave", () => {
    updateStarDisplay()
  })
})

function highlightStars(rating) {
  const stars = document.querySelectorAll(".rating-stars i")
  stars.forEach((star, index) => {
    star.classList.toggle("active", index < rating)
  })
}

function updateStarDisplay() {
  highlightStars(selectedRating)
}

// Submit feedback
async function submitFeedback() {
  const comments = document.getElementById("feedbackComments").value

  try {
    const { collection, addDoc } = window.firestoreUtils
    const feedbackRef = collection(window.db, "interview_feedback")
    await addDoc(feedbackRef, {
      interviewId: currentCall?.interview?.id,
      candidateId: candidateData.id,
      candidateName: candidateData.name,
      rating: selectedRating,
      comments: comments,
      submittedAt: new Date().toISOString(),
    })

    window.showToast("Thank you for your feedback!", "success")
    closeFeedbackModal()
  } catch (error) {
    console.error("Error submitting feedback:", error)
    window.showToast("Error submitting feedback", "error")
  }
}

// Close feedback modal
function closeFeedbackModal() {
  document.getElementById("feedbackModal").classList.remove("active")
  selectedRating = 0
  updateStarDisplay()
  document.getElementById("feedbackComments").value = ""
}

// View interview summary
function viewInterviewSummary(interviewId) {
  window.showToast("Interview summary feature coming soon", "info")
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
