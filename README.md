# Roll No 21 - Demon Fight (Milestone 2 Prototype)

This repository contains a **simple 2D browser game prototype** built with:
- HTML
- CSS
- JavaScript
- Canvas API

No frameworks are required, so it stays beginner-friendly.

## Project Structure

```text
.
├── index.html          # Main page + canvas container
├── style.css           # Basic layout and visual styling
├── src/
│   └── main.js         # Game logic (movement, arrows, collision, demon AI, health, win/lose)
└── README.md           # Setup and gameplay instructions
```

## Milestone 2 Features

- Player placeholder (blue rectangle)
- Demon placeholder (red rectangle)
- Keyboard movement (Arrow keys or WASD)
- Player facing direction tracking
- **Ranged arrow combat** on Space
- Arrow cooldown (prevents spam)
- Arrow projectile array, movement, and cleanup
- Arrow hit detection against demon
- Demon knockback when hit by arrows
- Demon chase AI
- Demon attack range + cooldown-based damage
- Demon enrages (moves faster below 50% HP)
- Demon damage flash effect
- Shooting visual ring effect
- Player and demon health bars
- UI controls text in-game
- Win/lose conditions
- Restart with **R**

## How to Run

### Option 1: Open directly
1. Open `index.html` in any modern browser.
2. Play immediately.

### Option 2 (recommended): Run a local server
From the repository root:

```bash
python3 -m http.server 8000
```

Then open:
- `http://localhost:8000`

## Controls

- **Move:** Arrow keys or WASD
- **Shoot Arrow:** Space
- **Restart (after win/lose):** R

## Arrow System (Beginner Explanation)

- Pressing **Space** creates an arrow object and stores it in an `arrows` array.
- Each arrow keeps position (`x`, `y`), size (`width`, `height`), and velocity (`vx`, `vy`).
- Every frame, the game loop updates each arrow by adding velocity to position.
- If an arrow leaves the arena, it is removed from the array.
- If an arrow collides with the demon:
  - the demon loses health,
  - a brief flash effect is shown,
  - the demon is pushed back a little,
  - and that arrow is removed.

## Gameplay Notes

- Aim by moving first; arrows fire in your **last movement direction**.
- Keep distance and kite the demon.
- The demon chases constantly and attacks only when close enough and off cooldown.
- When demon HP drops below half, it speeds up.
- You win when demon health reaches 0.
- You lose when player health reaches 0.
