# Kid Duel - Turn-Based Demon Battle (Milestone 4 Sequencing Fix)

This project uses plain **HTML + CSS + JavaScript + Canvas**.

## What was fixed

The round resolver was previously based on fixed queued delays, so the demon phase could start before the player animation had finished. It is now **animation-driven**:

- One async round sequence (`async/await`) controls turn flow.
- Every major attack/defence effect returns a completion promise.
- The next phase starts only after the current animation reports completion.
- Damage is applied on impact frames (projectile hit / strike impact), not before.

## Correct round order now

1. `You used [Attack Name]!` (wait 500ms)
2. Player attack animation plays.
3. Wait until player effect finishes.
4. Apply demon damage on impact frame.
5. Show flash/floating damage (wait 700ms).
6. If demon dies, battle ends.
7. `Demon used [Enemy Attack]!` (wait 500ms)
8. Demon attack + defence animation play.
9. Apply player damage only at visual connect.
10. Show player feedback (`Blocked`, `Dodged`, `Counter`, damage) (wait 700ms).
11. If player dies, battle ends.
12. `Round X resolved.` (wait 700ms)
13. `Round X+1 begins.` then `Select your attack.`

## Animation behavior checks

### Player attacks
- **Arrow Shot**: larger/slower yellow projectile; demon HP changes only when arrow reaches demon.
- **Flame Strike**: larger/slower fireball + larger burst; HP changes on contact.
- **Heavy Slash**: bigger/longer slash arc; HP changes at slash impact frame.

### Demon attacks
- **Claw Hit**: larger claw marks; damage at impact frame.
- **Tail Strike**: wider sweep arc; damage at impact frame.
- **Dark Blast**: larger/slower purple projectile; damage only on hit.

### Defences
- **Wooden Shield**: large front arc appears before impact; then reduced damage.
- **Dodge Charm**: clearer side-shift; success/fail resolved at impact frame.
- **Counter Guard**: incoming damage reduced first, then reflected projectile travels to demon; demon takes 8 only when reflected hit connects.

## UI/layout update

Canvas height is increased to **900x580** so both defence rows and controls fit:
- attack slots fully visible
- defence slots fully visible
- counter slot fully visible
- done button no longer overlaps
- message box remains readable

## Input lock behavior

During resolution:
- Attack/defence selection disabled
- Done disabled
- Space/Enter cannot double-trigger
- Only `R` restart is allowed

Restart also cancels old in-flight async sequence steps via `sequenceId` guard.

## How to test non-overlap (core sequencing test)

1. Choose **Arrow Shot** + any defence.
2. Press Done.
3. Confirm demon attack message never appears until after arrow reaches demon and demon damage is shown.
4. Repeat with Flame Strike and Heavy Slash.

## How to test each attack animation

1. Press `1` for Arrow Shot repeatedly and watch projectile impact timing.
2. Press `2` for Flame Strike until both hit and miss cases appear.
3. Press `3` for Heavy Slash and verify impact timing occurs mid-effect.

## How to test each defence animation

1. Choose `Q` Wooden Shield and verify message says 60% blocked before player HP update.
2. Choose `W` Dodge Charm and test both success and failure outcomes.
3. Choose `E` Counter Guard and confirm reflected damage happens only when counter effect visually hits demon.

## Known limitations

- Placeholder rectangle characters (no sprite art yet).
- No sound effects.
- Single message box (not full scrolling log).
- Random demon attack selection (not tactical AI).
