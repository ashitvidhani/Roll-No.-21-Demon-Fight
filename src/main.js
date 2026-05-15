/*
  Milestone 4 - Animation-driven turn sequencing fix
  --------------------------------------------------
  Why this refactor?
  Previous code resolved rounds with fixed setTimeout steps. That caused
  overlap because the demon phase could start before the player projectile
  had actually reached the demon.

  New approach:
  - One async turn sequence controls each phase.
  - Each animation returns a Promise.
  - Sequence advances only when active animation reports completion.
  - Damage is applied exactly on impact callbacks, not on guessed timers.
  - Input is fully locked while resolving.
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

let roundNumber = 1;
let selectedAttackIndex = null;
let selectedDefenceIndex = null;
let pendingDemonAttack = null;
let message = "Select your attack.";
let isResolvingTurn = false;
let sequenceId = 0; // Cancel guard: restart increments this to invalidate old async work.

const ui = {
  attackSlots: [],
  defenceSlots: [],
  doneButton: { x: 364, y: 514, width: 172, height: 48 },
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const randomItem = (list) => list[Math.floor(Math.random() * list.length)];
const activeSequence = (id) => id === sequenceId;

function setMessage(text) { message = text; }

function setupUiLayout() {
  const slotW = 158;
  const slotH = 50;
  const gap = 10;
  const leftX = 24;
  const attackStartY = 318;
  const defenceStartY = 438;
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

function addFloatingText(text, x, y, color = "#fff") { floatingTexts.push({ text, x, y, color, life: 60, maxLife: 60, vy: -0.7 }); }
function addEffect(effect) { effects.push(effect); return effect; }

function createProjectile(type, from, to, onImpact, speed = 7) {
  let doneResolve;
  const donePromise = new Promise((resolve) => { doneResolve = resolve; });
  return {
    type, x: from.x, y: from.y, toX: to.x, toY: to.y, speed,
    impacted: false, done: false, onImpact, doneResolve, donePromise,
  };
}
function createTimedEffect(type, life, extra = {}) {
  let doneResolve;
  const donePromise = new Promise((resolve) => { doneResolve = resolve; });
  return { type, life, maxLife: life, done: false, doneResolve, donePromise, ...extra };
}

function clearTurnChoices() { selectedAttackIndex = null; selectedDefenceIndex = null; pendingDemonAttack = null; }
function resetGame() {
  sequenceId += 1;
  player.hp = player.maxHp; demon.hp = demon.maxHp; player.flash = 0; demon.flash = 0; player.dodgeOffset = 0;
  roundNumber = 1; clearTurnChoices(); floatingTexts.length = 0; effects.length = 0; isResolvingTurn = false;
  setMessage("Select your attack.");
}

const canSelectAttack = () => !isResolvingTurn && selectedAttackIndex === null;
const canSelectDefence = () => !isResolvingTurn && selectedAttackIndex !== null && selectedDefenceIndex === null;
const canPressDone = () => !isResolvingTurn && selectedAttackIndex !== null && selectedDefenceIndex !== null;

function selectAttack(index) { if (canSelectAttack() && attacks[index]) { selectedAttackIndex = index; setMessage("Select your defence."); } }
function selectDefence(index) { if (canSelectDefence() && defences[index]) { selectedDefenceIndex = index; setMessage("Press Done to resolve the turn."); } }

async function startRoundResolve() {
  if (!canPressDone() || player.hp <= 0 || demon.hp <= 0) return;

  isResolvingTurn = true;
  const mySequence = ++sequenceId;
  const attack = attacks[selectedAttackIndex];
  const defence = defences[selectedDefenceIndex];
  pendingDemonAttack = randomItem(demonAttacks);

  // A-B
  setMessage(`You used ${attack.name}!`);
  await wait(500); if (!activeSequence(mySequence)) return;

  // C-D-E-F
  await playPlayerAttack(attack, mySequence); if (!activeSequence(mySequence)) return;
  await wait(700); if (!activeSequence(mySequence)) return;

  // H
  if (demon.hp <= 0) { endBattle(); return; }

  // I-J
  setMessage(`Demon used ${pendingDemonAttack.name}!`);
  await wait(500); if (!activeSequence(mySequence)) return;

  // K-L-M-N
  await playDemonAttackWithDefence(pendingDemonAttack, defence, mySequence);
  if (!activeSequence(mySequence)) return;
  await wait(700); if (!activeSequence(mySequence)) return;

  // P
  if (player.hp <= 0) { endBattle(); return; }

  // Q-R-S
  setMessage(`Round ${roundNumber} resolved.`);
  await wait(700); if (!activeSequence(mySequence)) return;
  roundNumber += 1;
  clearTurnChoices();
  setMessage(`Round ${roundNumber} begins.`);
  await wait(700); if (!activeSequence(mySequence)) return;
  setMessage("Select your attack.");
  isResolvingTurn = false;
}

async function playPlayerAttack(attack) {
  const hitLogic = () => {
    const hit = Math.random() <= attack.hitChance;
    if (!hit) {
      setMessage(`${attack.name} missed!`);
      addFloatingText("MISS", demon.x - 10, demon.y - 54, "#9ecbff");
      return;
    }
    demon.hp = clamp(demon.hp - attack.damage, 0, demon.maxHp);
    demon.flash = 12;
    addFloatingText(`-${attack.damage}`, demon.x - 16, demon.y - 56, "#ff6b6b");
    addEffect(createTimedEffect("hitBurst", 20, { x: demon.x, y: demon.y }));
    setMessage(`Demon took ${attack.damage} damage.`);
  };

  if (attack.effect === "slash") {
    const slash = addEffect(createTimedEffect("slashNearDemon", 26, { x: demon.x - 26, y: demon.y - 6, applied: false, impactLife: 14, onImpact: hitLogic }));
    await slash.donePromise;
    return;
  }

  const projType = attack.effect === "arrow" ? "arrow" : "flame";
  const speed = projType === "arrow" ? 4.8 : 4.3;
  const proj = addEffect(createProjectile(projType, { x: player.x + 32, y: player.y - 10 }, { x: demon.x - 28, y: demon.y - 10 }, hitLogic, speed));
  await proj.donePromise;
}

async function playDemonAttackWithDefence(demonAttack, defence) {
  const defenceEffect = addDefenceEffect(defence);

  const applyIncomingDamage = async () => {
    let damage = demonAttack.damage;
    if (defence.type === "shield") {
      damage = Math.round(damage * 0.4);
      setMessage("Wooden Shield blocked 60% damage.");
      addFloatingText("Blocked", player.x - 22, player.y - 62, "#6fc8ff");
    } else if (defence.type === "dodge") {
      if (Math.random() < 0.5) {
        damage = 0;
        setMessage("Dodged!");
        addFloatingText("Dodged!", player.x - 18, player.y - 62, "#6ef3a5");
      } else {
        setMessage("Dodge failed!");
      }
    } else if (defence.type === "counter") {
      damage = Math.round(damage * 0.7);
      setMessage("Counter Guard reduced incoming damage.");
      addFloatingText("Blocked", player.x - 22, player.y - 62, "#6fc8ff");
    }

    if (damage > 0) {
      player.hp = clamp(player.hp - damage, 0, player.maxHp);
      player.flash = 12;
      addFloatingText(`-${damage}`, player.x - 14, player.y - 58, "#ff6b6b");
      setMessage(`You took ${damage} damage.`);
    } else if (defence.type !== "counter") {
      addFloatingText("0", player.x - 5, player.y - 58, "#6ef3a5");
    }

    if (defence.type === "counter" && demon.hp > 0) {
      const counterFx = addEffect(createProjectile("counterBolt", { x: player.x + 42, y: player.y - 20 }, { x: demon.x - 8, y: demon.y - 12 }, () => {
        demon.hp = clamp(demon.hp - 8, 0, demon.maxHp);
        demon.flash = 10;
        addFloatingText("-8", demon.x - 10, demon.y - 62, "#82ff9e");
        addEffect(createTimedEffect("counterHit", 18, { x: demon.x - 10, y: demon.y - 2 }));
        setMessage("Counter Guard reflected 8 damage.");
      }, 4.7));
      await counterFx.donePromise;
    }
  };

  let attackEffect;
  if (demonAttack.effect === "claw") {
    attackEffect = addEffect(createTimedEffect("claw", 24, { x: player.x + 2, y: player.y - 6, applied: false, impactLife: 13, onImpact: applyIncomingDamage }));
  } else if (demonAttack.effect === "tail") {
    attackEffect = addEffect(createTimedEffect("tail", 28, { x: player.x + 52, y: player.y - 2, applied: false, impactLife: 15, onImpact: applyIncomingDamage }));
  } else {
    attackEffect = addEffect(createProjectile("dark", { x: demon.x - 30, y: demon.y - 8 }, { x: player.x + 12, y: player.y - 10 }, applyIncomingDamage, 4.4));
  }

  await attackEffect.donePromise;
  if (defenceEffect) await defenceEffect.donePromise;
}

function addDefenceEffect(defence) {
  if (defence.type === "shield") return addEffect(createTimedEffect("shield", 32, { x: player.x + 14, y: player.y - 4 }));
  if (defence.type === "dodge") return addEffect(createTimedEffect("dodge", 30, { x: player.x, y: player.y }));
  if (defence.type === "counter") return addEffect(createTimedEffect("counter", 34, { x: player.x + 12, y: player.y - 5 }));
  return null;
}

function endBattle() {
  isResolvingTurn = false;
  if (demon.hp <= 0) setMessage("You won the duel! Press R to restart.");
  else if (player.hp <= 0) setMessage("You were defeated. Press R to restart.");
}

function slotAtPoint(list, x, y) {
  return list.findIndex((slot) => x >= slot.x && x <= slot.x + slot.width && y >= slot.y && y <= slot.y + slot.height);
}

canvas.addEventListener("click", (event) => {
  if (isResolvingTurn) return;
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = (event.clientX - rect.left) * scaleX;
  const y = (event.clientY - rect.top) * scaleY;
  const ai = slotAtPoint(ui.attackSlots, x, y); if (ai !== -1) selectAttack(ai);
  const di = slotAtPoint(ui.defenceSlots, x, y); if (di !== -1) selectDefence(di);
  const d = ui.doneButton;
  if (x >= d.x && x <= d.x + d.width && y >= d.y && y <= d.y + d.height) startRoundResolve();
});

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (key === "r") { resetGame(); return; }
  if (isResolvingTurn) { if (event.key === " " || event.key === "Enter") event.preventDefault(); return; }
  if (["1", "2", "3"].includes(key)) selectAttack(Number(key) - 1);
  if (key === "q") selectDefence(0);
  if (key === "w") selectDefence(1);
  if (key === "e") selectDefence(2);
  if (event.key === " " || event.key === "Enter") { event.preventDefault(); startRoundResolve(); }
});

function updateFloatingTexts() {
  for (let i = floatingTexts.length - 1; i >= 0; i -= 1) {
    const t = floatingTexts[i]; t.y += t.vy; t.life -= 1; if (t.life <= 0) floatingTexts.splice(i, 1);
  }
}

function completeEffect(e) {
  if (!e.done) { e.done = true; if (e.doneResolve) e.doneResolve(); }
}

function triggerImpact(e) {
  if (e.impactTriggered || !e.onImpact) return;
  e.impactTriggered = true;
  const impactResult = e.onImpact();
  if (impactResult && typeof impactResult.then === "function") {
    e.impactPending = true;
    e.impactPromise = impactResult
      .catch(() => {})
      .finally(() => { e.impactPending = false; });
  }
}

function updateEffects() {
  for (let i = effects.length - 1; i >= 0; i -= 1) {
    const e = effects[i];
    if (["arrow", "flame", "dark", "counterBolt"].includes(e.type)) {
      const dx = e.toX - e.x; const dy = e.toY - e.y; const dist = Math.hypot(dx, dy);
      if (dist <= e.speed) {
        e.x = e.toX; e.y = e.toY;
        if (!e.impacted) triggerImpact(e);
        e.impacted = true;
        if (e.type === "flame") addEffect(createTimedEffect("flameBurst", 24, { x: e.x, y: e.y }));
        if (!e.impactPending) completeEffect(e);
      } else { e.x += (dx / dist) * e.speed; e.y += (dy / dist) * e.speed; }
    } else {
      e.life -= 1;
      if (["slashNearDemon", "claw", "tail"].includes(e.type) && !e.applied && e.life <= e.impactLife) {
        e.applied = true;
        triggerImpact(e);
      }
      if (e.type === "dodge") {
        const p = 1 - e.life / e.maxLife;
        player.dodgeOffset = Math.sin(p * Math.PI) * 28;
      }
      if (e.life <= 0) {
        if (e.type === "dodge") player.dodgeOffset = 0;
        if (!e.impactPending) completeEffect(e);
      }
    }
    if (!e.done && e.impactTriggered && !e.impactPending && e.impacted) completeEffect(e);
    if (!e.done && e.impactTriggered && !e.impactPending && e.applied && e.life <= 0) completeEffect(e);
    if (e.done) effects.splice(i, 1);
  }
  if (player.flash > 0) player.flash -= 1;
  if (demon.flash > 0) demon.flash -= 1;
}

function drawHealthBar(x, y, w, h, hp, maxHp, color, label) {
  ctx.fillStyle = "#243554"; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color; ctx.fillRect(x, y, w * clamp(hp / maxHp, 0, 1), h);
  ctx.strokeStyle = "#d8e5ff"; ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = "#fff"; ctx.font = "15px Arial"; ctx.fillText(`${label}: ${hp}/${maxHp}`, x, y - 6);
}

function drawSlot(slot, item, selected, disabled, subtitle = "") {
  ctx.fillStyle = disabled ? "#2a2e39" : "#1f2f52";
  ctx.fillRect(slot.x, slot.y, slot.width, slot.height);
  ctx.strokeStyle = selected ? "#ffd54f" : disabled ? "#55617a" : "#8fb3ff";
  ctx.lineWidth = selected ? 3 : 1.4;
  ctx.strokeRect(slot.x, slot.y, slot.width, slot.height);
  ctx.fillStyle = disabled ? "#727a8d" : "#fff"; ctx.font = "14px Arial";
  if (item) { ctx.fillText(item.name, slot.x + 10, slot.y + 20); ctx.font = "12px Arial"; ctx.fillStyle = "#c9d8ff"; ctx.fillText(subtitle, slot.x + 10, slot.y + 38); }
  else ctx.fillText("Empty Slot", slot.x + 10, slot.y + 29);
}

function drawEffects() {
  for (const e of effects) {
    if (e.type === "arrow") {
      ctx.strokeStyle = "#ffe066"; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(e.x - 24, e.y); ctx.lineTo(e.x + 14, e.y); ctx.stroke();
      ctx.fillStyle = "#ffe066"; ctx.beginPath(); ctx.moveTo(e.x + 14, e.y); ctx.lineTo(e.x + 2, e.y - 8); ctx.lineTo(e.x + 2, e.y + 8); ctx.fill();
    }
    if (e.type === "flame") {
      ctx.fillStyle = "#ff7a18"; ctx.beginPath(); ctx.arc(e.x, e.y, 14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#ff3b2f"; ctx.beginPath(); ctx.arc(e.x + 3, e.y - 2, 8, 0, Math.PI * 2); ctx.fill();
    }
    if (e.type === "dark") { ctx.fillStyle = "#a057ff"; ctx.beginPath(); ctx.arc(e.x, e.y, 13, 0, Math.PI * 2); ctx.fill(); }
    if (e.type === "counterBolt") { ctx.strokeStyle = "#9dffb0"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(e.x - 18, e.y - 6); ctx.lineTo(e.x + 18, e.y + 6); ctx.stroke(); }

    if (e.type === "flameBurst" || e.type === "hitBurst") {
      const alpha = e.life / e.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = e.type === "flameBurst" ? "#ffaf59" : "#ffd2d2";
      ctx.beginPath(); ctx.arc(e.x, e.y, 18 + (1 - alpha) * 18, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }

    if (e.type === "slashNearDemon") { ctx.strokeStyle = "#ffc1c1"; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(e.x, e.y, 42, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
    if (e.type === "claw") { ctx.strokeStyle = "#ff8a80"; ctx.lineWidth = 6; for (let k = 0; k < 3; k += 1) { ctx.beginPath(); ctx.moveTo(e.x + k * 13, e.y - 16); ctx.lineTo(e.x + 20 + k * 13, e.y + 18); ctx.stroke(); } }
    if (e.type === "tail") { ctx.strokeStyle = "#ffab91"; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(e.x, e.y, 48, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke(); }

    if (e.type === "shield" || e.type === "counter") {
      ctx.strokeStyle = e.type === "shield" ? "#8ed1ff" : "#9dffb0";
      ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(e.x, e.y, 44, Math.PI * 0.64, Math.PI * 1.36); ctx.stroke();
    }
    if (e.type === "counterHit") { ctx.strokeStyle = "#8dff9f"; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(e.x - 28, e.y - 10); ctx.lineTo(e.x + 24, e.y + 12); ctx.stroke(); }
  }
}

function drawMessageBox() {
  ctx.fillStyle = "#101b30"; ctx.fillRect(548, 318, 328, 240);
  ctx.strokeStyle = "#3e5c9a"; ctx.strokeRect(548, 318, 328, 240);
  ctx.fillStyle = "#fff"; ctx.font = "16px Arial"; ctx.fillText("Message", 560, 342);
  ctx.font = "15px Arial";
  const lines = message.match(/.{1,38}(\s|$)/g) || [message];
  lines.slice(0, 7).forEach((line, i) => ctx.fillText(line.trim(), 560, 372 + i * 24));
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#0f1728"; ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawHealthBar(28, 24, 280, 22, player.hp, player.maxHp, "#4dd0e1", "Player");
  drawHealthBar(592, 24, 280, 22, demon.hp, demon.maxHp, "#ef5350", "Demon");
  ctx.fillStyle = "#fff"; ctx.font = "20px Arial"; ctx.textAlign = "center"; ctx.fillText(`Round ${roundNumber}`, canvas.width / 2, 40); ctx.textAlign = "left";

  ctx.fillStyle = player.flash % 2 === 1 ? "#dff7ff" : "#4dd0e1";
  ctx.fillRect(player.x - 40 + player.dodgeOffset, player.y - 40, 80, 80);
  ctx.fillStyle = demon.flash % 2 === 1 ? "#ffdada" : "#ef5350";
  ctx.fillRect(demon.x - 40, demon.y - 40, 80, 80);

  drawEffects();
  ctx.fillStyle = "#12203b"; ctx.fillRect(20, 298, 520, 270);
  ctx.strokeStyle = "#3e5c9a"; ctx.strokeRect(20, 298, 520, 270);
  ctx.fillStyle = "#fff"; ctx.font = "16px Arial"; ctx.fillText("Attack Items", 32, 312);
  ui.attackSlots.forEach((slot, i) => { const atk = attacks[i]; drawSlot(slot, atk, selectedAttackIndex === i, !atk || isResolvingTurn, atk ? `Dmg ${atk.damage}` : ""); });
  ctx.fillText("Defence Items", 32, 432);
  ui.defenceSlots.forEach((slot, i) => {
    const def = defences[i]; let subtitle = "";
    if (def?.type === "shield") subtitle = "Guards 60%";
    if (def?.type === "dodge") subtitle = "50% full dodge";
    if (def?.type === "counter") subtitle = "30% cut + reflect 8";
    drawSlot(slot, def, selectedDefenceIndex === i, !def || isResolvingTurn, subtitle);
  });

  const d = ui.doneButton;
  ctx.fillStyle = canPressDone() ? "#43a047" : "#546e7a";
  ctx.fillRect(d.x, d.y, d.width, d.height);
  ctx.strokeStyle = "#e8f5e9"; ctx.strokeRect(d.x, d.y, d.width, d.height);
  ctx.fillStyle = "#fff"; ctx.font = "18px Arial"; ctx.fillText(isResolvingTurn ? "Resolving..." : "Done", d.x + 36, d.y + 30);

  drawMessageBox();

  for (const t of floatingTexts) {
    ctx.globalAlpha = t.life / t.maxLife;
    ctx.fillStyle = t.color;
    ctx.font = "22px Arial";
    ctx.fillText(t.text, t.x, t.y);
    ctx.globalAlpha = 1;
  }
}

function loop() { updateFloatingTexts(); updateEffects(); draw(); requestAnimationFrame(loop); }

setupUiLayout();
resetGame();
loop();
