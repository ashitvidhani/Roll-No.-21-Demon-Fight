# Kid Duel - Turn-Based Demon Battle (Milestone 4)

This project is a plain **HTML + CSS + JavaScript + Canvas** prototype focused on a clear turn-based combat flow with visible placeholder animations.

## Current Turn-Based Loop

Each round now resolves as a timed sequence instead of instant HP changes:

1. Select attack.
2. Select defence.
3. Press Done.
4. Message: `You used [Attack Name]!`
5. Player attack animation plays.
6. Damage applies only when the attack visually connects.
7. Demon flashes and floating damage appears.
8. Message: `Demon used [Enemy Attack]!`
9. Demon attack animation + chosen defence animation play.
10. Player damage applies after defence resolves.
11. Player flash + floating damage (or block/dodge/counter text).
12. Round result message.
13. Next round transition message, then selection returns.

## Attack Animations

- **Arrow Shot**: yellow arrow projectile travels from player to demon.
- **Flame Strike**: orange/red fireball projectile with burst on contact.
- **Heavy Slash**: slash arc appears near demon.

> Damage for all player attacks is applied only on hit frame/contact frame.

## Defence Animations

- **Wooden Shield**: front arc appears in front of player, then reduced damage is applied.
- **Dodge Charm**: player shifts sideways and flashes.
  - Success: `Dodged!` and zero damage.
  - Fail: `Dodge failed!` then normal damage.
- **Counter Guard**: block arc appears, incoming damage is reduced, then reflected counter effect damages demon.
  - Reflected 8 damage is applied only when the counter projectile visibly reaches the demon.
  - Round flow waits for the counter hit to finish before showing `Round X resolved.` and returning to selection.

## Demon Attack Animations

- **Claw Hit**: slash marks appear at player.
- **Tail Strike**: curved arc swipe appears near player.
- **Dark Blast**: purple projectile travels from demon to player.

## Input Rules During Animation

During turn resolution:
- Attack/defence selection is disabled.
- Done cannot be triggered repeatedly.
- Only `R` restart is accepted.

## UI Improvements in Milestone 4

- Attack and defence panels fully visible.
- Done button moved to avoid overlapping slots.
- Message box has larger usable space and wraps text.
- Empty slots look disabled.
- Selected attack/defence have strong highlight borders.
- Round number remains centered and visible.

## How to Run

### Option 1: Open directly
Open `index.html` in a modern browser.

### Option 2: Run local server
```bash
python3 -m http.server 8000
```
Then open `http://localhost:8000`.

## How to Test One Full Animated Round

1. Select **Arrow Shot** (`1`) and **Wooden Shield** (`Q`).
2. Press **Done** (`Space` or `Enter`).
3. Verify timeline messages appear in order.
4. Verify player attack animation plays before demon HP drops.
5. Verify demon attack + shield animation play before player HP drops.
6. Verify floating texts rise/fade.
7. Verify `Round X begins.` then `Select your attack.` appears.

### Counter Guard Timing Test

1. Select any attack, then select **Counter Guard** (`E`).
2. Press **Done** and watch demon attack connect with player first.
3. Confirm reduced player damage is applied.
4. Confirm a counter projectile travels from player to demon.
5. Confirm demon `-8` appears only when the projectile lands.
6. Confirm message `Counter Guard reflected 8 damage.` appears.
7. Confirm the round does **not** advance until the counter projectile and counter hit effect are finished.

### Restart Safety During Resolving

1. Start a round using **Counter Guard**.
2. During the demon attack or in-flight counter projectile, press **R**.
3. Confirm HP, round number, messages, and effects reset immediately.
4. Confirm no delayed old damage/messages from the interrupted round appear afterward.

## Known Limitations

- Placeholder rectangle characters and simple geometric effects only.
- No sound system yet.
- Message box is single-message style (not a scrolling log history yet).
- Demon AI is random and not tactical.
