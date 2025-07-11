// Professional Admin Dashboard JavaScript

// Sample candidate data with enhanced information
const candidates = [
    {
      name: "Stephen Strange",
      position: "Senior Surgeon",
      experience: "15 years",
      skills: ["Surgery", "Medical Research", "Mystical Arts", "Leadership"],
      education: "Harvard Medical School",
      score: 94,
      email: "stephen@sanctum.com",
      phone: "+1 (555) 123-4567",
      location: "New York, NY",
      summary: "Exceptional surgeon with groundbreaking research in neurosurgery and alternative medicine approaches.",
    },
    {
      name: "Natasha Romanoff",
      position: "Security Specialist",
      experience: "12 years",
      skills: ["Security", "Intelligence", "Combat Training", "Risk Assessment"],
      education: "Red Room Academy",
      score: 89,
      email: "natasha@shield.gov",
      phone: "+1 (555) 234-5678",
      location: "Washington, DC",
      summary: "Elite security professional with extensive experience in threat assessment and crisis management.",
    },
    {
      name: "Scott Lang",
      position: "Systems Engineer",
      experience: "8 years",
      skills: ["Engineering", "Electronics", "Problem Solving", "Innovation"],
      education: "MIT",
      score: 82,
      email: "scott@antman.tech",
      phone: "+1 (555) 345-6789",
      location: "San Francisco, CA",
      summary: "Creative engineer specializing in miniaturization technology and quantum mechanics applications.",
    },
    {
      name: "Wanda Maximoff",
      position: "Research Analyst",
      experience: "6 years",
      skills: ["Data Analysis", "Research", "Psychology", "Pattern Recognition"],
      education: "University of Sokovia",
      score: 87,
      email: "wanda@research.eu",
      phone: "+1 (555) 456-7890",
      location: "Westview, NJ",
      summary: "Brilliant analyst with unique insights into human behavior and complex data patterns.",
    },
    {
      name: "Sam Wilson",
      position: "Project Manager",
      experience: "10 years",
      skills: ["Leadership", "Project Management", "Aviation", "Team Building"],
      education: "Air Force Academy",
      score: 91,
      email: "sam@falcon.mil",
      phone: "+1 (555) 567-8901",
      location: "Washington, DC",
      summary: "Experienced project manager with military precision and exceptional team leadership skills.",
    },
  ]
  
  // Global variables
  let currentCandidateIndex = 0
  const swipeContainer = document.getElementById("swipeContainer")
  let isDragging = false
  let startX = 0
  let currentX = 0
  const initialTransform = 0
  
  // Initialize the application
  document.addEventListener("DOMContentLoaded", () => {
    initializeCandidates()
    initializeNavigation()
    initializeSearch()
    initializeAnimations()
    initializeMobileMenu()
  })
  
  // Initialize candidates in swipe container
  function initializeCandidates() {
    if (!swipeContainer) return
  
    swipeContainer.innerHTML = ""
    candidates.forEach((candidate, index) => {
      const card = createCandidateCard(candidate, index)
      swipeContainer.appendChild(card)
    })
    updateCandidateCount()
    initializeSwipeEvents()
  }
  
  // Create enhanced candidate card
  function createCandidateCard(candidate, index) {
    const card = document.createElement("div")
    card.className = "candidate-card"
    card.style.zIndex = candidates.length - index
    card.innerHTML = `
          <div class="candidate-info">
              <div class="candidate-avatar">${candidate.name
                .split(" ")
                .map((n) => n[0])
                .join("")}</div>
              <div class="candidate-details">
                  <h3>${candidate.name}</h3>
                  <p><strong>Position:</strong> ${candidate.position}</p>
                  <p><strong>Experience:</strong> ${candidate.experience}</p>
                  <p><strong>Education:</strong> ${candidate.education}</p>
                  <p><strong>Location:</strong> ${candidate.location}</p>
                  <p><strong>Email:</strong> ${candidate.email}</p>
                  <p><strong>Phone:</strong> ${candidate.phone}</p>
              </div>
          </div>
          <div style="margin: 1rem 0;">
              <h4 style="color: var(--text-primary); margin-bottom: 0.5rem; font-size: 0.875rem;">Skills</h4>
              <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                  ${candidate.skills
                    .map(
                      (skill) => `
                      <span style="background: var(--bg-glass); color: var(--text-secondary); padding: 0.25rem 0.5rem; border-radius: 6px; font-size: 0.75rem; border: 1px solid var(--border-primary);">
                          ${skill}
                      </span>
                  `,
                    )
                    .join("")}
              </div>
          </div>
          <div style="margin-top: 1rem; padding: 1rem; background: var(--bg-glass); border-radius: 10px; border: 1px solid var(--border-primary);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                  <h4 style="color: var(--text-primary); margin: 0; font-size: 0.875rem;">Assessment Score</h4>
                  <span style="color: var(--primary-400); font-weight: 700; font-size: 1.25rem;">${candidate.score}/100</span>
              </div>
              <div style="width: 100%; height: 6px; background: var(--bg-tertiary); border-radius: 3px; overflow: hidden; margin-bottom: 0.75rem;">
                  <div style="width: ${candidate.score}%; height: 100%; background: var(--gradient-success); border-radius: 3px; transition: width 0.3s ease;"></div>
              </div>
              <p style="color: var(--text-secondary); font-size: 0.875rem; margin: 0; line-height: 1.4;">
                  ${candidate.summary}
              </p>
              <div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid var(--border-secondary);">
                  <p style="color: var(--text-muted); font-size: 0.75rem; margin: 0;">
                      ${
                        candidate.score > 90
                          ? "🌟 Exceptional candidate - Highly recommended for immediate interview"
                          : candidate.score > 80
                            ? "✅ Strong candidate - Consider for interview phase"
                            : "⚠️ Average candidate - May need additional evaluation"
                      }
                  </p>
              </div>
          </div>
      `
    return card
  }
  
  // Update candidate count display
  function updateCandidateCount() {
    const countElement = document.getElementById("candidateCount")
    if (countElement) {
      countElement.textContent = Math.max(0, candidates.length - currentCandidateIndex)
    }
  }
  
  // Initialize swipe events
  function initializeSwipeEvents() {
    if (!swipeContainer) return
  
    // Mouse events
    swipeContainer.addEventListener("mousedown", handleStart)
    swipeContainer.addEventListener("mousemove", handleMove)
    swipeContainer.addEventListener("mouseup", handleEnd)
    swipeContainer.addEventListener("mouseleave", handleEnd)
  
    // Touch events
    swipeContainer.addEventListener("touchstart", handleStart, { passive: false })
    swipeContainer.addEventListener("touchmove", handleMove, { passive: false })
    swipeContainer.addEventListener("touchend", handleEnd)
  }
  
  // Handle swipe start
  function handleStart(e) {
    if (currentCandidateIndex >= candidates.length) return
  
    isDragging = true
    startX = e.type === "mousedown" ? e.clientX : e.touches[0].clientX
  
    const topCard = swipeContainer.children[currentCandidateIndex]
    if (topCard) {
      topCard.classList.add("swiping")
      topCard.style.transition = "none"
    }
  }
  
  // Handle swipe move
  function handleMove(e) {
    if (!isDragging || currentCandidateIndex >= candidates.length) return
  
    e.preventDefault()
    currentX = e.type === "mousemove" ? e.clientX : e.touches[0].clientX
    const diffX = currentX - startX
  
    const topCard = swipeContainer.children[currentCandidateIndex]
    if (topCard) {
      const rotation = diffX * 0.1
      const opacity = Math.max(0.3, 1 - Math.abs(diffX) / 300)
  
      topCard.style.transform = `translateX(${diffX}px) rotate(${rotation}deg)`
      topCard.style.opacity = opacity
  
      // Add visual feedback
      if (diffX > 50) {
        topCard.style.borderColor = "var(--accent-green)"
      } else if (diffX < -50) {
        topCard.style.borderColor = "var(--accent-red)"
      } else {
        topCard.style.borderColor = "var(--border-primary)"
      }
    }
  }
  
  // Handle swipe end
  function handleEnd(e) {
    if (!isDragging || currentCandidateIndex >= candidates.length) return
  
    isDragging = false
    const diffX = currentX - startX
    const topCard = swipeContainer.children[currentCandidateIndex]
  
    if (topCard) {
      topCard.classList.remove("swiping")
      topCard.style.transition = "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
      topCard.style.borderColor = "var(--border-primary)"
  
      if (Math.abs(diffX) > 100) {
        // Swipe threshold reached
        if (diffX > 0) {
          acceptCandidate()
        } else {
          rejectCandidate()
        }
      } else {
        // Snap back to center
        topCard.style.transform = "translateX(0) rotate(0deg)"
        topCard.style.opacity = "1"
      }
    }
  
    // Reset values
    startX = 0
    currentX = 0
  }
  
  // Candidate action functions
  function rejectCandidate() {
    if (currentCandidateIndex >= candidates.length) return
  
    const topCard = swipeContainer.children[currentCandidateIndex]
    if (topCard) {
      topCard.style.transform = "translateX(-100vw) rotate(-30deg)"
      topCard.style.opacity = "0"
  
      setTimeout(() => {
        removeTopCard()
        console.log("Rejected:", candidates[currentCandidateIndex - 1]?.name)
        showNotification("Candidate rejected", "error")
      }, 300)
    }
  }
  
  function likeCandidate() {
    if (currentCandidateIndex >= candidates.length) return
  
    const topCard = swipeContainer.children[currentCandidateIndex]
    if (topCard) {
      // Add like animation
      topCard.style.transform = "scale(1.05)"
      topCard.style.boxShadow = "0 0 30px rgba(245, 158, 11, 0.5)"
  
      setTimeout(() => {
        topCard.style.transform = "scale(1)"
        topCard.style.boxShadow = "var(--shadow-xl)"
      }, 200)
  
      console.log("Liked:", candidates[currentCandidateIndex]?.name)
      showNotification("Candidate liked", "warning")
    }
  }
  
  function acceptCandidate() {
    if (currentCandidateIndex >= candidates.length) return
  
    const topCard = swipeContainer.children[currentCandidateIndex]
    if (topCard) {
      topCard.style.transform = "translateX(100vw) rotate(30deg)"
      topCard.style.opacity = "0"
  
      setTimeout(() => {
        removeTopCard()
        console.log("Accepted:", candidates[currentCandidateIndex - 1]?.name)
        showNotification("Candidate accepted", "success")
      }, 300)
    }
  }
  
  // Remove top card and update index
  function removeTopCard() {
    if (currentCandidateIndex < candidates.length) {
      const topCard = swipeContainer.children[currentCandidateIndex]
      if (topCard) {
        topCard.remove()
        currentCandidateIndex++
        updateCandidateCount()
  
        if (currentCandidateIndex >= candidates.length) {
          showNoMoreCandidates()
        }
      }
    }
  }
  
  // Show no more candidates message
  function showNoMoreCandidates() {
    swipeContainer.innerHTML = `
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; text-align: center; padding: 2rem;">
              <div style="width: 80px; height: 80px; border-radius: 50%; background: var(--gradient-primary); display: flex; align-items: center; justify-content: center; margin-bottom: 1.5rem; box-shadow: var(--shadow-glow);">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                      <polyline points="20,6 9,17 4,12"></polyline>
                  </svg>
              </div>
              <h3 style="color: var(--text-primary); margin-bottom: 0.5rem; font-size: 1.25rem;">All Done!</h3>
              <p style="color: var(--text-secondary); margin-bottom: 2rem; max-width: 300px; line-height: 1.5;">
                  You've reviewed all available candidates. Great job on making those decisions!
              </p>
              <button onclick="resetCandidates()" style="padding: 0.75rem 1.5rem; background: var(--gradient-primary); color: white; border: none; border-radius: 10px; cursor: pointer; font-weight: 600; font-size: 0.875rem; transition: all 0.3s ease; box-shadow: var(--shadow-md);">
                  Load More Candidates
              </button>
          </div>
      `
  }
  
  // Reset candidates
  function resetCandidates() {
    currentCandidateIndex = 0
    initializeCandidates()
    showNotification("Candidates reloaded", "info")
  }
  
  // Initialize navigation
  function initializeNavigation() {
    const navItems = document.querySelectorAll(".nav-item")
    navItems.forEach((item) => {
      item.addEventListener("click", function () {
        // Remove active class from all items
        navItems.forEach((nav) => nav.classList.remove("active"))
        // Add active class to clicked item
        this.classList.add("active")
  
        const section = this.dataset.section
        console.log("Navigating to section:", section)
        showNotification(`Switched to ${section}`, "info")
      })
    })
  }
  
  // Initialize search functionality
  function initializeSearch() {
    const searchInput = document.querySelector(".search-input")
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        const query = e.target.value.toLowerCase()
        console.log("Searching for:", query)
        // Implement search logic here
      })
  
      searchInput.addEventListener("keypress", function (e) {
        if (e.key === "Enter") {
          e.preventDefault()
          console.log("Search submitted:", this.value)
          showNotification(`Searching for "${this.value}"`, "info")
        }
      })
    }
  }
  
  // Initialize animations
  function initializeAnimations() {
    // Animate stats cards on load
    const statCards = document.querySelectorAll(".stat-card")
    statCards.forEach((card, index) => {
      card.style.animationDelay = `${index * 0.1}s`
    })
  
    // Animate table rows
    const tableRows = document.querySelectorAll(".data-table tbody tr")
    tableRows.forEach((row, index) => {
      row.style.animationDelay = `${index * 0.05}s`
      row.style.animation = "slideInUp 0.6s ease-out forwards"
    })
  }
  
  // Initialize mobile menu
  function initializeMobileMenu() {
    const sidebarToggle = document.querySelector(".sidebar-toggle")
    const sidebar = document.querySelector(".sidebar")
  
    if (sidebarToggle && sidebar) {
      sidebarToggle.addEventListener("click", () => {
        sidebar.classList.toggle("open")
      })
  
      // Close sidebar when clicking outside
      document.addEventListener("click", (e) => {
        if (!sidebar.contains(e.target) && !sidebarToggle.contains(e.target)) {
          sidebar.classList.remove("open")
        }
      })
    }
  }
  
  // Notification system
  function showNotification(message, type = "info") {
    const notification = document.createElement("div")
    notification.className = `notification notification-${type}`
    notification.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          padding: 1rem 1.5rem;
          border-radius: 10px;
          color: white;
          font-weight: 500;
          font-size: 0.875rem;
          z-index: 10000;
          transform: translateX(100%);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: var(--shadow-xl);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
      `
  
    // Set background based on type
    switch (type) {
      case "success":
        notification.style.background = "var(--gradient-success)"
        break
      case "error":
        notification.style.background = "var(--gradient-danger)"
        break
      case "warning":
        notification.style.background = "var(--gradient-warning)"
        break
      default:
        notification.style.background = "var(--gradient-primary)"
    }
  
    notification.textContent = message
    document.body.appendChild(notification)
  
    // Animate in
    setTimeout(() => {
      notification.style.transform = "translateX(0)"
    }, 100)
  
    // Animate out and remove
    setTimeout(() => {
      notification.style.transform = "translateX(100%)"
      setTimeout(() => {
        document.body.removeChild(notification)
      }, 300)
    }, 3000)
  }
  
  // Utility functions
  function debounce(func, wait) {
    let timeout
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout)
        func(...args)
      }
      clearTimeout(timeout)
      timeout = setTimeout(later, wait)
    }
  }
  
  // Add smooth scrolling
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault()
      const target = document.querySelector(this.getAttribute("href"))
      if (target) {
        target.scrollIntoView({
          behavior: "smooth",
          block: "start",
        })
      }
    })
  })
  
  // Add keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    // Escape key to close mobile menu
    if (e.key === "Escape") {
      const sidebar = document.querySelector(".sidebar")
      if (sidebar) {
        sidebar.classList.remove("open")
      }
    }
  
    // Arrow keys for candidate navigation
    if (e.key === "ArrowLeft") {
      rejectCandidate()
    } else if (e.key === "ArrowRight") {
      acceptCandidate()
    } else if (e.key === "ArrowUp") {
      likeCandidate()
    }
  })
  
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
  document.querySelectorAll(".stat-card, .swipe-section, .data-section").forEach((el) => {
    observer.observe(el)
  })
  