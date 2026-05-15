/*
  Milestone 3 - Turn-based attack-and-defence duel
  -------------------------------------------------
  This version replaces real-time movement with a beginner-friendly
  state machine where one round = player choice + demon response.
*/

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const GAME_STATE = {
  SELECT_ATTACK: "SELECT_ATTACK",
  SELECT_DEFENCE: "SELECT_DEFENCE",
  READY_TO_RESOLVE: "READY_TO_RESOLVE",
  PLAYER_ATTACK_RESOLVE: "PLAYER_ATTACK_RESOLVE",
  DEMON_TURN: "DEMON_TURN",
  ROUND_END: "ROUND_END",
  WIN: "WIN",
  GAME_OVER: "GAME_OVER",
};

const attacks = [
  { name: "Arrow Shot", damage: 15, hitChance: 1.0, key: "1", effect: "arrow" },
  { name: "Flame Strike", damage: 20, hitChance: 0.82, key: "2", effect: "flame" },
  { name: "Heavy Slash", damage: 25, hitChance: 0.65, key: "3", effect: "slash" },
  null,
];

const defences = [
  { name: "Wooden Shield", key: "q", type: "shield" },
  { name: "Dodge Charm", key: "w", type: "dodge" },
  { name: "Counter Guard", key: "e", type: "counter" },
  null,
];

const demonAttacks = [
  { name: "Claw Hit", damage: 10 },
  { name: "Tail Strike", damage: 15 },
  { name: "Dark Blast", damage: 22 },
];

const player = { maxHp: 100, hp: 100 };
const demon = { maxHp: 120, hp: 120 };

let gameState = GAME_STATE.SELECT_ATTACK;
let roundNumber = 1;
let selectedAttackIndex = null;
let selectedDefenceIndex = null;
let message = "Select your attack.";
let pendingDemonAttack = null;

const floatingTexts = [];
const activeEffects = [];

const ui = {
  attackSlots: [],
  defenceSlots: [],
  doneButton: { x: 350, y: 432, width: 140, height: 42 },
};

function setupUiLayout() {
  const slotW = 170;
  const slotH = 44;
  const gap = 8;
  const leftX = 34;
  const attackStartY = 305;
  const defenceStartY = 305 + (slotH + gap) * 2 + 22;

  ui.attackSlots = Array.from({ length: 4 }, (_, i) => ({
    x: leftX + (i % 2) * (slotW + gap),
    y: attackStartY + Math.floor(i / 2) * (slotH + gap),
    width: slotW,
    height: slotH,
  }));

  ui.defenceSlots = Array.from({ length: 4 }, (_, i) => ({
    x: leftX + (i % 2) * (slotW + gap),
    y: defenceStartY + Math.floor(i / 2) * (slotH + gap),
    width: slotW,
    height: slotH,
  }));
}

function addFloatingText(text, x, y, color = "#ffffff") {
  // Floating damage text objects move upward and fade over time.
  floatingTexts.push({ text, x, y, color, life: 70, vy: -0.5 });
}

function addEffect(type) {
  activeEffects.push({ type, life: 24 });
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function randomItem(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function setMessage(text) {
  message = text;
}

function resetGame() {
  player.hp = player.maxHp;
  demon.hp = demon.maxHp;
  gameState = GAME_STATE.SELECT_ATTACK;
  roundNumber = 1;
  selectedAttackIndex = null;
  selectedDefenceIndex = null;
  pendingDemonAttack = null;
  floatingTexts.length = 0;
  activeEffects.length = 0;
  setMessage("Select your attack.");
}

// Attack selection logic.
function selectAttack(index) {
  if (gameState !== GAME_STATE.SELECT_ATTACK) return;
  if (!attacks[index]) return;
  selectedAttackIndex = index;
  gameState = GAME_STATE.SELECT_DEFENCE;
  setMessage("Select your defence.");
}

// Defence selection logic.
function selectDefence(index) {
  if (gameState !== GAME_STATE.SELECT_DEFENCE) return;
  if (!defences[index]) return;
  selectedDefenceIndex = index;
  gameState = GAME_STATE.READY_TO_RESOLVE;
  setMessage("Press Done, Space, or Enter to resolve the turn.");
}

// Done button / resolve flow.
function triggerDone() {
  if (gameState !== GAME_STATE.READY_TO_RESOLVE) return;
  gameState = GAME_STATE.PLAYER_ATTACK_RESOLVE;
  resolvePlayerAttack();
}

// Player attack resolve step.
function resolvePlayerAttack() {
  const attack = attacks[selectedAttackIndex];
  setMessage(`You used ${attack.name}!`);
  addEffect(attack.effect);

  setTimeout(() => {
    const hit = Math.random() <= attack.hitChance;
    if (hit) {
      demon.hp = clamp(demon.hp - attack.damage, 0, demon.maxHp);
      addFloatingText(`-${attack.damage}`, 680, 220, "#ffcc66");
      setMessage(`Demon took ${attack.damage} damage.`);
    } else {
      setMessage(`${attack.name} missed!`);
      addFloatingText("MISS", 680, 220, "#ffd1dc");
    }

    if (demon.hp <= 0) {
      gameState = GAME_STATE.WIN;
      setMessage("You won the duel! Press R to restart.");
      return;
    }

    gameState = GAME_STATE.DEMON_TURN;
    setTimeout(resolveDemonTurn, 650);
  }, 700);
}

// Enemy turn and damage calculation.
function resolveDemonTurn() {
  pendingDemonAttack = randomItem(demonAttacks);
  setMessage(`Demon used ${pendingDemonAttack.name}!`);
  let damage = pendingDemonAttack.damage;
  const defence = defences[selectedDefenceIndex];

  if (defence.type === "shield") {
    damage = Math.round(damage * 0.4);
    setMessage(`Demon used ${pendingDemonAttack.name}! Wooden Shield reduced the damage.`);
    addEffect("shield");
  } else if (defence.type === "dodge") {
    addEffect("dodge");
    if (Math.random() < 0.5) {
      damage = 0;
      setMessage("Dodge Charm avoided all damage!");
    } else {
      setMessage("Dodge Charm failed! You were hit.");
    }
  } else if (defence.type === "counter") {
    damage = Math.round(damage * 0.7);
    demon.hp = clamp(demon.hp - 8, 0, demon.maxHp);
    addFloatingText("-8", 680, 250, "#8fffa9");
    addEffect("counter");
    setMessage("Counter Guard reduced damage and reflected 8 damage.");
  }

  if (damage > 0) {
    player.hp = clamp(player.hp - damage, 0, player.maxHp);
    addFloatingText(`-${damage}`, 220, 220, "#ff8a80");
  } else {
    addFloatingText("0", 220, 220, "#b3e5fc");
  }

  if (demon.hp <= 0) {
    gameState = GAME_STATE.WIN;
    setMessage("Counter finished the demon! Press R to restart.");
    return;
  }

  if (player.hp <= 0) {
    gameState = GAME_STATE.GAME_OVER;
    setMessage("You were defeated. Press R to restart.");
    return;
  }

  gameState = GAME_STATE.ROUND_END;
  setTimeout(startNextRound, 750);
}

function startNextRound() {
  if (gameState !== GAME_STATE.ROUND_END) return;
  roundNumber += 1;
  selectedAttackIndex = null;
  selectedDefenceIndex = null;
  pendingDemonAttack = null;
  gameState = GAME_STATE.SELECT_ATTACK;
  setMessage("Select your attack.");
}

function slotAtPoint(list, x, y) {
  return list.findIndex((slot) => x >= slot.x && x <= slot.x + slot.width && y >= slot.y && y <= slot.y + slot.height);
}

canvas.addEventListener("click", (event) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = (event.clientX - rect.left) * scaleX;
  const y = (event.clientY - rect.top) * scaleY;

  const attackIndex = slotAtPoint(ui.attackSlots, x, y);
  if (attackIndex !== -1) selectAttack(attackIndex);

  const defenceIndex = slotAtPoint(ui.defenceSlots, x, y);
  if (defenceIndex !== -1) selectDefence(defenceIndex);

  const d = ui.doneButton;
  const inDone = x >= d.x && x <= d.x + d.width && y >= d.y && y <= d.y + d.height;
  if (inDone) triggerDone();
});

window.addEventListener("keydown", (event) => {
  const key = event.key;

  if (key === "r" || key === "R") {
    resetGame();
    return;
  }

  if (["1", "2", "3"].includes(key)) {
    selectAttack(Number(key) - 1);
  }

  if (key.toLowerCase() === "q") selectDefence(0);
  if (key.toLowerCase() === "w") selectDefence(1);
  if (key.toLowerCase() === "e") selectDefence(2);

  if (key === " " || key === "Enter") {
    event.preventDefault();
    triggerDone();
  }
});

function updateFloatingTexts() {
  for (let i = floatingTexts.length - 1; i >= 0; i -= 1) {
    const item = floatingTexts[i];
    item.y += item.vy;
    item.life -= 1;
    if (item.life <= 0) floatingTexts.splice(i, 1);
  }
}

function updateEffects() {
  for (let i = activeEffects.length - 1; i >= 0; i -= 1) {
    activeEffects[i].life -= 1;
    if (activeEffects[i].life <= 0) activeEffects.splice(i, 1);
  }
}

function drawHealthBar(x, y, w, h, hp, maxHp, color, label) {
  ctx.fillStyle = "#243554";
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w * (hp / maxHp), h);
  ctx.strokeStyle = "#d8e5ff";
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = "#ffffff";
  ctx.font = "15px Arial";
  ctx.fillText(`${label}: ${hp}/${maxHp}`, x, y - 6);
}

function drawSlot(slot, item, selected, disabled, subtitle = "") {
  ctx.fillStyle = disabled ? "#2f3340" : "#1f2f52";
  ctx.fillRect(slot.x, slot.y, slot.width, slot.height);
  ctx.strokeStyle = selected ? "#ffe082" : "#8fb3ff";
  ctx.lineWidth = selected ? 3 : 1.4;
  ctx.strokeRect(slot.x, slot.y, slot.width, slot.height);

  ctx.fillStyle = disabled ? "#848a96" : "#ffffff";
  ctx.font = "14px Arial";
  if (item) {
    ctx.fillText(item.name, slot.x + 10, slot.y + 19);
    ctx.font = "12px Arial";
    ctx.fillStyle = "#c9d8ff";
    ctx.fillText(subtitle, slot.x + 10, slot.y + 35);
  } else {
    ctx.fillText("Empty Slot", slot.x + 10, slot.y + 27);
  }
}

function drawEffects() {
  for (const e of activeEffects) {
    const alpha = e.life / 24;
    ctx.globalAlpha = alpha;

    if (e.type === "arrow") {
      ctx.strokeStyle = "#ffd54f";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(260, 248);
      ctx.lineTo(620, 248);
      ctx.stroke();
      ctx.fillStyle = "#ffd54f";
      ctx.fillRect(614, 244, 12, 8);
    }

    if (e.type === "flame") {
      ctx.fillStyle = "#ff8f00";
      ctx.beginPath();
      ctx.arc(680, 248, 20 + (24 - e.life), 0, Math.PI * 2);
      ctx.fill();
    }

    if (e.type === "slash") {
      ctx.strokeStyle = "#ff5252";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(670, 250, 34, Math.PI * 1.1, Math.PI * 1.8);
      ctx.stroke();
    }

    if (e.type === "shield") {
      ctx.strokeStyle = "#90caf9";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(220, 250, 42, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (e.type === "dodge") {
      ctx.fillStyle = "#e1f5fe";
      ctx.fillRect(180, 210, 80, 80);
    }

    if (e.type === "counter") {
      ctx.strokeStyle = "#69f0ae";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(250, 245);
      ctx.lineTo(640, 245);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#0f1728";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawHealthBar(30, 24, 280, 22, player.hp, player.maxHp, "#4dd0e1", "Player");
  drawHealthBar(590, 24, 280, 22, demon.hp, demon.maxHp, "#ef5350", "Demon");

  ctx.fillStyle = "#ffffff";
  ctx.font = "20px Arial";
  ctx.textAlign = "center";
  ctx.fillText(`Round ${roundNumber}`, canvas.width / 2, 38);
  ctx.textAlign = "left";

  // Character placeholders facing each other.
  ctx.fillStyle = "#4dd0e1";
  ctx.fillRect(180, 210, 80, 80);
  ctx.fillStyle = "#ef5350";
  ctx.fillRect(640, 210, 80, 80);

  drawEffects();

  ctx.fillStyle = "#12203b";
  ctx.fillRect(20, 286, 510, 200);
  ctx.strokeStyle = "#3e5c9a";
  ctx.strokeRect(20, 286, 510, 200);

  ctx.fillStyle = "#ffffff";
  ctx.font = "16px Arial";
  ctx.fillText("Attack Items", 34, 300);

  ui.attackSlots.forEach((slot, i) => {
    const atk = attacks[i];
    drawSlot(slot, atk, selectedAttackIndex === i, !atk, atk ? `Dmg ${atk.damage}` : "");
  });

  ctx.fillStyle = "#ffffff";
  ctx.fillText("Defence Items", 34, 410);

  ui.defenceSlots.forEach((slot, i) => {
    const def = defences[i];
    let subtitle = "";
    if (def?.type === "shield") subtitle = "Guards 60%";
    if (def?.type === "dodge") subtitle = "50% full dodge";
    if (def?.type === "counter") subtitle = "30% cut + reflect 8";
    drawSlot(slot, def, selectedDefenceIndex === i, !def, subtitle);
  });

  const d = ui.doneButton;
  ctx.fillStyle = gameState === GAME_STATE.READY_TO_RESOLVE ? "#43a047" : "#546e7a";
  ctx.fillRect(d.x, d.y, d.width, d.height);
  ctx.strokeStyle = "#e8f5e9";
  ctx.strokeRect(d.x, d.y, d.width, d.height);
  ctx.fillStyle = "#ffffff";
  ctx.font = "18px Arial";
  ctx.fillText("Done", d.x + 46, d.y + 27);

  // Tutorial / message box that changes by phase.
  ctx.fillStyle = "#101b30";
  ctx.fillRect(545, 305, 330, 181);
  ctx.strokeStyle = "#3e5c9a";
  ctx.strokeRect(545, 305, 330, 181);
  ctx.fillStyle = "#fff";
  ctx.font = "16px Arial";
  ctx.fillText("Message", 558, 328);
  ctx.font = "15px Arial";
  ctx.fillText(message, 558, 355);

  for (const t of floatingTexts) {
    ctx.globalAlpha = t.life / 70;
    ctx.fillStyle = t.color;
    ctx.font = "24px Arial";
    ctx.fillText(t.text, t.x, t.y);
    ctx.globalAlpha = 1;
  }
}

function loop() {
  updateFloatingTexts();
  updateEffects();
  draw();
  requestAnimationFrame(loop);
}

setupUiLayout();
resetGame();
loop();
