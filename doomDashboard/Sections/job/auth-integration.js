// Integration script to connect job portal with existing authentication
// Include this script in both admin-jobs.html and candidate-jobs.html

// Function to get current user data from your existing system
function getCurrentUser() {
  // Modify this based on how your existing system stores user data

  // Option 1: From localStorage
//   const userData = localStorage.getItem("candidateUser") || localStorage.getItem("currentUser")

  // Option 2: From sessionStorage
  // const userData = sessionStorage.getItem("user")

  // Option 3: From a global variable
  const userData = window.currentUser

  if (userData) {
    try {
      return typeof userData === "string" ? JSON.parse(userData) : userData
    } catch (error) {
      console.error("Error parsing user data:", error)
      return null
    }
  }

  return null
}

// Function to check if user is admin
function isAdmin() {
  const user = getCurrentUser()
  return user
    // return user && (user.role === "admin" || user.email === "doom@digitalworld.com" || user.isAdmin === true)

}

// Function to redirect if not authenticated
function requireAuth(redirectUrl = "index.html") {
  const user = getCurrentUser()
  if (!user) {
    alert("Please login first")
    window.location.href = redirectUrl
    return false
  }
  return true
}

// Function to require admin access
function requireAdmin(redirectUrl = "index.html") {
  if (!requireAuth(redirectUrl)) return false

  if (!isAdmin()) {
    alert("Admin access required")
    window.location.href = redirectUrl
    return false
  }

  return true
}

// Export functions for use in other scripts
window.authIntegration = {
  getCurrentUser,
  isAdmin,
  requireAuth,
  requireAdmin,
}
