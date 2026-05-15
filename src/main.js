/*
  Roll No 21 - Demon Fight prototype (Milestone 2)
  -----------------------------------------------
  This file contains all game logic for a beginner-friendly Canvas game.
  Concepts used:
  - game loop (update + render)
  - keyboard input
  - player movement + facing direction
  - projectile (arrow) creation and update
  - collision detection
  - demon AI and combat
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
  // Facing direction remembers where the player moved last.
  facingX: 1,
  facingY: 0,
  attackCooldownMs: 280,
  lastAttackTime: -9999,
};

const demon = {
  x: 680,
  y: 250,
  width: 56,
  height: 56,
  color: DEMON_COLOR,
  maxHealth: 120,
  health: 120,
  speed: 1.4,
  rageSpeed: 2.1,
  touchDamage: 10,
  touchRange: 44,
  touchCooldownMs: 800,
  lastTouchTime: -9999,
  flashDurationMs: 120,
  flashUntil: 0,
};

const arrowConfig = {
  speed: 9,
  width: 18,
  height: 6,
  damage: 20,
  knockback: 15,
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
  r: false,
  R: false,
};

// Active arrows fired by the player.
const arrows = [];

// Simple shooting visual effects.
const shootEffects = [];

let gameState = "running"; // running | win | lose

// -------------------------
// Keyboard input
// -------------------------
window.addEventListener("keydown", (event) => {
  if (event.key in keys) {
    keys[event.key] = true;
  }

  // Restart with R key when game is over.
  if ((event.key === "r" || event.key === "R") && gameState !== "running") {
    resetGame();
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

// Basic rectangle overlap check.
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
  ctx.fillStyle = "#2f3b5a";
  ctx.fillRect(x, y, width, height);

  const ratio = clamp(current / max, 0, 1);
  ctx.fillStyle = fillColor;
  ctx.fillRect(x, y, width * ratio, height);

  ctx.strokeStyle = "#dbe4ff";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, width, height);

  ctx.fillStyle = "#ffffff";
  ctx.font = "16px Arial";
  ctx.fillText(`${label}: ${Math.max(0, Math.floor(current))}/${max}`, x, y - 6);
}

function normalizeDirection(x, y) {
  const length = Math.sqrt(x * x + y * y);
  if (length === 0) return { x: 1, y: 0 };
  return { x: x / length, y: y / length };
}

// -------------------------
// Player movement + facing direction
// -------------------------
function updatePlayerMovement() {
  let moveX = 0;
  let moveY = 0;

  if (keys.ArrowLeft || keys.a) moveX -= 1;
  if (keys.ArrowRight || keys.d) moveX += 1;
  if (keys.ArrowUp || keys.w) moveY -= 1;
  if (keys.ArrowDown || keys.s) moveY += 1;

  // Track last movement direction so shooting knows where to go.
  if (moveX !== 0 || moveY !== 0) {
    const facing = normalizeDirection(moveX, moveY);
    player.facingX = facing.x;
    player.facingY = facing.y;
  }

  player.x += moveX * player.speed;
  player.y += moveY * player.speed;

  player.x = clamp(player.x, 0, ARENA.width - player.width);
  player.y = clamp(player.y, 0, ARENA.height - player.height);
}

// -------------------------
// Arrow creation (shooting)
// -------------------------
function shootArrow(now) {
  const canShoot = now - player.lastAttackTime >= player.attackCooldownMs;
  if (!canShoot) return;

  const playerCenter = centerOf(player);

  arrows.push({
    x: playerCenter.x - arrowConfig.width / 2,
    y: playerCenter.y - arrowConfig.height / 2,
    width: arrowConfig.width,
    height: arrowConfig.height,
    vx: player.facingX * arrowConfig.speed,
    vy: player.facingY * arrowConfig.speed,
  });

  // Small visual effect where the arrow is fired.
  shootEffects.push({
    x: playerCenter.x,
    y: playerCenter.y,
    radius: 4,
    maxRadius: 14,
    life: 10,
  });

  player.lastAttackTime = now;
}

function handleShootingInput(now) {
  if (!keys[" "]) return;
  shootArrow(now);
}

// -------------------------
// Arrow update + collision detection
// -------------------------
function updateArrows(now) {
  for (let i = arrows.length - 1; i >= 0; i -= 1) {
    const arrow = arrows[i];

    // Move arrow every frame.
    arrow.x += arrow.vx;
    arrow.y += arrow.vy;

    // Remove arrows that leave the arena.
    const outOfBounds =
      arrow.x + arrow.width < 0 ||
      arrow.x > ARENA.width ||
      arrow.y + arrow.height < 0 ||
      arrow.y > ARENA.height;

    if (outOfBounds) {
      arrows.splice(i, 1);
      continue;
    }

    // Collision detection: arrow hits demon.
    if (isColliding(arrow, demon)) {
      demon.health -= arrowConfig.damage;
      demon.flashUntil = now + demon.flashDurationMs;

      // Knock demon back in arrow travel direction.
      demon.x += arrow.vx > 0 ? arrowConfig.knockback : arrow.vx < 0 ? -arrowConfig.knockback : 0;
      demon.y += arrow.vy > 0 ? arrowConfig.knockback : arrow.vy < 0 ? -arrowConfig.knockback : 0;
      demon.x = clamp(demon.x, 0, ARENA.width - demon.width);
      demon.y = clamp(demon.y, 0, ARENA.height - demon.height);

      arrows.splice(i, 1);
    }
  }

  // Update and fade shooting effects.
  for (let i = shootEffects.length - 1; i >= 0; i -= 1) {
    const effect = shootEffects[i];
    effect.radius += (effect.maxRadius - effect.radius) * 0.25;
    effect.life -= 1;
    if (effect.life <= 0) {
      shootEffects.splice(i, 1);
    }
  }
}

// -------------------------
// Demon AI (chase + attack)
// -------------------------
function updateDemonAI(now) {
  const playerCenter = centerOf(player);
  const demonCenter = centerOf(demon);

  const dx = playerCenter.x - demonCenter.x;
  const dy = playerCenter.y - demonCenter.y;
  const direction = normalizeDirection(dx, dy);

  // Demon gets faster when health is below 50%.
  const currentSpeed = demon.health <= demon.maxHealth * 0.5 ? demon.rageSpeed : demon.speed;

  // Chase player each frame.
  demon.x += direction.x * currentSpeed;
  demon.y += direction.y * currentSpeed;

  demon.x = clamp(demon.x, 0, ARENA.width - demon.width);
  demon.y = clamp(demon.y, 0, ARENA.height - demon.height);

  // Demon damages player only when close enough and cooldown allows.
  const updatedDemonCenter = centerOf(demon);
  const dist = distanceBetween(playerCenter, updatedDemonCenter);
  const canDamage = now - demon.lastTouchTime >= demon.touchCooldownMs;

  if (dist <= demon.touchRange && canDamage) {
    player.health -= demon.touchDamage;
    demon.lastTouchTime = now;
  }
}

function resetGame() {
  player.x = 120;
  player.y = 250;
  player.health = player.maxHealth;
  player.facingX = 1;
  player.facingY = 0;
  player.lastAttackTime = -9999;

  demon.x = 680;
  demon.y = 250;
  demon.health = demon.maxHealth;
  demon.lastTouchTime = -9999;
  demon.flashUntil = 0;

  arrows.length = 0;
  shootEffects.length = 0;

  gameState = "running";
}

// -------------------------
// Game loop (update + render)
// -------------------------
function update(now) {
  if (gameState !== "running") return;

  updatePlayerMovement();
  handleShootingInput(now);
  updateArrows(now);
  updateDemonAI(now);

  // Win/Lose checks.
  if (demon.health <= 0) {
    gameState = "win";
  } else if (player.health <= 0) {
    gameState = "lose";
  }
}

function drawArenaBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, ARENA.height);
  gradient.addColorStop(0, "#273a66");
  gradient.addColorStop(1, "#151d32");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, ARENA.width, ARENA.height);

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

function drawPlayerFacingHint() {
  const p = centerOf(player);
  const tipX = p.x + player.facingX * 20;
  const tipY = p.y + player.facingY * 20;

  ctx.strokeStyle = "#b3f3ff";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();
}

function drawArrows() {
  ctx.fillStyle = "#ffd166";

  for (const arrow of arrows) {
    ctx.save();
    const angle = Math.atan2(arrow.vy, arrow.vx);
    ctx.translate(arrow.x + arrow.width / 2, arrow.y + arrow.height / 2);
    ctx.rotate(angle);

    // Simple arrow look: body rectangle + tiny triangle tip.
    ctx.fillRect(-arrow.width / 2, -arrow.height / 2, arrow.width - 6, arrow.height);
    ctx.beginPath();
    ctx.moveTo(arrow.width / 2, 0);
    ctx.lineTo(arrow.width / 2 - 6, -arrow.height / 2 - 1);
    ctx.lineTo(arrow.width / 2 - 6, arrow.height / 2 + 1);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
}

function drawShootEffects() {
  for (const effect of shootEffects) {
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 230, 160, ${effect.life / 10})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function drawEntities(now) {
  ctx.fillStyle = player.color;
  ctx.fillRect(player.x, player.y, player.width, player.height);

  // Demon flashes briefly when damaged.
  const isFlashing = now < demon.flashUntil;
  ctx.fillStyle = isFlashing ? "#fff176" : demon.color;
  ctx.fillRect(demon.x, demon.y, demon.width, demon.height);

  drawPlayerFacingHint();
  drawArrows();
  drawShootEffects();
}

function drawInstructions() {
  ctx.fillStyle = "#e9f0ff";
  ctx.font = "16px Arial";
  ctx.fillText("Space: Shoot Arrow", 20, ARENA.height - 40);
  ctx.fillText("Move: WASD / Arrow Keys", 20, ARENA.height - 18);
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
  ctx.fillText("Press R to restart", ARENA.width / 2, ARENA.height / 2 + 40);

  ctx.textAlign = "left";
}

function render(now) {
  drawArenaBackground();
  drawEntities(now);

  drawHealthBar(20, 30, 280, 22, player.health, player.maxHealth, "#4dd0e1", "Player");
  drawHealthBar(ARENA.width - 300, 30, 280, 22, demon.health, demon.maxHealth, "#ef5350", "Demon");

  drawInstructions();
  drawGameStateText();
}

function gameLoop(now) {
  update(now);
  render(now);
  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
