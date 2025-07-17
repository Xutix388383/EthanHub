document.addEventListener("DOMContentLoaded", () => {
  // --- DOM Elements ---
  const usernameDialog = document.getElementById("username-dialog")
  const usernameInput = document.getElementById("username-input")
  const startTrackingButton = document.getElementById("start-tracking-button")
  const deviceIdDisplay = document.getElementById("device-id-display")
  const mainInterface = document.getElementById("main-interface")
  const displayUsername = document.getElementById("display-username")

  const cameraSelect = document.getElementById("camera-select")
  const toggleCameraButton = document.getElementById("toggle-camera-button")
  const cameraErrorDisplay = document.getElementById("camera-error")
  const videoFeed = document.getElementById("video-feed")
  const hiddenCanvas = document.getElementById("hidden-canvas")
  const overlayCanvas = document.getElementById("overlay-canvas")

  const detectionStatusOverlay = document.getElementById("detection-status-overlay")
  const currentHitDurationDisplay = document.getElementById("current-hit-duration")
  const ledDetectionIndicator = document.getElementById("led-detection-indicator")
  const ledConfidenceDisplay = document.getElementById("led-confidence")
  const aiStatusMessage = document.getElementById("ai-status-message")
  const aiStatusDuration = document.getElementById("ai-status-duration")
  const displayLedConfidence = document.getElementById("display-led-confidence")
  const progressLedConfidence = document.getElementById("progress-led-confidence")
  const displayLedBrightness = document.getElementById("display-led-brightness")
  const progressLedBrightness = document.getElementById("progress-led-brightness")

  const statPoints = document.getElementById("stat-points")
  const statTotalHits = document.getElementById("stat-total-hits")
  const statLongestHit = document.getElementById("stat-longest-hit")
  const statAvgDuration = document.getElementById("stat-avg-duration")
  const statEfficiency = document.getElementById("stat-efficiency")
  const progressEfficiency = document.getElementById("progress-efficiency")
  const resetStatsButton = document.getElementById("reset-stats-button")
  const exportDataButton = document.getElementById("export-data-button")

  // Only remaining setting toggle
  const faceDetectionCheckbox = document.getElementById("face-detection-checkbox")

  // --- Global State ---
  let deviceId = ""
  let username = ""
  let cameraActive = false
  let availableCameras = []
  let selectedCamera = ""
  let cameraError = ""
  let isDetecting = false
  let currentHitDuration = 0
  let ledDetection = { detected: false, confidence: 0, position: { x: 0, y: 0 }, brightness: 0 }
  let status = "Initializing AI detection..."
  let userStats = {
    points: 0,
    totalHits: 0,
    totalSessions: 0,
    longestHit: 0,
    averageHitDuration: 0,
    totalTimeHitting: 0,
    lastActive: new Date(),
    efficiency: 0,
    dailyStats: {},
    weeklyStats: {},
    monthlyStats: {},
  }
  // Settings are now mostly fixed or auto-calibrated
  const settings = {
    sensitivity: 85, // Will be auto-calibrated
    minHitDuration: 1.0, // Fixed default
    maxHitDuration: 30.0, // Fixed default
    faceDetectionEnabled: true, // User toggleable
    ledBrightness: 200, // Will be auto-calibrated
  }

  // --- Refs (simulated with global variables for vanilla JS) ---
  let streamRef = null
  let animationRef = null
  const audioRef = new Audio(
    "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8t2JNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT",
  )
  audioRef.volume = 0.3
  let hitStartTimeRef = null

  // --- Utility Functions ---
  function getDeviceId() {
    let storedDeviceId = localStorage.getItem("blinker_device_id")
    if (!storedDeviceId) {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      ctx.textBaseline = "top"
      ctx.font = "14px Arial"
      ctx.fillText("Device fingerprint", 2, 2)
      const fingerprint = [
        navigator.userAgent,
        navigator.language,
        screen.width + "x" + screen.height,
        new Date().getTimezoneOffset(),
        canvas.toDataURL(),
        navigator.hardwareConcurrency || 0,
        navigator.deviceMemory || 0,
      ].join("|")
      let hash = 0
      for (let i = 0; i < fingerprint.length; i++) {
        const char = fingerprint.charCodeAt(i)
        hash = (hash << 5) - hash + char
        hash = hash & hash
      }
      storedDeviceId = `device_${Math.abs(hash).toString(36)}_${Date.now().toString(36)}`
      localStorage.setItem("blinker_device_id", storedDeviceId)
    }
    return storedDeviceId
  }

  function trackUserSession(currentDeviceId, currentUsername, currentStats) {
    const sessionData = {
      deviceId: currentDeviceId,
      username: currentUsername,
      stats: currentStats,
      timestamp: new Date().toISOString(),
      sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    }
    const existingSessions = JSON.parse(localStorage.getItem("blinker_sessions") || "[]")
    const updatedSessions = [...existingSessions, sessionData].slice(-100)
    localStorage.setItem("blinker_sessions", JSON.stringify(updatedSessions))

    const deviceStats = JSON.parse(localStorage.getItem("blinker_device_stats") || "{}")
    deviceStats[currentDeviceId] = {
      username: currentUsername,
      stats: currentStats,
      lastActive: new Date().toISOString(),
      totalSessions: (deviceStats[currentDeviceId]?.totalSessions || 0) + 1,
    }
    localStorage.setItem("blinker_device_stats", JSON.stringify(deviceStats))
    return sessionData
  }

  function updateUI() {
    displayUsername.textContent = username
    aiStatusMessage.textContent = status

    // Update stats display
    statPoints.textContent = userStats.points
    statTotalHits.textContent = userStats.totalHits
    statLongestHit.textContent = userStats.longestHit.toFixed(1) + "s"
    statAvgDuration.textContent = userStats.averageHitDuration.toFixed(1) + "s"
    statEfficiency.textContent = Math.round(userStats.efficiency) + "%"
    progressEfficiency.style.width = `${userStats.efficiency}%`

    // Update detection status
    if (isDetecting) {
      detectionStatusOverlay.classList.remove("hidden")
      currentHitDurationDisplay.textContent = currentHitDuration.toFixed(1)
      aiStatusDuration.textContent = currentHitDuration.toFixed(1) + "s"
      aiStatusDuration.classList.remove("hidden")
    } else {
      detectionStatusOverlay.classList.add("hidden")
      aiStatusDuration.classList.add("hidden")
    }

    if (ledDetection.detected) {
      ledDetectionIndicator.classList.remove("hidden")
      ledConfidenceDisplay.textContent = Math.round(ledDetection.confidence)
    } else {
      ledDetectionIndicator.classList.add("hidden")
    }

    displayLedConfidence.textContent = Math.round(ledDetection.confidence) + "%"
    progressLedConfidence.style.width = `${ledDetection.confidence}%`
    displayLedBrightness.textContent = Math.round(ledDetection.brightness)
    progressLedBrightness.style.width = `${(ledDetection.brightness / 255) * 100}%`

    // Update face detection checkbox
    faceDetectionCheckbox.checked = settings.faceDetectionEnabled

    // Update camera button text/style
    if (cameraActive) {
      toggleCameraButton.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 mr-2"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg> Stop Camera'
      toggleCameraButton.classList.remove(
        "from-emerald-600",
        "to-green-600",
        "hover:from-emerald-700",
        "hover:to-green-700",
        "shadow-emerald-500/25",
      )
      toggleCameraButton.classList.add(
        "from-red-600",
        "to-red-700",
        "hover:from-red-700",
        "hover:to-red-800",
        "shadow-red-500/25",
      )
    } else {
      toggleCameraButton.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 mr-2"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg> Start Camera'
      toggleCameraButton.classList.remove(
        "from-red-600",
        "to-red-700",
        "hover:from-red-700",
        "hover:to-red-800",
        "shadow-red-500/25",
      )
      toggleCameraButton.classList.add(
        "from-emerald-600",
        "to-green-600",
        "hover:from-emerald-700",
        "hover:to-green-700",
        "shadow-emerald-500/25",
      )
    }
  }

  // --- Core Logic Functions ---
  async function enumerateCameras() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      availableCameras = devices
        .filter((device) => device.kind === "videoinput" && device.deviceId)
        .map((device, index) => ({
          deviceId: device.deviceId || `default-camera-${index}`,
          label: device.label || `Camera ${index + 1}`,
          kind: device.kind,
        }))

      // Populate select options
      cameraSelect.innerHTML = "" // Clear existing options
      if (availableCameras.length === 0) {
        cameraSelect.innerHTML = '<option value="" disabled selected>No cameras found</option>'
        toggleCameraButton.disabled = true
      } else {
        availableCameras.forEach((camera) => {
          const option = document.createElement("option")
          option.value = camera.deviceId
          option.textContent = camera.label
          cameraSelect.appendChild(option)
        })
        selectedCamera = availableCameras[0].deviceId // Select first camera by default
        cameraSelect.value = selectedCamera
        toggleCameraButton.disabled = false
      }
    } catch (error) {
      console.error("Failed to enumerate cameras:", error)
      cameraError = "Failed to access cameras. Please check permissions."
      cameraErrorDisplay.textContent = cameraError
      cameraErrorDisplay.classList.remove("hidden")
      cameraSelect.innerHTML = '<option value="" disabled selected>Error enumerating cameras</option>'
      toggleCameraButton.disabled = true
    }
  }

  async function initializeCamera() {
    try {
      cameraError = ""
      cameraErrorDisplay.classList.add("hidden")
      status = "🎯 Initializing AI-powered LED detection..."
      updateUI()

      if (streamRef) {
        streamRef.getTracks().forEach((track) => track.stop())
      }

      const constraints = {
        video: {
          deviceId: selectedCamera ? { exact: selectedCamera } : undefined,
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef = stream

      videoFeed.srcObject = stream
      await new Promise((resolve) => {
        videoFeed.onloadedmetadata = resolve
      })

      // Auto-calibrate settings after camera is ready
      await autoCalibrate()

      cameraActive = true
      // Status is set by autoCalibrate
      startAIDetectionLoop()
    } catch (error) {
      console.error("Camera initialization failed:", error)
      cameraError = "Camera access denied. Please allow camera permissions."
      cameraErrorDisplay.textContent = cameraError
      cameraErrorDisplay.classList.remove("hidden")
      status = "❌ Camera access failed"
    } finally {
      updateUI()
    }
  }

  async function autoCalibrate() {
    status = "🤖 Auto-calibrating AI settings..."
    updateUI()

    const video = videoFeed
    const canvas = hiddenCanvas
    const ctx = canvas.getContext("2d")

    let totalBrightness = 0
    let totalConfidence = 0
    let samples = 0
    const maxSamples = 30 // Take a few frames for calibration

    return new Promise((resolve) => {
      const calibrateFrame = () => {
        if (!cameraActive || samples >= maxSamples) {
          if (samples > 0) {
            // Set brightness slightly below average of detected bright spots
            settings.ledBrightness = Math.max(150, Math.min(250, totalBrightness / samples - 10))
            // Set sensitivity slightly below average confidence
            settings.sensitivity = Math.max(50, Math.min(95, totalConfidence / samples - 5))
          } else {
            // Fallback to default if no bright spots found during calibration
            settings.ledBrightness = 200
            settings.sensitivity = 85
          }
          status = "🧠 AI detection ready - Position cart LED near mouth"
          updateUI()
          resolve()
          return
        }

        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

        // A temporary function to find the brightest white-ish spot for calibration
        const tempDetection = findBrightestSpotForCalibration(imageData, canvas.width, canvas.height)

        if (tempDetection.detected) {
          totalBrightness += tempDetection.brightness
          totalConfidence += tempDetection.confidence
          samples++
        }

        requestAnimationFrame(calibrateFrame)
      }
      calibrateFrame()
    })
  }

  // Helper for autoCalibrate to find brightest spot without current settings
  function findBrightestSpotForCalibration(imageData, width, height) {
    const data = imageData.data
    let bestSpot = { detected: false, confidence: 0, position: { x: 0, y: 0 }, brightness: 0 }

    const mouthRegion = {
      startX: Math.floor(width * 0.3),
      endX: Math.floor(width * 0.7),
      startY: Math.floor(height * 0.6),
      endY: Math.floor(height * 0.9),
    }

    for (let y = mouthRegion.startY; y < mouthRegion.endY; y += 4) {
      // Increase step for faster calibration
      for (let x = mouthRegion.startX; x < mouthRegion.endX; x += 4) {
        const index = (y * width + x) * 4
        const r = data[index]
        const g = data[index + 1]
        const b = data[index + 2]

        const brightness = (r + g + b) / 3
        const isWhiteish = Math.abs(r - g) < 30 && Math.abs(g - b) < 30 && Math.abs(r - b) < 30

        if (brightness > 100 && isWhiteish) {
          // Lower initial threshold for finding *any* bright spot
          const spotSize = checkSpotSize(data, x, y, width, height, 100) // Use a fixed threshold for size check

          if (spotSize > 2 && spotSize < 50) {
            const confidence = Math.min(100, (brightness / 255) * 100 + (spotSize / 10) * 20)
            if (confidence > bestSpot.confidence) {
              bestSpot = {
                detected: true,
                confidence,
                position: { x, y },
                brightness,
              }
            }
          }
        }
      }
    }
    return bestSpot
  }

  function startAIDetectionLoop() {
    if (!videoFeed || !hiddenCanvas || !overlayCanvas) return

    const video = videoFeed
    const canvas = hiddenCanvas
    const overlayCanvasCtx = overlayCanvas.getContext("2d")
    const ctx = canvas.getContext("2d")

    if (!ctx || !overlayCanvasCtx) return

    const detect = () => {
      if (!cameraActive) return

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      overlayCanvas.width = video.videoWidth
      overlayCanvas.height = video.videoHeight

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

      ledDetection = detectCartLED(imageData, canvas.width, canvas.height)

      overlayCanvasCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height)

      if (ledDetection.detected) {
        overlayCanvasCtx.strokeStyle = "#00ff88"
        overlayCanvasCtx.lineWidth = 3
        overlayCanvasCtx.beginPath()
        overlayCanvasCtx.arc(ledDetection.position.x, ledDetection.position.y, 20, 0, 2 * Math.PI)
        overlayCanvasCtx.stroke()

        overlayCanvasCtx.fillStyle = "#00ff88"
        overlayCanvasCtx.font = "12px monospace"
        overlayCanvasCtx.fillText(
          `${Math.round(ledDetection.confidence)}%`,
          ledDetection.position.x + 25,
          ledDetection.position.y,
        )

        if (!isDetecting) {
          isDetecting = true
          hitStartTimeRef = Date.now()
          status = "🔥 Cart LED detected - Timing hit..."
          audioRef.play().catch(() => {})
        }
      } else {
        if (isDetecting && hitStartTimeRef) {
          const hitDuration = (Date.now() - hitStartTimeRef) / 1000
          isDetecting = false
          hitStartTimeRef = null
          handleHitComplete(hitDuration)
        }
      }

      if (isDetecting && hitStartTimeRef) {
        currentHitDuration = (Date.now() - hitStartTimeRef) / 1000
      }

      if (settings.faceDetectionEnabled) {
        overlayCanvasCtx.strokeStyle = "rgba(0, 255, 136, 0.3)"
        overlayCanvasCtx.lineWidth = 2
        overlayCanvasCtx.setLineDash([5, 5])
        const mouthRegion = {
          x: canvas.width * 0.3,
          y: canvas.height * 0.6,
          width: canvas.width * 0.4,
          height: canvas.height * 0.3,
        }
        overlayCanvasCtx.strokeRect(mouthRegion.x, mouthRegion.y, mouthRegion.width, mouthRegion.height)
        overlayCanvasCtx.setLineDash([])
      }

      updateUI()
      animationRef = requestAnimationFrame(detect)
    }

    detect()
  }

  function detectCartLED(imageData, width, height) {
    const data = imageData.data
    let bestDetection = { detected: false, confidence: 0, position: { x: 0, y: 0 }, brightness: 0 }

    const mouthRegion = {
      startX: Math.floor(width * 0.3),
      endX: Math.floor(width * 0.7),
      startY: Math.floor(height * 0.6),
      endY: Math.floor(height * 0.9),
    }

    for (let y = mouthRegion.startY; y < mouthRegion.endY; y += 2) {
      for (let x = mouthRegion.startX; x < mouthRegion.endX; x += 2) {
        const index = (y * width + x) * 4
        const r = data[index]
        const g = data[index + 1]
        const b = data[index + 2]

        const brightness = (r + g + b) / 3
        const isWhiteish = Math.abs(r - g) < 30 && Math.abs(g - b) < 30 && Math.abs(r - b) < 30

        if (brightness > settings.ledBrightness && isWhiteish) {
          const spotSize = checkSpotSize(data, x, y, width, height, settings.ledBrightness)

          if (spotSize > 2 && spotSize < 50) {
            const confidence = Math.min(100, (brightness / 255) * 100 + (spotSize / 10) * 20)

            if (confidence > bestDetection.confidence) {
              bestDetection = {
                detected: confidence > settings.sensitivity,
                confidence,
                position: { x, y },
                brightness,
              }
            }
          }
        }
      }
    }
    return bestDetection
  }

  function checkSpotSize(data, centerX, centerY, width, height, threshold) {
    let brightPixels = 0
    const radius = 10

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const x = centerX + dx
        const y = centerY + dy

        if (x >= 0 && x < width && y >= 0 && y < height) {
          const index = (y * width + x) * 4
          const brightness = (data[index] + data[index + 1] + data[index + 2]) / 3

          if (brightness > threshold) {
            brightPixels++
          }
        }
      }
    }
    return brightPixels
  }

  function handleHitComplete(duration) {
    if (duration < settings.minHitDuration) {
      status = "⚡ Too quick - Keep hitting!"
      currentHitDuration = 0
      updateUI()
      return
    }

    if (duration > settings.maxHitDuration) {
      status = "⚠️ Hit too long - Take a break!"
      currentHitDuration = 0
      updateUI()
      return
    }

    const points = Math.floor(duration)
    let message = ""

    if (duration >= 20) {
      message = "💀 LEGENDARY HIT! Monster clouds!"
    } else if (duration >= 15) {
      message = "🔥 EPIC HIT! Cloud master!"
    } else if (duration >= 10) {
      message = "✨ PERFECT HIT! Nice clouds!"
    } else if (duration >= 5) {
      message = "👌 SOLID HIT! Good technique!"
    } else {
      message = "💨 QUICK HIT! Building up!"
    }

    status = `${message} +${points} points (${duration.toFixed(1)}s)`

    // Update comprehensive stats
    const now = new Date()
    const dateKey = now.toISOString().split("T")[0]
    const weekKey = `${now.getFullYear()}-W${Math.ceil(now.getDate() / 7)}`
    const monthKey = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, "0")}`

    const prevStats = { ...userStats }
    const newTotalHits = prevStats.totalHits + 1
    const newTotalTime = prevStats.totalTimeHitting + duration
    const newAverageDuration = newTotalTime / newTotalHits
    const newEfficiency = Math.min(100, (newAverageDuration / 10) * 100)

    const dailyStats = { ...prevStats.dailyStats }
    if (!dailyStats[dateKey]) {
      dailyStats[dateKey] = { hits: 0, points: 0, totalTime: 0, longestHit: 0 }
    }
    dailyStats[dateKey].hits += 1
    dailyStats[dateKey].points += points
    dailyStats[dateKey].totalTime += duration
    dailyStats[dateKey].longestHit = Math.max(dailyStats[dateKey].longestHit, duration)

    const weeklyStats = { ...prevStats.weeklyStats }
    if (!weeklyStats[weekKey]) {
      weeklyStats[weekKey] = { hits: 0, points: 0, totalTime: 0, longestHit: 0 }
    }
    weeklyStats[weekKey].hits += 1
    weeklyStats[weekKey].points += points
    weeklyStats[weekKey].totalTime += duration
    weeklyStats[weekKey].longestHit = Math.max(weeklyStats[weekKey].longestHit, duration)

    const monthlyStats = { ...prevStats.monthlyStats }
    if (!monthlyStats[monthKey]) {
      monthlyStats[monthKey] = { hits: 0, points: 0, totalTime: 0, longestHit: 0 }
    }
    monthlyStats[monthKey].hits += 1
    monthlyStats[monthKey].points += points
    monthlyStats[monthKey].totalTime += duration
    monthlyStats[monthKey].longestHit = Math.max(monthlyStats[monthKey].longestHit, duration)

    userStats = {
      ...prevStats,
      points: prevStats.points + points,
      totalHits: newTotalHits,
      totalSessions: prevStats.totalSessions + 1,
      longestHit: Math.max(prevStats.longestHit, duration),
      averageHitDuration: newAverageDuration,
      totalTimeHitting: newTotalTime,
      efficiency: newEfficiency,
      lastActive: now,
      dailyStats,
      weeklyStats,
      monthlyStats,
    }

    if (deviceId && username) {
      trackUserSession(deviceId, username, userStats)
    }

    currentHitDuration = 0
    saveData()
    updateUI()
  }

  function toggleCamera() {
    if (cameraActive) {
      stopCamera()
    } else {
      initializeCamera()
    }
  }

  function stopCamera() {
    if (streamRef) {
      streamRef.getTracks().forEach((track) => track.stop())
      streamRef = null
    }
    if (animationRef) {
      cancelAnimationFrame(animationRef)
      animationRef = null
    }
    cameraActive = false
    isDetecting = false
    hitStartTimeRef = null
    currentHitDuration = 0
    status = "Camera stopped"
    updateUI()
  }

  function resetStats() {
    userStats = {
      points: 0,
      totalHits: 0,
      totalSessions: 0,
      longestHit: 0,
      averageHitDuration: 0,
      totalTimeHitting: 0,
      lastActive: new Date(),
      efficiency: 0,
      dailyStats: {},
      weeklyStats: {},
      monthlyStats: {},
    }
    saveData()
    updateUI()
  }

  function exportData() {
    const data = {
      username,
      stats: userStats,
      settings: {
        minHitDuration: settings.minHitDuration,
        maxHitDuration: settings.maxHitDuration,
        faceDetectionEnabled: settings.faceDetectionEnabled,
      }, // Only export fixed/user-toggleable settings
      exportDate: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `blinker-tracker-${username}-${new Date().toISOString().split("T")[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function loadSavedData() {
    const deviceKey = `blinker_${deviceId}`
    const savedUsername = localStorage.getItem(`${deviceKey}_username`)
    const savedStats = localStorage.getItem(`${deviceKey}_stats`)
    const savedSettings = localStorage.getItem(`${deviceKey}_settings`) // Load only for faceDetectionEnabled

    if (savedUsername) {
      username = savedUsername
      usernameDialog.classList.add("hidden")
      mainInterface.classList.remove("hidden")
    } else {
      usernameDialog.classList.remove("hidden")
      mainInterface.classList.add("hidden")
    }

    if (savedStats) {
      userStats = JSON.parse(savedStats)
      userStats.lastActive = new Date(userStats.lastActive) // Convert back to Date object
    }
    if (savedSettings) {
      const parsedSettings = JSON.parse(savedSettings)
      // Only load faceDetectionEnabled, others are auto-calibrated or fixed
      if (parsedSettings.faceDetectionEnabled !== undefined) {
        settings.faceDetectionEnabled = parsedSettings.faceDetectionEnabled
      }
    }
    updateUI()
  }

  function saveData() {
    const deviceKey = `blinker_${deviceId}`
    localStorage.setItem(`${deviceKey}_username`, username)
    localStorage.setItem(`${deviceKey}_stats`, JSON.stringify(userStats))
    // Only save user-toggleable settings
    localStorage.setItem(
      `${deviceKey}_settings`,
      JSON.stringify({ faceDetectionEnabled: settings.faceDetectionEnabled }),
    )
  }

  // --- Event Listeners ---
  startTrackingButton.addEventListener("click", () => {
    const inputVal = usernameInput.value.trim()
    if (inputVal) {
      username = inputVal
      usernameDialog.classList.add("hidden")
      mainInterface.classList.remove("hidden")
      saveData()
      updateUI()
    }
  })

  usernameInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      startTrackingButton.click()
    }
  })

  toggleCameraButton.addEventListener("click", toggleCamera)
  resetStatsButton.addEventListener("click", resetStats)
  exportDataButton.addEventListener("click", exportData)

  cameraSelect.addEventListener("change", (e) => {
    selectedCamera = e.target.value
    if (cameraActive) {
      // If camera is active, restart with new selection
      stopCamera()
      initializeCamera()
    }
  })

  faceDetectionCheckbox.addEventListener("change", (e) => {
    settings.faceDetectionEnabled = e.target.checked
    saveData()
  })

  // --- Initialization ---
  deviceId = getDeviceId()
  deviceIdDisplay.textContent = `Device ID: ${deviceId.slice(0, 16)}...`
  loadSavedData()
  enumerateCameras()
})
