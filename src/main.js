/*
  Milestone 4 - Turn-based duel with visible action timeline
  ----------------------------------------------------------
  Beginner-friendly animation system where damage is applied only when
  visual effects connect. Input is locked during resolution so one round
  plays like a clear mini cutscene.
*/

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

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
  { name: "Claw Hit", damage: 10, effect: "claw" },
  { name: "Tail Strike", damage: 15, effect: "tail" },
  { name: "Dark Blast", damage: 22, effect: "dark" },
];

const player = { maxHp: 100, hp: 100, x: 220, y: 250, flash: 0, dodgeOffset: 0 };
const demon = { maxHp: 120, hp: 120, x: 680, y: 250, flash: 0 };

const floatingTexts = [];
const effects = [];
const roundSequence = [];

let roundNumber = 1;
let selectedAttackIndex = null;
let selectedDefenceIndex = null;
let pendingDemonAttack = null;
let message = "Select your attack.";
let isResolvingTurn = false;
let roundResultText = "";

const ui = {
  attackSlots: [],
  defenceSlots: [],
  doneButton: { x: 364, y: 438, width: 172, height: 48 },
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function randomItem(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function setMessage(text) {
  message = text;
}

function setupUiLayout() {
  const slotW = 158;
  const slotH = 50;
  const gap = 10;
  const leftX = 24;
  const attackStartY = 306;
  const defenceStartY = 424;

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
  // Floating text objects are updated every frame to rise and fade.
  floatingTexts.push({ text, x, y, color, life: 55, maxLife: 55, vy: -0.7 });
}

function addEffect(effect) {
  // Effect objects hold their own state and decide when they are finished.
  effects.push(effect);
}

function createProjectile(type, from, to, onConnect) {
  return {
    type,
    x: from.x,
    y: from.y,
    toX: to.x,
    toY: to.y,
    speed: 7,
    connected: false,
    done: false,
    onConnect,
  };
}

function createTimedEffect(type, life, extra = {}) {
  return { type, life, maxLife: life, done: false, ...extra };
}

function queueStep(delayMs, action) {
  // Round timeline: each step waits for delay and then runs action.
  roundSequence.push({ delayMs, action });
}

function clearTurnChoices() {
  selectedAttackIndex = null;
  selectedDefenceIndex = null;
  pendingDemonAttack = null;
}

function resetGame() {
  player.hp = player.maxHp;
  demon.hp = demon.maxHp;
  player.flash = 0;
  demon.flash = 0;
  player.dodgeOffset = 0;
  roundNumber = 1;
  clearTurnChoices();
  floatingTexts.length = 0;
  effects.length = 0;
  roundSequence.length = 0;
  isResolvingTurn = false;
  roundResultText = "";
  setMessage("Select your attack.");
}

function canSelectAttack() {
  return !isResolvingTurn && selectedAttackIndex === null;
}

function canSelectDefence() {
  return !isResolvingTurn && selectedAttackIndex !== null && selectedDefenceIndex === null;
}

function canPressDone() {
  return !isResolvingTurn && selectedAttackIndex !== null && selectedDefenceIndex !== null;
}

function selectAttack(index) {
  if (!canSelectAttack() || !attacks[index]) return;
  selectedAttackIndex = index;
  setMessage("Select your defence.");
}

function selectDefence(index) {
  if (!canSelectDefence() || !defences[index]) return;
  selectedDefenceIndex = index;
  setMessage("Press Done to resolve the turn.");
}

function startRoundResolve() {
  if (!canPressDone() || player.hp <= 0 || demon.hp <= 0) return;

  isResolvingTurn = true; // Input lock: only restart is allowed while animating.
  roundSequence.length = 0;
  roundResultText = "";

  const attack = attacks[selectedAttackIndex];
  const defence = defences[selectedDefenceIndex];
  pendingDemonAttack = randomItem(demonAttacks);

  queueStep(100, () => setMessage(`You used ${attack.name}!`));
  queueStep(200, () => playPlayerAttack(attack));
  queueStep(450, () => setMessage(`Demon used ${pendingDemonAttack.name}!`));
  queueStep(200, () => playDemonAttackWithDefence(pendingDemonAttack, defence));
  queueStep(350, () => {
    setMessage(roundResultText || `Round ${roundNumber} complete.`);
  });
  queueStep(900, () => {
    if (player.hp <= 0 || demon.hp <= 0) {
      endBattle();
      return;
    }
    roundNumber += 1;
    clearTurnChoices();
    isResolvingTurn = false;
    setMessage(`Round ${roundNumber} begins.`);
    setTimeout(() => {
      if (!isResolvingTurn) setMessage("Select your attack.");
    }, 650);
  });

  runNextStep();
}

function runNextStep() {
  if (roundSequence.length === 0) return;
  const step = roundSequence.shift();
  setTimeout(() => {
    step.action();
    runNextStep();
  }, step.delayMs);
}

function playPlayerAttack(attack) {
  const connected = () => {
    const hit = Math.random() <= attack.hitChance;
    if (!hit) {
      setMessage(`${attack.name} missed!`);
      addFloatingText("MISS", demon.x - 10, demon.y - 54, "#9ecbff");
      return;
    }

    demon.hp = clamp(demon.hp - attack.damage, 0, demon.maxHp);
    demon.flash = 10;
    addFloatingText(`-${attack.damage}`, demon.x - 16, demon.y - 56, "#ff6b6b");
    addEffect(createTimedEffect("hitBurst", 14, { x: demon.x, y: demon.y }));
    setMessage(`Demon took ${attack.damage} damage.`);

    if (demon.hp <= 0) {
      roundResultText = "The demon collapses!";
    }
  };

  if (attack.effect === "slash") {
    addEffect(createTimedEffect("slashNearDemon", 18, { x: demon.x - 22, y: demon.y - 8, onConnect: connected, applied: false }));
    return;
  }

  const colorType = attack.effect === "arrow" ? "arrow" : "flame";
  addEffect(createProjectile(colorType, { x: player.x + 26, y: player.y - 8 }, { x: demon.x - 22, y: demon.y - 10 }, connected));
}

function playDemonAttackWithDefence(demonAttack, defence) {
  addDefenceEffect(defence, demonAttack);

  const applyIncomingDamage = () => {
    let damage = demonAttack.damage;
    let dodgeSuccess = false;

    if (defence.type === "shield") {
      damage = Math.round(damage * 0.4);
      addFloatingText("Blocked", player.x - 22, player.y - 62, "#6fc8ff");
      setMessage("Wooden Shield reduced the damage.");
    } else if (defence.type === "dodge") {
      dodgeSuccess = Math.random() < 0.5;
      if (dodgeSuccess) {
        damage = 0;
        addFloatingText("Dodged!", player.x - 18, player.y - 62, "#6ef3a5");
        setMessage("Dodged!");
      } else {
        setMessage("Dodge failed!");
      }
    } else if (defence.type === "counter") {
      damage = Math.round(damage * 0.7);
      addFloatingText("Blocked", player.x - 22, player.y - 62, "#6fc8ff");
      demon.hp = clamp(demon.hp - 8, 0, demon.maxHp);
      demon.flash = 8;
      addFloatingText("Counter -8", demon.x - 40, demon.y - 62, "#82ff9e");
      addEffect(createTimedEffect("counterHit", 14, { x: demon.x - 10, y: demon.y - 2 }));
      setMessage("Counter Guard reflected damage.");
      if (demon.hp <= 0) roundResultText = "Counter Guard finished the demon!";
    }

    if (damage > 0) {
      player.hp = clamp(player.hp - damage, 0, player.maxHp);
      player.flash = 10;
      addFloatingText(`-${damage}`, player.x - 14, player.y - 58, "#ff6b6b");
      setMessage(`You took ${damage} damage.`);
    }

    if (damage === 0 && defence.type !== "counter") {
      addFloatingText("0", player.x - 5, player.y - 58, "#6ef3a5");
    }

    if (player.hp <= 0) roundResultText = "You were defeated.";
    if (!roundResultText) roundResultText = `Round ${roundNumber} resolved.`;
  };

  if (demonAttack.effect === "claw") {
    addEffect(createTimedEffect("claw", 16, { x: player.x + 5, y: player.y - 8, onConnect: applyIncomingDamage, applied: false }));
  } else if (demonAttack.effect === "tail") {
    addEffect(createTimedEffect("tail", 20, { x: player.x + 50, y: player.y - 5, onConnect: applyIncomingDamage, applied: false, sweep: 0 }));
  } else {
    addEffect(createProjectile("dark", { x: demon.x - 26, y: demon.y - 8 }, { x: player.x + 16, y: player.y - 10 }, applyIncomingDamage));
  }
}

function addDefenceEffect(defence) {
  if (defence.type === "shield") addEffect(createTimedEffect("shield", 24, { x: player.x + 14, y: player.y - 5 }));
  if (defence.type === "dodge") addEffect(createTimedEffect("dodge", 22, { x: player.x, y: player.y }));
  if (defence.type === "counter") addEffect(createTimedEffect("counter", 24, { x: player.x + 12, y: player.y - 6 }));
}

function endBattle() {
  isResolvingTurn = false;
  if (demon.hp <= 0) {
    setMessage("You won the duel! Press R to restart.");
  } else if (player.hp <= 0) {
    setMessage("You were defeated. Press R to restart.");
  }
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
  if (inDone) startRoundResolve();
});

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();

  if (key === "r") {
    resetGame();
    return;
  }

  if (isResolvingTurn) return;

  if (["1", "2", "3"].includes(key)) selectAttack(Number(key) - 1);
  if (key === "q") selectDefence(0);
  if (key === "w") selectDefence(1);
  if (key === "e") selectDefence(2);

  if (event.key === " " || event.key === "Enter") {
    event.preventDefault();
    startRoundResolve();
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
  for (let i = effects.length - 1; i >= 0; i -= 1) {
    const e = effects[i];

    if (e.type === "arrow" || e.type === "flame" || e.type === "dark") {
      const dx = e.toX - e.x;
      const dy = e.toY - e.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= e.speed) {
        e.x = e.toX;
        e.y = e.toY;
        if (!e.connected && e.onConnect) e.onConnect(); // Damage timing: only on connect frame.
        e.connected = true;
        e.done = true;
        if (e.type === "flame") addEffect(createTimedEffect("flameBurst", 16, { x: e.x, y: e.y }));
      } else {
        e.x += (dx / dist) * e.speed;
        e.y += (dy / dist) * e.speed;
      }
    } else {
      e.life -= 1;
      if ((e.type === "slashNearDemon" || e.type === "claw" || e.type === "tail") && !e.applied && e.life <= Math.floor(e.maxLife / 2)) {
        e.applied = true;
        if (e.onConnect) e.onConnect();
      }
      if (e.type === "dodge") {
        const progress = 1 - e.life / e.maxLife;
        player.dodgeOffset = Math.sin(progress * Math.PI) * 18;
      }
      if (e.life <= 0) {
        if (e.type === "dodge") player.dodgeOffset = 0;
        e.done = true;
      }
    }

    if (e.done) effects.splice(i, 1);
  }

  if (player.flash > 0) player.flash -= 1;
  if (demon.flash > 0) demon.flash -= 1;
}

function drawHealthBar(x, y, w, h, hp, maxHp, color, label) {
  ctx.fillStyle = "#243554";
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w * clamp(hp / maxHp, 0, 1), h);
  ctx.strokeStyle = "#d8e5ff";
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = "#ffffff";
  ctx.font = "15px Arial";
  ctx.fillText(`${label}: ${hp}/${maxHp}`, x, y - 6);
}

function drawSlot(slot, item, selected, disabled, subtitle = "") {
  ctx.fillStyle = disabled ? "#2a2e39" : "#1f2f52";
  ctx.fillRect(slot.x, slot.y, slot.width, slot.height);
  ctx.strokeStyle = selected ? "#ffd54f" : disabled ? "#55617a" : "#8fb3ff";
  ctx.lineWidth = selected ? 3 : 1.4;
  ctx.strokeRect(slot.x, slot.y, slot.width, slot.height);

  ctx.fillStyle = disabled ? "#727a8d" : "#ffffff";
  ctx.font = "14px Arial";
  if (item) {
    ctx.fillText(item.name, slot.x + 10, slot.y + 20);
    ctx.font = "12px Arial";
    ctx.fillStyle = "#c9d8ff";
    ctx.fillText(subtitle, slot.x + 10, slot.y + 38);
  } else {
    ctx.fillText("Empty Slot", slot.x + 10, slot.y + 29);
  }
}

function drawEffects() {
  for (const e of effects) {
    if (e.type === "arrow") {
      ctx.strokeStyle = "#ffe066";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(e.x - 16, e.y);
      ctx.lineTo(e.x + 10, e.y);
      ctx.stroke();
      ctx.fillStyle = "#ffe066";
      ctx.beginPath();
      ctx.moveTo(e.x + 10, e.y);
      ctx.lineTo(e.x + 2, e.y - 5);
      ctx.lineTo(e.x + 2, e.y + 5);
      ctx.fill();
    }

    if (e.type === "flame") {
      ctx.fillStyle = "#ff7a18";
      ctx.beginPath();
      ctx.arc(e.x, e.y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ff3b2f";
      ctx.beginPath();
      ctx.arc(e.x + 2, e.y - 1, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    if (e.type === "dark") {
      ctx.fillStyle = "#a057ff";
      ctx.beginPath();
      ctx.arc(e.x, e.y, 9, 0, Math.PI * 2);
      ctx.fill();
    }

    if (e.type === "flameBurst" || e.type === "hitBurst") {
      const alpha = e.life / e.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = e.type === "flameBurst" ? "#ffaf59" : "#ffd2d2";
      ctx.beginPath();
      ctx.arc(e.x, e.y, 14 + (1 - alpha) * 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    if (e.type === "slashNearDemon") {
      ctx.strokeStyle = "#ffc1c1";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(e.x, e.y, 28, Math.PI * 1.15, Math.PI * 1.8);
      ctx.stroke();
    }

    if (e.type === "claw") {
      ctx.strokeStyle = "#ff8a80";
      ctx.lineWidth = 4;
      for (let k = 0; k < 3; k += 1) {
        ctx.beginPath();
        ctx.moveTo(e.x + k * 8, e.y - 10);
        ctx.lineTo(e.x + 12 + k * 8, e.y + 12);
        ctx.stroke();
      }
    }

    if (e.type === "tail") {
      ctx.strokeStyle = "#ffab91";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(e.x, e.y, 30, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    }

    if (e.type === "shield" || e.type === "counter") {
      ctx.strokeStyle = e.type === "shield" ? "#8ed1ff" : "#9dffb0";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(e.x, e.y, 28, Math.PI * 0.7, Math.PI * 1.3);
      ctx.stroke();
    }

    if (e.type === "counterHit") {
      ctx.strokeStyle = "#8dff9f";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(e.x - 22, e.y - 8);
      ctx.lineTo(e.x + 18, e.y + 10);
      ctx.stroke();
    }
  }
}

function drawMessageBox() {
  ctx.fillStyle = "#101b30";
  ctx.fillRect(548, 304, 328, 184);
  ctx.strokeStyle = "#3e5c9a";
  ctx.strokeRect(548, 304, 328, 184);
  ctx.fillStyle = "#fff";
  ctx.font = "16px Arial";
  ctx.fillText("Message", 560, 327);

  ctx.font = "15px Arial";
  const lines = message.match(/.{1,38}(\s|$)/g) || [message];
  lines.slice(0, 4).forEach((line, i) => ctx.fillText(line.trim(), 560, 354 + i * 22));
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#0f1728";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawHealthBar(28, 24, 280, 22, player.hp, player.maxHp, "#4dd0e1", "Player");
  drawHealthBar(592, 24, 280, 22, demon.hp, demon.maxHp, "#ef5350", "Demon");

  ctx.fillStyle = "#ffffff";
  ctx.font = "20px Arial";
  ctx.textAlign = "center";
  ctx.fillText(`Round ${roundNumber}`, canvas.width / 2, 40);
  ctx.textAlign = "left";

  if (player.flash % 2 === 1) ctx.fillStyle = "#dff7ff";
  else ctx.fillStyle = "#4dd0e1";
  ctx.fillRect(player.x - 40 + player.dodgeOffset, player.y - 40, 80, 80);

  if (demon.flash % 2 === 1) ctx.fillStyle = "#ffdada";
  else ctx.fillStyle = "#ef5350";
  ctx.fillRect(demon.x - 40, demon.y - 40, 80, 80);

  drawEffects();

  ctx.fillStyle = "#12203b";
  ctx.fillRect(20, 286, 520, 206);
  ctx.strokeStyle = "#3e5c9a";
  ctx.strokeRect(20, 286, 520, 206);

  ctx.fillStyle = "#ffffff";
  ctx.font = "16px Arial";
  ctx.fillText("Attack Items", 32, 300);
  ui.attackSlots.forEach((slot, i) => {
    const atk = attacks[i];
    drawSlot(slot, atk, selectedAttackIndex === i, !atk || isResolvingTurn, atk ? `Dmg ${atk.damage}` : "");
  });

  ctx.fillText("Defence Items", 32, 418);
  ui.defenceSlots.forEach((slot, i) => {
    const def = defences[i];
    let subtitle = "";
    if (def?.type === "shield") subtitle = "Guards 60%";
    if (def?.type === "dodge") subtitle = "50% full dodge";
    if (def?.type === "counter") subtitle = "30% cut + reflect 8";
    drawSlot(slot, def, selectedDefenceIndex === i, !def || isResolvingTurn, subtitle);
  });

  const d = ui.doneButton;
  ctx.fillStyle = canPressDone() ? "#43a047" : "#546e7a";
  ctx.fillRect(d.x, d.y, d.width, d.height);
  ctx.strokeStyle = "#e8f5e9";
  ctx.strokeRect(d.x, d.y, d.width, d.height);
  ctx.fillStyle = "#ffffff";
  ctx.font = "18px Arial";
  ctx.fillText(isResolvingTurn ? "Resolving..." : "Done", d.x + 36, d.y + 30);

  drawMessageBox();

  for (const t of floatingTexts) {
    ctx.globalAlpha = t.life / t.maxLife;
    ctx.fillStyle = t.color;
    ctx.font = "22px Arial";
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
