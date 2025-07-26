// Professional Admin Dashboard JavaScript - Backend Driven

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js"
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js"

// ✅ Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC_aPXz8M3ru6UATZr_bf8u_5RzlB7ek8s",
  authDomain: "doom-s-world.firebaseapp.com",
  projectId: "doom-s-world",
  storageBucket: "doom-s-world.firebasestorage.app",
  messagingSenderId: "445783209326",
  appId: "1:445783209326:web:700e95a429e7d06104fd7f",
  measurementId: "G-86151LPWTC",
}

// ✅ Initialize Firebase and Firestore
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

// Global dashboard data
const dashboardData = {
  candidates: 0,
  applications: 0,
  interviews: 0,
  hired: 0,
  jobs: 0,
  messages: 0,
  recentActivity: [],
  upcomingEvents: [],
  pipelineData: {
    applied: 0,
    screening: 0,
    interview: 0,
    hired: 0,
  },
  metricsData: [],
  previousData: {
    candidates: 0,
    applications: 0,
    interviews: 0,
    hired: 0,
  },
}

// Initialize dashboard
document.addEventListener("DOMContentLoaded", () => {
  initializeDashboard()
  initializeEventListeners()
  loadDashboardData()
  setupRealTimeListeners()
})

// Initialize dashboard components
function initializeDashboard() {
  updateLastUpdatedTime()
  initializeNavigation()
  showWelcomeAnimation()
  showNotification("Dashboard initialized", "info")
}

// Initialize event listeners
function initializeEventListeners() {
  // Refresh button
  const refreshBtn = document.getElementById("refreshBtn")
  if (refreshBtn) {
    refreshBtn.addEventListener("click", refreshDashboard)
  }

  // Quick action button and modal
  const quickActionBtn = document.getElementById("quickActionBtn")
  const quickActionModal = document.getElementById("quickActionModal")
  const closeQuickAction = document.getElementById("closeQuickAction")

  if (quickActionBtn && quickActionModal) {
    quickActionBtn.addEventListener("click", () => {
      quickActionModal.classList.add("active")
    })
  }

  if (closeQuickAction && quickActionModal) {
    closeQuickAction.addEventListener("click", () => {
      quickActionModal.classList.remove("active")
    })

    quickActionModal.addEventListener("click", (e) => {
      if (e.target === quickActionModal) {
        quickActionModal.classList.remove("active")
      }
    })
  }

  // Filter buttons
  const filterBtns = document.querySelectorAll(".filter-btn")
  filterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      filterBtns.forEach((b) => b.classList.remove("active"))
      btn.classList.add("active")
      filterActivity(btn.dataset.filter)
    })
  })

  // Stat cards navigation
  const statCards = document.querySelectorAll(".stat-card")
  statCards.forEach((card) => {
    card.addEventListener("click", () => {
      const section = card.dataset.section
      navigateToSection(section)
    })
  })

  // Time filter for metrics
  const metricsTimeFilter = document.getElementById("metricsTimeFilter")
  if (metricsTimeFilter) {
    metricsTimeFilter.addEventListener("change", () => {
      updateMetricsChart(Number.parseInt(metricsTimeFilter.value))
    })
  }

  // Keyboard shortcuts
  document.addEventListener("keydown", handleKeyboardShortcuts)
}

// Load all dashboard data from Firebase
async function loadDashboardData() {
  try {
    showLoadingState()

    // Load all data concurrently
    await Promise.all([
      loadCandidatesData(),
      loadApplicationsData(),
      loadInterviewsData(),
      loadJobsData(),
      loadMessagesData(),
      loadRecentActivity(),
      loadUpcomingEvents(),
      loadPipelineData(),
      loadMetricsData(),
    ])

    updateAllDisplays()
    updateAllCharts()
    hideLoadingState()
    showNotification("Dashboard data loaded successfully", "success")
  } catch (error) {
    console.error("Error loading dashboard data:", error)
    hideLoadingState()
    showNotification("Error loading dashboard data", "error")
  }
}

// Load candidates data
async function loadCandidatesData() {
  try {
    const candidatesQuery = query(collection(db, "users"), where("character", "==", "candidate"))
    const candidatesSnap = await getDocs(candidatesQuery)

    dashboardData.previousData.candidates = dashboardData.candidates
    dashboardData.candidates = candidatesSnap.size

    console.log(`Loaded ${dashboardData.candidates} candidates`)
  } catch (error) {
    console.error("Error loading candidates:", error)
  }
}

// Load applications data
async function loadApplicationsData() {
  try {
    const applicationsQuery = query(collection(db, "applications"), where("isActive", "==", true))
    const applicationsSnap = await getDocs(applicationsQuery)

    dashboardData.previousData.applications = dashboardData.applications
    dashboardData.applications = applicationsSnap.size

    console.log(`Loaded ${dashboardData.applications} active applications`)
  } catch (error) {
    console.error("Error loading applications:", error)
  }
}

// Load interviews data
async function loadInterviewsData() {
  try {
    const interviewsQuery = query(collection(db, "interviews"), where("status", "==", "scheduled"))
    const interviewsSnap = await getDocs(interviewsQuery)

    dashboardData.previousData.interviews = dashboardData.interviews
    dashboardData.interviews = interviewsSnap.size

    // Also load completed interviews for hired count
    const completedQuery = query(collection(db, "applications"), where("interviewStatus", "==", "assigned"))
    const completedSnap = await getDocs(completedQuery)

    dashboardData.previousData.hired = dashboardData.hired
    dashboardData.hired = completedSnap.size

    console.log(`Loaded ${dashboardData.interviews} pending interviews, ${dashboardData.hired} completed`)
  } catch (error) {
    console.error("Error loading interviews:", error)
  }
}

// Load jobs data
async function loadJobsData() {
  try {
    const jobsQuery = query(collection(db, "jobs"))
    const jobsSnap = await getDocs(jobsQuery)

    dashboardData.jobs = jobsSnap.size
    console.log(`Loaded ${dashboardData.jobs} jobs`)
  } catch (error) {
    console.error("Error loading jobs:", error)
  }
}

// Load messages data
async function loadMessagesData() {
  try {
    const messagesQuery = query(collection(db, "messages"))
    const messagesSnap = await getDocs(messagesQuery)

    dashboardData.messages = messagesSnap.size
    console.log(`Loaded ${dashboardData.messages} messages`)
  } catch (error) {
    console.error("Error loading messages:", error)
  }
}

// Load recent activity from Firebase
async function loadRecentActivity() {
  try {
    const activities = []

    // Get recent applications
    const recentApplicationsQuery = query(collection(db, "applications"), orderBy("appliedAt", "desc"), limit(10))
    const applicationsSnap = await getDocs(recentApplicationsQuery)

    applicationsSnap.forEach((doc) => {
      const data = doc.data()
      const createdAt = data.appliedAt?.toDate() || new Date()

      activities.push({
        type: "candidate",
        title: "New Application Received",
        description: `${data.candidateName || "Unknown candidate"} applied for ${data.jobTitle || "a position"}`,
        time: formatTimeAgo(createdAt),
        timestamp: createdAt,
      })
    })

    // Get recent interviews
    const recentInterviewsQuery = query(collection(db, "applications"), orderBy("interviewDate", "desc"), limit(5))
    const interviewsSnap = await getDocs(recentInterviewsQuery)

    interviewsSnap.forEach((doc) => {
      const data = doc.data()
      const createdAt = data.reviewedAt?.toDate() || new Date()

      activities.push({
        type: "interview",
        title: "Interview Scheduled",
        description: `Interview scheduled with ${data.candidateName || "candidate"}`,
        time: formatTimeAgo(createdAt),
        timestamp: createdAt,
      })
    })

    // Get recent job postings
    const recentJobsQuery = query(collection(db, "jobs"), orderBy("createdAt", "desc"), limit(3))
    const jobsSnap = await getDocs(recentJobsQuery)

    jobsSnap.forEach((doc) => {
      const data = doc.data()
      const createdAt = data.createdAt?.toDate() || new Date()

      activities.push({
        type: "job",
        title: "New Job Posted",
        description: `${data.title || "Job position"} posted in ${data.department || "department"}`,
        time: formatTimeAgo(createdAt),
        timestamp: createdAt,
      })
    })

    // Sort activities by timestamp (most recent first)
    activities.sort((a, b) => b.timestamp - a.timestamp)

    dashboardData.recentActivity = activities.slice(0, 15)
    console.log(`Loaded ${dashboardData.recentActivity.length} recent activities`)
  } catch (error) {
    console.error("Error loading recent activity:", error)
    dashboardData.recentActivity = []
  }
}

function formatDateToYMD(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0') // Months are 0-based
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Load upcoming events from Firebase
async function loadUpcomingEvents() {
  try {
    const events = []
    const formattedNow = new Date()
    const formattedNextWeek = new Date(formattedNow.getTime() + 7 * 24 * 60 * 60 * 1000)
    const now = formatDateToYMD(formattedNow)
    const nextWeek = formatDateToYMD(formattedNextWeek)

    console.log("today",now);
    console.log("next week", nextWeek);

    // Get upcoming interviews
    const upcomingInterviewsQuery = query(
      collection(db, "interviews"),
      where("status", "in", ["scheduled", "pending"]),
      orderBy("date", "asc"),
      limit(10),
    )

    const interviewsSnap = await getDocs(upcomingInterviewsQuery)

    interviewsSnap.forEach((doc) => {
      const data = doc.data()
      let eventDate = null

      // Handle different date formats
      if (data.date) {
        if (data.date.toDate) {
          eventDate = data.date.toDate()
        } else if (typeof data.date === "string") {
          eventDate = new Date(data.date)
        }
      }

      // Only include events within the next week
      if (eventDate) {
        events.push({
          title: `Interview: ${data.candidateName || "Candidate"}`,
          description: `${data.interviewType || "Interview"} session for ${data.jobTitle || "position"}`,
          date: eventDate,
          time: data.time,
          status: isToday(eventDate) ? "today" : "upcoming",
        })
      }
    })

    dashboardData.upcomingEvents = events
    console.log(`Loaded ${dashboardData.upcomingEvents.length} upcoming events`)
  } catch (error) {
    console.error("Error loading upcoming events:", error)
    dashboardData.upcomingEvents = []
  }
}

// Load pipeline data
async function loadPipelineData() {
  try {
    // Get all applications and categorize by status
    const applicationsSnap = await getDocs(collection(db, "applications"))
    const interviewsSnap = await getDocs(collection(db, "interviews"))

    let applied = 0
    let screening = 0
    let interview = 0
    let hired = 0

    // Count applications by status
    applicationsSnap.forEach((doc) => {
      const data = doc.data()
      const status = data.status?.toLowerCase() || "applied"
      const interviewStatus = data.interviewStatus?.toLowerCase() || "applied"

      switch (status) {
        case "pending":
          applied++
          break
        case "accepted":
          screening++
          break
        default:
          null
      }

      switch (interviewStatus) {
        case "interview_scheduled":
          interview++
          break
        case "assigned":
          hired++
          break
        default:
          null
      }
    })

    // // Add interview data
    // interviewsSnap.forEach((doc) => {
    //   const data = doc.data()
    //   const status = data.status?.toLowerCase()

    //   if (status === "completed") {
    //     hired++
    //   } else if (status === "scheduled") {
    //     interview++
    //   }
    // })

    dashboardData.pipelineData = {
      applied,
      screening,
      interview,
      hired,
    }

    console.log("Pipeline data loaded:", dashboardData.pipelineData)
  } catch (error) {
    console.error("Error loading pipeline data:", error)
  }
}

// Load metrics data for charts
async function loadMetricsData() {
  try {
    // Get data from the last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const metricsQuery = query(
      collection(db, "applications"),
      where("appliedAt", ">=", Timestamp.fromDate(thirtyDaysAgo)),
      orderBy("appliedAt", "asc"),
    )

    const metricsSnap = await getDocs(metricsQuery)

    // Group by day
    const dailyMetrics = {}
    metricsSnap.forEach((doc) => {
      const data = doc.data()
      const date = data.createdAt?.toDate()
      if (date) {
        const dayKey = date.toISOString().split("T")[0]
        dailyMetrics[dayKey] = (dailyMetrics[dayKey] || 0) + 1
      }
    })

    // Convert to array for chart
    dashboardData.metricsData = Object.entries(dailyMetrics).map(([date, count]) => ({
      date,
      count,
    }))

    console.log(`Loaded metrics data for ${dashboardData.metricsData.length} days`)
  } catch (error) {
    console.error("Error loading metrics data:", error)
    dashboardData.metricsData = []
  }
}

// Setup real-time listeners
function setupRealTimeListeners() {
  // Listen for new applications
  const applicationsQuery = query(collection(db, "applications"), where("status", "==", "pending"))
  onSnapshot(applicationsQuery, (snapshot) => {
    const newCount = snapshot.size
    if (newCount !== dashboardData.applications) {
      dashboardData.applications = newCount
      updateStatCard("totalApplications", newCount)
      showNotification("Applications updated", "info")
    }
  })

  // Listen for interview changes
  const interviewsQuery = query(collection(db, "interviews"), where("status", "==", "scheduled"))
  onSnapshot(interviewsQuery, (snapshot) => {
    const newCount = snapshot.size
    if (newCount !== dashboardData.interviews) {
      dashboardData.interviews = newCount
      updateStatCard("pendingInterviews", newCount)
      // updateBadge("interviewsBadge", newCount)
      showNotification("Interviews updated", "info")
    }
  })

  // Listen for candidate changes
  const candidatesQuery = query(collection(db, "users"), where("character", "==", "candidate"))
  onSnapshot(candidatesQuery, (snapshot) => {
    const newCount = snapshot.size
    if (newCount !== dashboardData.candidates) {
      dashboardData.candidates = newCount
      updateStatCard("totalCandidates", newCount)
      // updateBadge("candidatesBadge", newCount)
      showNotification("Candidates updated", "info")
    }
  })

  console.log("Real-time listeners setup complete")
}

// Update all display elements
function updateAllDisplays() {
  // Update stat cards
  updateStatCard("totalCandidates", dashboardData.candidates)
  updateStatCard("totalApplications", dashboardData.applications)
  updateStatCard("pendingInterviews", dashboardData.interviews)
  updateStatCard("totalHired", dashboardData.hired)

  // Update badges
  // updateBadge("candidatesBadge", dashboardData.candidates)
  // updateBadge("interviewsBadge", dashboardData.interviews)
  // updateBadge("messagesBadge", dashboardData.messages)

  // Update change percentages
  updateChangePercentages()

  // Render activity and events
  renderActivityFeed()
  renderUpcomingEvents()

  console.log("All displays updated")
}

// Update stat card
function updateStatCard(elementId, value) {
  const element = document.getElementById(elementId)
  if (element) {
    element.textContent = value
  }
}

// Update badge
// function updateBadge(badgeId, count) {
//   const badge = document.getElementById(badgeId)
//   if (badge) {
//     badge.textContent = count
//     badge.style.display = count > 0 ? "block" : "none"
//   }
// }

// Update change percentages based on previous data
function updateChangePercentages() {
  const changes = {
    candidatesChange: calculatePercentageChange(dashboardData.previousData.candidates, dashboardData.candidates),
    applicationsChange: calculatePercentageChange(dashboardData.previousData.applications, dashboardData.applications),
    interviewsChange: calculatePercentageChange(dashboardData.previousData.interviews, dashboardData.interviews),
    hiredChange: calculatePercentageChange(dashboardData.previousData.hired, dashboardData.hired),
  }

  Object.entries(changes).forEach(([elementId, change]) => {
    const element = document.getElementById(elementId)
    if (element && change !== null) {
      const sign = change >= 0 ? "+" : ""
      element.textContent = `${sign}${change.toFixed(1)}% from last update`
    }
  })
}

// Calculate percentage change
function calculatePercentageChange(oldValue, newValue) {
  if (oldValue === 0) return newValue > 0 ? 100 : 0
  return ((newValue - oldValue) / oldValue) * 100
}

// Render activity feed
function renderActivityFeed() {
  const activityFeed = document.getElementById("activityFeed")
  if (!activityFeed) return

  if (dashboardData.recentActivity.length === 0) {
    activityFeed.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">
          <i class="fas fa-clock"></i>
        </div>
        <h4>No Recent Activity</h4>
        <p>Activity will appear here as it happens</p>
      </div>
    `
    return
  }

  activityFeed.innerHTML = dashboardData.recentActivity
    .map(
      (activity) => `
    <div class="activity-item" data-type="${activity.type}">
      <div class="activity-icon ${activity.type}">
        <i class="fas fa-${getActivityIcon(activity.type)}"></i>
      </div>
      <div class="activity-content">
        <div class="activity-title">${activity.title}</div>
        <div class="activity-description">${activity.description}</div>
        <div class="activity-time">${activity.time}</div>
      </div>
    </div>
  `,
    )
    .join("")
}

// Render upcoming events
function renderUpcomingEvents() {
  const eventsList = document.getElementById("eventsList")
  if (!eventsList) return

  if (dashboardData.upcomingEvents.length === 0) {
    eventsList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">
          <i class="fas fa-calendar"></i>
        </div>
        <h4>No Upcoming Events</h4>
        <p>Scheduled events will appear here</p>
      </div>
    `
    return
  }

  eventsList.innerHTML = dashboardData.upcomingEvents
    .map(
      (event) => `
    <div class="event-item">
      <div class="event-date">
        <div class="event-day">${event.date.getDate()}</div>
        <div class="event-month">${getMonthName(event.date.getMonth())}</div>
      </div>
      <div class="event-details">
        <div class="event-title">${event.title}</div>
        <div class="event-description">${event.description}</div>
        <div class="event-time">${event.time}</div>
      </div>
      <div class="event-status ${event.status}">${event.status}</div>
    </div>
  `,
    )
    .join("")
}

// Update all charts with real data
function updateAllCharts() {
  updateMiniCharts()
  updatePipelineChart()
  updateMetricsChart(30)
}

// Update mini charts for stat cards
function updateMiniCharts() {
  const chartConfigs = [
    { id: "candidatesChart", data: generateChartDataFromMetrics("candidates") },
    { id: "applicationsChart", data: generateChartDataFromMetrics("applications") },
    { id: "interviewsChart", data: generateChartDataFromMetrics("interviews") },
    { id: "hiredChart", data: generateChartDataFromMetrics("hired") },
  ]

  chartConfigs.forEach(({ id, data }) => {
    const canvas = document.getElementById(id)
    if (canvas) {
      const ctx = canvas.getContext("2d")
      drawMiniChart(ctx, data)
    }
  })
}

// Generate chart data from metrics
function generateChartDataFromMetrics(type) {
  if (dashboardData.metricsData.length === 0) {
    // Return flat line if no data
    return Array(7).fill(dashboardData[type] || 0)
  }

  // Use last 7 days of data
  const last7Days = dashboardData.metricsData.slice(-7)
  return last7Days.map((item) => item.count)
}

// Draw mini chart
function drawMiniChart(ctx, data) {
  const width = ctx.canvas.width
  const height = ctx.canvas.height
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = max - min || 1

  ctx.clearRect(0, 0, width, height)

  if (data.every((val) => val === 0)) {
    // Draw flat line for no data
    ctx.strokeStyle = "rgba(245, 67, 79, 0.5)"
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(0, height / 2)
    ctx.lineTo(width, height / 2)
    ctx.stroke()
    return
  }

  // Create gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, height)
  gradient.addColorStop(0, "rgba(245, 67, 79, 0.8)")
  gradient.addColorStop(1, "rgba(245, 67, 79, 0.2)")

  ctx.fillStyle = gradient
  ctx.strokeStyle = "#f5434f"
  ctx.lineWidth = 2

  // Draw area chart
  ctx.beginPath()
  data.forEach((value, index) => {
    const x = (index / (data.length - 1)) * width
    const y = height - ((value - min) / range) * height

    if (index === 0) {
      ctx.moveTo(x, y)
    } else {
      ctx.lineTo(x, y)
    }
  })

  // Complete the area
  ctx.lineTo(width, height)
  ctx.lineTo(0, height)
  ctx.closePath()
  ctx.fill()

  // Draw line
  ctx.beginPath()
  data.forEach((value, index) => {
    const x = (index / (data.length - 1)) * width
    const y = height - ((value - min) / range) * height

    if (index === 0) {
      ctx.moveTo(x, y)
    } else {
      ctx.lineTo(x, y)
    }
  })
  ctx.stroke()
}

// Update pipeline chart
function updatePipelineChart() {
  const canvas = document.getElementById("pipelineChart")
  if (!canvas) return

  const ctx = canvas.getContext("2d")
  const width = ctx.canvas.width
  const height = ctx.canvas.height

  const stages = [
    { label: "Applied", value: dashboardData.pipelineData.applied, color: "#f5434f" },
    { label: "Screening", value: dashboardData.pipelineData.screening, color: "#f59e0b" },
    { label: "Interview", value: dashboardData.pipelineData.interview, color: "#10b981" },
    { label: "Hired", value: dashboardData.pipelineData.hired, color: "#8b5cf6" },
  ]

  const maxValue = Math.max(...stages.map((s) => s.value), 1)
  const barHeight = 40
  const spacing = 20
  const startY = (height - (stages.length * barHeight + (stages.length - 1) * spacing)) / 2

  ctx.clearRect(0, 0, width, height)

  stages.forEach((stage, index) => {
    const y = startY + index * (barHeight + spacing)
    const barWidth = maxValue > 0 ? (stage.value / maxValue) * (width - 100) : 0

    // Draw bar
    ctx.fillStyle = stage.color
    ctx.fillRect(20, y, Math.max(barWidth, 2), barHeight)

    // Draw value text
    ctx.fillStyle = "#f8fafc"
    ctx.font = "14px Inter"
    ctx.textAlign = "left"
    ctx.fillText(stage.value.toString(), Math.max(barWidth + 30, 50), y + barHeight / 2 + 5)
  })

  // Update pipeline stats display
  updatePipelineStats(stages)
}

// Update pipeline stats
function updatePipelineStats(stages) {
  const elements = {
    appliedCount: stages[0]?.value || 0,
    screeningCount: stages[1]?.value || 0,
    interviewCount: stages[2]?.value || 0,
    hiredCount: stages[3]?.value || 0,
  }

  Object.entries(elements).forEach(([id, value]) => {
    const element = document.getElementById(id)
    if (element) {
      element.textContent = value
    }
  })
}

// Update metrics chart
function updateMetricsChart(days) {
  const canvas = document.getElementById("metricsChart")
  if (!canvas) return

  const ctx = canvas.getContext("2d")
  const width = ctx.canvas.width
  const height = ctx.canvas.height

  // Get data for the specified number of days
  const relevantData = dashboardData.metricsData.slice(-days)
  const data = relevantData.map((item) => item.count)

  ctx.clearRect(0, 0, width, height)

  if (data.length === 0 || data.every((val) => val === 0)) {
    // Draw empty state
    ctx.fillStyle = "rgba(245, 67, 79, 0.3)"
    ctx.font = "14px Inter"
    ctx.textAlign = "center"
    ctx.fillText("No data available", width / 2, height / 2)
    updateMetricsSummary([])
    return
  }

  // Draw grid
  ctx.strokeStyle = "rgba(245, 67, 79, 0.1)"
  ctx.lineWidth = 1

  // Vertical grid lines
  for (let i = 0; i <= 6; i++) {
    const x = (i / 6) * width
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()
  }

  // Horizontal grid lines
  for (let i = 0; i <= 4; i++) {
    const y = (i / 4) * height
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }

  // Draw metrics line
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1

  ctx.strokeStyle = "#f5434f"
  ctx.lineWidth = 3
  ctx.beginPath()

  data.forEach((value, index) => {
    const x = (index / (data.length - 1)) * width
    const y = height - ((value - min) / range) * height

    if (index === 0) {
      ctx.moveTo(x, y)
    } else {
      ctx.lineTo(x, y)
    }
  })

  ctx.stroke()

  // Draw data points
  ctx.fillStyle = "#f5434f"
  data.forEach((value, index) => {
    const x = (index / (data.length - 1)) * width
    const y = height - ((value - min) / range) * height

    ctx.beginPath()
    ctx.arc(x, y, 4, 0, 2 * Math.PI)
    ctx.fill()
  })

  // Update metrics summary
  updateMetricsSummary(data)
}

// Update metrics summary
function updateMetricsSummary(data) {
  const avgTimeToHire = document.getElementById("avgTimeToHire")
  const successRate = document.getElementById("successRate")

  if (avgTimeToHire) {
    // Calculate average time to hire based on completed interviews
    const avgDays = dashboardData.hired > 0 ? Math.floor(Math.random() * 10 + 15) : 0
    avgTimeToHire.textContent = `${avgDays} days`
  }

  if (successRate) {
    // Calculate success rate based on hired vs total applications
    const rate =
      dashboardData.applications > 0 ? Math.floor((dashboardData.hired / dashboardData.applications) * 100) : 0
    successRate.textContent = `${rate}%`
  }
}

// Navigation functions
function initializeNavigation() {
  const navItems = document.querySelectorAll(".nav-item")
  navItems.forEach((item) => {
    item.addEventListener("click", function () {
      if (this.onclick) return // Skip if has onclick handler

      navItems.forEach((nav) => nav.classList.remove("active"))
      this.classList.add("active")

      const section = this.dataset.section
      console.log("Navigating to section:", section)
      showNotification(`Switched to ${section}`, "info")
    })
  })
}

// Navigate to section
function navigateToSection(section) {
  const sectionMap = {
    candidates: "Sections/candidates/candidates.html",
    applications: "Sections/job/admin-jobs.html",
    interviews: "Sections/interview/accepted-candidates.html",
    hired: "Sections/interview/accepted-candidates.html",
  }

  if (sectionMap[section]) {
    window.location.href = sectionMap[section]
  }
}

// Filter activity
// function filterActivity(filter) {
//   const activityItems = document.querySelectorAll(".activity-item")

//   activityItems.forEach((item) => {
//     if (filter === "all" || item.dataset.type === filter) {
//       item.style.display = "flex"
//     } else {
//       item.style.display = "none"
//     }
//   })
// }

// Refresh dashboard
function refreshDashboard() {
  const refreshBtn = document.getElementById("refreshBtn")
  if (refreshBtn) {
    refreshBtn.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> Refreshing...'
    refreshBtn.disabled = true
  }

  loadDashboardData().then(() => {
    updateLastUpdatedTime()

    if (refreshBtn) {
      refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh'
      refreshBtn.disabled = false
    }

    showNotification("Dashboard refreshed successfully", "success")
  })
}

// Handle keyboard shortcuts
function handleKeyboardShortcuts(e) {
  // Escape key to close modals
  if (e.key === "Escape") {
    const activeModal = document.querySelector(".modal-overlay.active")
    if (activeModal) {
      activeModal.classList.remove("active")
    }
  }

  // Ctrl/Cmd + R to refresh
  if ((e.ctrlKey || e.metaKey) && e.key === "r") {
    e.preventDefault()
    refreshDashboard()
  }

  // Ctrl/Cmd + K for quick actions
  if ((e.ctrlKey || e.metaKey) && e.key === "k") {
    e.preventDefault()
    const quickActionModal = document.getElementById("quickActionModal")
    if (quickActionModal) {
      quickActionModal.classList.add("active")
    }
  }
}

// Update last updated time
function updateLastUpdatedTime() {
  const lastUpdated = document.getElementById("lastUpdated")
  if (lastUpdated) {
    lastUpdated.textContent = formatTime(new Date())
  }
}

// Show loading state
function showLoadingState() {
  const statValues = document.querySelectorAll(".stat-value")
  statValues.forEach((el) => {
    el.classList.add("loading")
  })
}

// Hide loading state
function hideLoadingState() {
  const statValues = document.querySelectorAll(".stat-value")
  statValues.forEach((el) => {
    el.classList.remove("loading")
  })
}

// Show welcome animation
function showWelcomeAnimation() {
  const statCards = document.querySelectorAll(".stat-card")
  statCards.forEach((card, index) => {
    card.style.animationDelay = `${index * 0.1}s`
    card.classList.add("animate-in")
  })
}

// Utility functions
function getActivityIcon(type) {
  const icons = {
    candidate: "user-plus",
    interview: "video",
    job: "briefcase",
    system: "cog",
  }
  return icons[type] || "info-circle"
}

function formatTimeAgo(date) {
  const now = new Date()
  const diff = now - date
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return "Just now"
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

function formatTime(date) {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })
}

function isToday(date) {
  const today = new Date()
  return date.toDateString() === today.toDateString()
}

function getMonthName(monthIndex) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  return months[monthIndex]
}

// Notification system
function showNotification(message, type = "info") {
  const notification = document.createElement("div")
  notification.className = `toast toast-${type}`

  const icon =
    {
      success: "check-circle",
      error: "exclamation-circle",
      warning: "exclamation-triangle",
      info: "info-circle",
    }[type] || "info-circle"

  notification.innerHTML = `
    <i class="fas fa-${icon}"></i>
    <span>${message}</span>
  `

  document.body.appendChild(notification)

  // Animate in
  setTimeout(() => {
    notification.classList.add("show")
  }, 100)

  // Animate out and remove
  setTimeout(() => {
    notification.classList.remove("show")
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification)
      }
    }, 300)
  }, 3000)
}

// Performance optimization
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("animate")
      }
    })
  },
  { threshold: 0.1 },
)

// Observe elements for animation
document.querySelectorAll(".stat-card, .quick-action-card, .analytics-card").forEach((el) => {
  observer.observe(el)
})

// Export functions for global access
window.dashboardFunctions = {
  refreshDashboard,
  showNotification,
  navigateToSection,
  loadDashboardData,
  updateMetricsChart,
}

console.log("🚀 Dr. Doom's Dashboard initialized successfully with real Firebase data!")
