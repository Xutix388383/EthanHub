let video = document.getElementById('video');
let canvas = document.getElementById('canvas');
let ctx = canvas.getContext('2d');
let statusText = document.querySelector('.status');
let pointsText = document.querySelector('.points');
let leaderboardList = document.getElementById('leaderboardList');
let blinkerSound = document.getElementById('blinkerSound');

let tracking = false;
let startTime = null;
let points = 0;
let blinkers = 0;
let username = localStorage.getItem('blinkerUsername') || null;
let currentStream = null;
let useFrontCamera = true;

if (username) {
  document.getElementById('usernamePrompt').style.display = 'none';
  initCamera();
}

function saveUsername() {
  const input = document.getElementById('usernameInput').value.trim();
  if (input) {
    username = input;
    localStorage.setItem('blinkerUsername', username);
    document.getElementById('usernamePrompt').style.display = 'none';
    initCamera();
  }
}

function initCamera() {
  const constraints = {
    video: {
      facingMode: useFrontCamera ? 'user' : 'environment'
    }
  };

  navigator.mediaDevices.getUserMedia(constraints)
    .then(stream => {
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
      }
      currentStream = stream;
      video.srcObject = stream;
      statusText.textContent = "Camera ready. Waiting for LED...";
      detectLoop();
    })
    .catch(err => {
      statusText.textContent = "Camera access denied.";
      console.error(err);
    });
}

function switchCamera() {
  useFrontCamera = !useFrontCamera;
  initCamera();
}

function detectLoop() {
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const brightness = detectSmallBrightSpots(frame.data);

  const LED_THRESHOLD = 200;

  if (brightness > LED_THRESHOLD) {
    if (!tracking) {
      tracking = true;
      startTime = Date.now();
      statusText.textContent = "LED detected! Counting...";
    }
  } else {
    if (tracking) {
      const duration = (Date.now() - startTime) / 1000;
      tracking = false;
      handleHit(duration);
    }
  }

  requestAnimationFrame(detectLoop);
}

function detectSmallBrightSpots(data) {
  let brightPixels = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i+1], b = data[i+2];
    const brightness = (r + g + b) / 3;
    if (brightness > 220) brightPixels++;
  }
  return brightPixels < 500 ? brightPixels : 0;
}

function handleHit(seconds) {
  let message = `Hit lasted ${seconds.toFixed(1)}s.`;
  if (seconds >= 20) {
    message += " 🚨 Take a break and breathe!";
  } else if (seconds >= 15) {
    points += 15;
    message += " 💀 Double Rip Demon! +15 points";
  } else if (seconds >= 10) {
    points += 10;
    blinkers += 1;
    message += " 🔥 Blinker! +10 points";
    blinkerSound.play();
  } else {
    message += " 😶 Not a blinker.";
  }

  statusText.textContent = message;
  pointsText.textContent = `Points: ${points}`;
  updateLeaderboard();
}

function updateLeaderboard() {
  let board = JSON.parse(localStorage.getItem('blinkerLeaderboard') || '{}');
  board[username] = { points, blinkers };
  localStorage.setItem('blinkerLeaderboard', JSON.stringify(board));

  leaderboardList.innerHTML = '';
  Object.entries(board)
    .sort((a, b) => b[1].points - a[1].points)
    .forEach(([name, data]) => {
      const li = document.createElement('li');
      li.textContent = `${name}: ${data.points} pts | 🔥 ${data.blinkers} blinkers`;
      leaderboardList.appendChild(li);
    });
}
