# Kid Duel - Turn-Based Demon Battle (Milestone 3)

This repository now contains a **turn-based Canvas duel prototype** built with plain:
- HTML
- CSS
- JavaScript
- Canvas API

The game is intentionally simple and kid-friendly, with placeholder shapes and a clear combat loop.

## Milestone 3 Gameplay Loop

1. Player turn starts.
2. Message box asks: **Select your attack.**
3. Select one attack item.
4. Message box asks: **Select your defence.**
5. Select one defence item.
6. Press **Done** (or **Space / Enter**).
7. Player attack resolves and can damage demon.
8. Demon turn begins.
9. Demon chooses one demon attack.
10. Selected defence modifies incoming damage.
11. Health bars update.
12. Next round starts unless someone is defeated.

## State Machine

The duel uses these states:
- `SELECT_ATTACK`
- `SELECT_DEFENCE`
- `READY_TO_RESOLVE`
- `PLAYER_ATTACK_RESOLVE`
- `DEMON_TURN`
- `ROUND_END`
- `WIN`
- `GAME_OVER`

## Controls

- **1 / 2 / 3** = select attack
- **Q / W / E** = select defence
- **Space / Enter** = Done (resolve turn)
- **Mouse click** = select slots / click Done
- **R** = restart duel

## Attack Items

1. **Arrow Shot**
   - Damage: 15
   - Reliable (always hits)
2. **Flame Strike**
   - Damage: 20
   - Slight miss chance
3. **Heavy Slash**
   - Damage: 25
   - Higher miss chance
4. **Empty slot**

## Defence Items

1. **Wooden Shield**
   - Guards 60% of incoming damage (you take 40%)
2. **Dodge Charm**
   - 50% chance to avoid all damage
3. **Counter Guard**
   - Reduces damage by 30%
   - Reflects 8 damage back to demon
4. **Empty slot**

## Demon Attacks

- **Claw Hit** (10 damage)
- **Tail Strike** (15 damage)
- **Dark Blast** (22 damage)

## Visual/UI Layout

- Player health bar: top-left
- Demon health bar: top-right
- Round label: top-center
- Player placeholder: left side
- Demon placeholder: right side
- Attack panel: bottom-left
- Defence panel: below attack panel
- Done button: near the panel
- Tutorial/message box: bottom-right
- Floating damage text appears on hits/blocks/misses

## How to Run

### Option 1: Open directly
1. Open `index.html` in a modern browser.

### Option 2 (recommended): run local server
```bash
python3 -m http.server 8000
```
Then open:
- `http://localhost:8000`

## How to Test One Complete Round

1. Start the game.
2. Choose attack with **1** (Arrow Shot).
3. Choose defence with **Q** (Wooden Shield).
4. Press **Space** to resolve.
5. Observe message flow:
   - "You used Arrow Shot!"
   - "Demon took 15 damage."
   - Demon attack message
   - Shield reduction message
6. Confirm both health bars update.
7. Confirm round counter increments on next turn.

## Current Limitations

- Uses simple placeholder art only.
- No sound, animation timeline system, or advanced VFX.
- Basic AI: demon randomly picks one of three attacks.
- Message box shows short single-line updates.

## Suggested Next Milestone

- Add richer turn timeline/queue UI (multi-step action log).
- Add more attack/defence items with status effects.
- Add simple character portraits and polish effects.
- Add difficulty modes and smarter demon choices.
