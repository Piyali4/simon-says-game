const statusText = document.getElementById("status-text");
const buttons = document.querySelectorAll(".btn");
const strictToggle = document.getElementById("strict-toggle");
const highScoreText = document.getElementById("high-score");

const buttonColors = ["red", "green", "yellow", "purple"];
const toneMap = {
  red: 329.63,
  green: 261.63,
  yellow: 392.0,
  purple: 523.25,
};

let gameSequence = [];
let userSequence = [];
let level = 0;
let gameStarted = false;
let strictMode = false;
let isShowingSequence = false;
let sequenceTimers = [];
let audioContext = null;
let highScore = Number(localStorage.getItem("simonHighScore")) || 0;

function updateHighScoreDisplay() {
  if (!highScoreText) {
    return;
  }
  highScoreText.textContent = String(highScore);
}

function maybeUpdateHighScore() {
  if (level <= highScore) {
    return;
  }
  highScore = level;
  localStorage.setItem("simonHighScore", String(highScore));
  updateHighScoreDisplay();
}

function ensureAudioContext() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) {
    return;
  }
  if (!audioContext) {
    audioContext = new AudioCtx();
  }
  if (audioContext.state === "suspended") {
    audioContext.resume();
  }
}

function playTone(frequency, duration = 220, type = "sine", volume = 0.06) {
  if (!audioContext || audioContext.state !== "running") {
    return;
  }

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.type = type;
  oscillator.frequency.value = frequency;

  gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(
    0.0001,
    audioContext.currentTime + duration / 1000
  );

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.start();
  oscillator.stop(audioContext.currentTime + duration / 1000);
}

function playColorTone(color, duration = 220) {
  const frequency = toneMap[color];
  if (!frequency) {
    return;
  }
  playTone(frequency, duration);
}

function playErrorSound() {
  if (!audioContext || audioContext.state !== "running") {
    return;
  }
  playTone(180, 160, "sawtooth");
  setTimeout(() => {
    playTone(120, 220, "sawtooth");
  }, 120);
}

function flashGameButton(button) {
  if (!button) {
    return;
  }
  button.classList.add("flash");
  setTimeout(() => {
    button.classList.remove("flash");
  }, 260);
}

function flashUserButton(button) {
  if (!button) {
    return;
  }
  button.classList.add("userflash");
  setTimeout(() => {
    button.classList.remove("userflash");
  }, 180);
}

function clearSequenceTimers() {
  sequenceTimers.forEach((timerId) => clearTimeout(timerId));
  sequenceTimers = [];
}

function playSequence() {
  clearSequenceTimers();
  isShowingSequence = true;
  statusText.textContent = `Level ${level} - Watch`;

  gameSequence.forEach((color, index) => {
    const timerId = setTimeout(() => {
      const button = document.getElementById(color);
      flashGameButton(button);
      playColorTone(color, 260);
    }, index * 620);
    sequenceTimers.push(timerId);
  });

  const endTimerId = setTimeout(() => {
    isShowingSequence = false;
    statusText.textContent = `Level ${level}`;
  }, gameSequence.length * 620 + 120);
  sequenceTimers.push(endTimerId);
}

function resetGameState() {
  clearSequenceTimers();
  gameSequence = [];
  userSequence = [];
  level = 0;
  gameStarted = false;
  isShowingSequence = false;
}

function nextLevel() {
  userSequence = [];
  level += 1;
  maybeUpdateHighScore();

  const randomIndex = Math.floor(Math.random() * buttonColors.length);
  const randomColor = buttonColors[randomIndex];
  gameSequence.push(randomColor);

  playSequence();
}

function gameOver(message = "Game Over!") {
  maybeUpdateHighScore();
  playErrorSound();
  statusText.innerHTML = `${message} Your score was <b>${level}</b><br>Press any key to restart`;
  document.body.classList.add("game-over");

  setTimeout(() => {
    document.body.classList.remove("game-over");
  }, 220);

  resetGameState();
}

function repeatCurrentLevel() {
  userSequence = [];
  statusText.textContent = "Wrong move! Watch the pattern again...";

  const timerId = setTimeout(() => {
    if (!gameStarted) {
      return;
    }
    playSequence();
  }, 850);
  sequenceTimers.push(timerId);
}

function checkUserMove(currentIndex) {
  if (userSequence[currentIndex] !== gameSequence[currentIndex]) {
    if (strictMode) {
      gameOver("Wrong move in Strict Mode!");
      return;
    }
    playErrorSound();
    repeatCurrentLevel();
    return;
  }

  if (userSequence.length === gameSequence.length) {
    const timerId = setTimeout(() => {
      if (!gameStarted) {
        return;
      }
      nextLevel();
    }, 780);
    sequenceTimers.push(timerId);
  }
}

function handleButtonClick(event) {
  if (!gameStarted || isShowingSequence) {
    return;
  }

  ensureAudioContext();

  const clickedButton = event.currentTarget;
  const selectedColor = clickedButton.id;

  flashUserButton(clickedButton);
  playColorTone(selectedColor, 180);
  userSequence.push(selectedColor);
  checkUserMove(userSequence.length - 1);
}

function startGame() {
  if (gameStarted) {
    return;
  }

  ensureAudioContext();
  gameStarted = true;
  gameSequence = [];
  userSequence = [];
  level = 0;
  statusText.textContent = "Get ready...";

  const timerId = setTimeout(() => {
    if (!gameStarted) {
      return;
    }
    nextLevel();
  }, 350);
  sequenceTimers.push(timerId);
}

function handleStrictToggle(event) {
  strictMode = event.target.checked;
}

document.addEventListener("keydown", startGame);

if (strictToggle) {
  strictToggle.addEventListener("change", handleStrictToggle);
}

buttons.forEach((button) => {
  button.addEventListener("click", handleButtonClick);
});

updateHighScoreDisplay();
