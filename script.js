const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
let gameLoop;
let gameState = "start";
let score = 0;
let highScore = 0;

// Resize canvas for sharp rendering with devicePixelRatio fix
function resizeCanvas() {
  const container = document.getElementById("gameContainer");
  const dpr = window.devicePixelRatio || 1;
  const width = container.clientWidth;
  const height = container.clientHeight;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = width + "px";
  canvas.style.height = height + "px";
  ctx.setTransform(1, 0, 0, 1, 0, 0); // reset transform
  ctx.scale(dpr, dpr);
  ctx.imageSmoothingEnabled = false;
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

// Player object
const player = {
  x: canvas.width * 0.3,
  y: canvas.height / 2,
  radius: 15,
  velocity: 0,
  gravity: 0.50,
  jumpForce: -8,
  trail: [],
  maxTrailLength: 10,

  draw() {
    ctx.beginPath();
    this.trail.forEach((pos, index) => {
      const alpha = (index / this.maxTrailLength) * 0.6;
      const size = this.radius * (1 - index / this.maxTrailLength);

      // Outer glow
      ctx.shadowBlur = 15;
      ctx.shadowColor = "#00F3FF";
      ctx.fillStyle = `rgba(0, 243, 255, ${alpha * 0.5})`;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, size * 1.2, 0, Math.PI * 2);
      ctx.fill();

      // Inner trail
      ctx.shadowBlur = 10;
      ctx.fillStyle = `rgba(0, 243, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, size, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw player with enhanced effects
    ctx.beginPath();

    // Outer glow
    ctx.shadowBlur = 25;
    ctx.shadowColor = "#00F3FF";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 1.2, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0, 243, 255, 0.3)";
    ctx.fill();

    // Inner player
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    const gradient = ctx.createRadialGradient(
      this.x,
      this.y,
      0,
      this.x,
      this.y,
      this.radius
    );
    gradient.addColorStop(0, "#00F3FF");
    gradient.addColorStop(0.6, "rgba(0, 243, 255, 0.8)");
    gradient.addColorStop(1, "rgba(11, 16, 38, 0.2)");
    ctx.fillStyle = gradient;
    ctx.fill();

    // Core glow
    ctx.shadowBlur = 15;
    ctx.shadowColor = "#00F3FF";
    ctx.strokeStyle = "rgba(0, 243, 255, 0.8)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.shadowBlur = 0;
  },

  update() {
    this.velocity += this.gravity;
    this.y += this.velocity;

    // Update trail
    this.trail.unshift({ x: this.x, y: this.y });
    if (this.trail.length > this.maxTrailLength) {
      this.trail.pop();
    }

    // Screen boundaries
    if (this.y > canvas.height - this.radius) {
      this.y = canvas.height - this.radius;
      this.velocity = 0;
    }
    if (this.y < this.radius) {
      this.y = this.radius;
      this.velocity = 0;
    }
  },

  jump() {
    this.velocity = this.jumpForce;
    playHopSound();
  },
};

// Obstacle class
class Obstacle {
  constructor() {
    this.width = 50;
    this.gap = 150;
    this.x = canvas.width;
    this.topHeight = Math.random() * (canvas.height - this.gap - 150) + 80;
    this.bottomY = this.topHeight + this.gap;
    this.speed = 3;
    this.passed = false;
  }

  draw() {
    ctx.fillStyle = "#FF00E5";
    ctx.shadowBlur = 15;
    ctx.shadowColor = "#FF00E5";

    // Top obstacle
    ctx.fillRect(this.x, 0, this.width, this.topHeight);

    // Bottom obstacle
    ctx.fillRect(
      this.x,
      this.bottomY,
      this.width,
      canvas.height - this.bottomY
    );

    ctx.shadowBlur = 0;
  }

  update() {
    this.x -= this.speed;

    // Score point when passing obstacle
    if (!this.passed && this.x + this.width < player.x) {
      score++;
      this.passed = true;
      const scoreElement = document.getElementById("scoreValue");
      scoreElement.textContent = score;

      // Animate score
      scoreElement.parentElement.classList.add("updated");
      setTimeout(() => {
        scoreElement.parentElement.classList.remove("updated");
      }, 200);

      playScoreSound();

      // Add score particles
      for (let i = 0; i < 5; i++) {
        particles.addParticle(
          player.x + player.radius,
          player.y,
          "0, 243, 255"
        );
      }
    }
  }

  collidesWith(player) {
    return (
      player.x + player.radius > this.x &&
      player.x - player.radius < this.x + this.width &&
      (player.y - player.radius < this.topHeight ||
        player.y + player.radius > this.bottomY)
    );
  }
}

// Particle system
class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  addParticle(x, y, color) {
    this.particles.push({
      x,
      y,
      color,
      velocity: {
        x: (Math.random() - 0.5) * 8,
        y: (Math.random() - 0.5) * 8,
      },
      radius: Math.random() * 3 + 1,
      life: 1,
    });
  }

  update() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      particle.x += particle.velocity.x;
      particle.y += particle.velocity.y;
      particle.life -= 0.02;

      if (particle.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  draw() {
    ctx.shadowBlur = 15;
    this.particles.forEach((particle) => {
      // Outer glow
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.radius * 1.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${particle.color}, ${particle.life * 0.3})`;
      ctx.shadowColor = `rgba(${particle.color}, ${particle.life})`;
      ctx.fill();

      // Inner particle
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${particle.color}, ${particle.life})`;
      ctx.fill();
    });
    ctx.shadowBlur = 0;
  }
}

class Star {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    this.size = Math.random() * 2;
    this.speed = Math.random() * 3 + 1;
  }

  update() {
    this.x -= this.speed;
    if (this.x < 0) {
      this.reset();
      this.x = canvas.width;
    }
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = "white";
    ctx.fill();
  }
}

let obstacles = [];
let particles = new ParticleSystem();
let stars = Array(100)
  .fill()
  .map(() => new Star());
let obstacleTimer = 0;
const obstacleInterval = 160;

let isMuted = false;
let synth;
let fxSynth;
let audioInitialized = false;

async function initAudio() {
  if (audioInitialized) return;
  await Tone.start();
  synth = new Tone.Synth().toDestination();
  fxSynth = new Tone.FMSynth().toDestination();
  audioInitialized = true;
}

function playHopSound() {
  if (!isMuted && audioInitialized) {
    synth.triggerAttackRelease("C6", "32n");
  }
}

function playScoreSound() {
  if (!isMuted && audioInitialized) {
    fxSynth.triggerAttackRelease("G5", "16n");
  }
}

function playGameOverSound() {
  if (!isMuted && audioInitialized) {
    synth.triggerAttackRelease("C4", "8n");
    setTimeout(() => synth.triggerAttackRelease("G3", "4n"), 100);
  }
}

// Game loop
function update() {
  if (gameState !== "playing") return;

  player.update();
  obstacles.forEach((obstacle) => obstacle.update());
  particles.update();
  stars.forEach((star) => star.update());

  // Remove off-screen obstacles
  obstacles = obstacles.filter((obstacle) => obstacle.x + obstacle.width > 0);

  // Add new obstacles
  obstacleTimer++;
  if (obstacleTimer > obstacleInterval) {
    obstacles.push(new Obstacle());
    obstacleTimer = 0;
  }

  // Check collisions
  if (obstacles.some((obstacle) => obstacle.collidesWith(player))) {
    gameOver();
  }
}

function draw() {
  ctx.fillStyle = "#0B1026";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw stars
  stars.forEach((star) => star.draw());

  // Draw game elements
  obstacles.forEach((obstacle) => obstacle.draw());
  particles.draw();
  player.draw();

  requestAnimationFrame(draw);
}

// Game state management
async function startGame() {
  if (!audioInitialized) {
    await initAudio();
  }

  const startScreen = document.getElementById("startScreen");
  startScreen.style.opacity = "0";
  startScreen.style.transform = "scale(1.1)";

  // Reset game state
  gameState = "playing";
  score = 0;
  obstacles = [];
  player.y = canvas.height / 2;
  player.velocity = 0;

  // Wait for fade out animation
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Update UI
  document.getElementById("scoreValue").textContent = "0";
  startScreen.classList.add("hidden");
  const gameScreen = document.getElementById("gameScreen");
  gameScreen.classList.remove("hidden");
  gameScreen.classList.add("no-blur");
  document.getElementById("gameOverScreen").classList.add("hidden");

  // Fade in game screen
  requestAnimationFrame(() => {
    gameScreen.style.opacity = "1";
    gameScreen.style.transform = "scale(1)";
  });

  // Start game loop
  if (gameLoop) clearInterval(gameLoop);
  gameLoop = setInterval(update, 1000 / 60);
  draw();

  // Add initial particles for dramatic effect
  for (let i = 0; i < 20; i++) {
    particles.addParticle(
      canvas.width * Math.random(),
      canvas.height * Math.random(),
      "0, 243, 255"
    );
  }
}

function gameOver() {
  gameState = "over";
  clearInterval(gameLoop);
  playGameOverSound();

  // Update high score with animation
  if (score > highScore) {
    highScore = score;
    const highScoreElement = document.getElementById("highScore");
    highScoreElement.textContent = highScore;
    highScoreElement.style.transform = "scale(1.2)";
    setTimeout(() => {
      highScoreElement.style.transform = "scale(1)";
    }, 200);
  }

  // Fade out game screen
  const gameScreen = document.getElementById("gameScreen");
  gameScreen.style.opacity = "0";
  gameScreen.style.transform = "scale(0.9)";
  gameScreen.classList.remove("no-blur");

  document.getElementById("finalScore").textContent = score;
  const gameOverScreen = document.getElementById("gameOverScreen");
  gameScreen.classList.add("hidden");
  gameOverScreen.classList.remove("hidden");
  gameOverScreen.classList.add("game-over");

  // Add explosion particles
  for (let i = 0; i < 30; i++) {
    particles.addParticle(
      player.x,
      player.y,
      i % 2 === 0 ? "255, 0, 229" : "0, 243, 255"
    );
  }
}

// Event listeners
document.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    e.preventDefault();
    if (gameState === "playing") {
      player.jump();
    }
  }
});

canvas.addEventListener("click", () => {
  if (gameState === "playing") {
    player.jump();
  }
});

document.getElementById("startBtn").addEventListener("click", startGame);
document.getElementById("retryBtn").addEventListener("click", startGame);

document.getElementById("muteBtn").addEventListener("click", () => {
  isMuted = !isMuted;
  document.getElementById("muteBtn").textContent = isMuted ? "🔈" : "🔊";
});

window.addEventListener("load", () => {
  setTimeout(() => {
    document.getElementById("loadingScreen").classList.add("hidden");
    document.getElementById("startScreen").classList.remove("hidden");
    // Initial draw
    draw();
  }, 1500);
});
