/*
  Roll No 21 - Demon Fight prototype
  ---------------------------------
  This file contains all game logic for a beginner-friendly Canvas game.
  Concepts used:
  - game loop (update + render)
  - keyboard input
  - rectangle collision detection
  - simple combat + health bars
*/

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// -------------------------
// Config values
// -------------------------
const ARENA = {
  width: canvas.width,
  height: canvas.height,
};

const PLAYER_COLOR = "#4dd0e1";
const DEMON_COLOR = "#ef5350";

// -------------------------
// Game state
// -------------------------
const player = {
  x: 120,
  y: 250,
  width: 48,
  height: 48,
  speed: 4,
  color: PLAYER_COLOR,
  maxHealth: 100,
  health: 100,
  attackRange: 80,
  attackDamage: 15,
  attackCooldownMs: 450,
  lastAttackTime: 0,
};

const demon = {
  x: 680,
  y: 250,
  width: 56,
  height: 56,
  color: DEMON_COLOR,
  maxHealth: 120,
  health: 120,
  touchDamage: 6,
  touchCooldownMs: 700,
  lastTouchTime: 0,
};

const keys = {
  ArrowUp: false,
  ArrowDown: false,
  ArrowLeft: false,
  ArrowRight: false,
  w: false,
  a: false,
  s: false,
  d: false,
  " ": false,
};

let gameState = "running"; // running | win | lose

// -------------------------
// Keyboard input
// -------------------------
window.addEventListener("keydown", (event) => {
  if (event.key in keys) {
    keys[event.key] = true;
  }
});

window.addEventListener("keyup", (event) => {
  if (event.key in keys) {
    keys[event.key] = false;
  }
});

// -------------------------
// Helper functions
// -------------------------
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// Basic rectangle overlap check
function isColliding(rectA, rectB) {
  return (
    rectA.x < rectB.x + rectB.width &&
    rectA.x + rectA.width > rectB.x &&
    rectA.y < rectB.y + rectB.height &&
    rectA.y + rectA.height > rectB.y
  );
}

function centerOf(entity) {
  return {
    x: entity.x + entity.width / 2,
    y: entity.y + entity.height / 2,
  };
}

function distanceBetween(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function drawHealthBar(x, y, width, height, current, max, fillColor, label) {
  // Background bar
  ctx.fillStyle = "#2f3b5a";
  ctx.fillRect(x, y, width, height);

  // Current health bar
  const ratio = clamp(current / max, 0, 1);
  ctx.fillStyle = fillColor;
  ctx.fillRect(x, y, width * ratio, height);

  // Border + label
  ctx.strokeStyle = "#dbe4ff";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, width, height);

  ctx.fillStyle = "#ffffff";
  ctx.font = "16px Arial";
  ctx.fillText(`${label}: ${Math.max(0, Math.floor(current))}/${max}`, x, y - 6);
}

function attemptPlayerAttack(now) {
  const isAttackPressed = keys[" "];
  if (!isAttackPressed) return;

  const canAttack = now - player.lastAttackTime >= player.attackCooldownMs;
  if (!canAttack) return;

  const playerCenter = centerOf(player);
  const demonCenter = centerOf(demon);
  const distance = distanceBetween(playerCenter, demonCenter);

  // Attack only works when close enough to demon
  if (distance <= player.attackRange) {
    demon.health -= player.attackDamage;
  }

  player.lastAttackTime = now;
}

function demonTouchDamage(now) {
  if (!isColliding(player, demon)) return;

  const canDamage = now - demon.lastTouchTime >= demon.touchCooldownMs;
  if (!canDamage) return;

  player.health -= demon.touchDamage;
  demon.lastTouchTime = now;
}

function update(now) {
  if (gameState !== "running") return;

  // Movement input (supports arrow keys and WASD)
  let moveX = 0;
  let moveY = 0;

  if (keys.ArrowLeft || keys.a) moveX -= 1;
  if (keys.ArrowRight || keys.d) moveX += 1;
  if (keys.ArrowUp || keys.w) moveY -= 1;
  if (keys.ArrowDown || keys.s) moveY += 1;

  player.x += moveX * player.speed;
  player.y += moveY * player.speed;

  // Keep player inside arena
  player.x = clamp(player.x, 0, ARENA.width - player.width);
  player.y = clamp(player.y, 0, ARENA.height - player.height);

  attemptPlayerAttack(now);
  demonTouchDamage(now);

  // Win/Lose checks
  if (demon.health <= 0) {
    gameState = "win";
  } else if (player.health <= 0) {
    gameState = "lose";
  }
}

function drawArenaBackground() {
  // Simple arena floor
  const gradient = ctx.createLinearGradient(0, 0, 0, ARENA.height);
  gradient.addColorStop(0, "#273a66");
  gradient.addColorStop(1, "#151d32");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, ARENA.width, ARENA.height);

  // Decorative grid lines
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 1;
  for (let x = 0; x < ARENA.width; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, ARENA.height);
    ctx.stroke();
  }
  for (let y = 0; y < ARENA.height; y += 60) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(ARENA.width, y);
    ctx.stroke();
  }
}

function drawEntities() {
  // Player placeholder (blue rectangle)
  ctx.fillStyle = player.color;
  ctx.fillRect(player.x, player.y, player.width, player.height);

  // Demon placeholder (red rectangle)
  ctx.fillStyle = demon.color;
  ctx.fillRect(demon.x, demon.y, demon.width, demon.height);

  // Optional attack range hint circle around player
  ctx.strokeStyle = "rgba(77, 208, 225, 0.2)";
  ctx.lineWidth = 2;
  const p = centerOf(player);
  ctx.beginPath();
  ctx.arc(p.x, p.y, player.attackRange, 0, Math.PI * 2);
  ctx.stroke();
}

function drawGameStateText() {
  if (gameState === "running") return;

  ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
  ctx.fillRect(0, 0, ARENA.width, ARENA.height);

  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.font = "bold 48px Arial";

  const message = gameState === "win" ? "You Win!" : "You Lose!";
  ctx.fillText(message, ARENA.width / 2, ARENA.height / 2);

  ctx.font = "20px Arial";
  ctx.fillText("Refresh page to play again", ARENA.width / 2, ARENA.height / 2 + 40);

  // Reset align so other text draws normally
  ctx.textAlign = "left";
}

function render() {
  drawArenaBackground();
  drawEntities();

  // Top UI: health bars
  drawHealthBar(20, 30, 280, 22, player.health, player.maxHealth, "#4dd0e1", "Player");
  drawHealthBar(ARENA.width - 300, 30, 280, 22, demon.health, demon.maxHealth, "#ef5350", "Demon");

  drawGameStateText();
}

function gameLoop(now) {
  update(now);
  render();
  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
