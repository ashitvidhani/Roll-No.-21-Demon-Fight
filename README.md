# Roll No 21 - Demon Fight (Beginner Prototype)

This repository now contains a **simple 2D browser game prototype** using:
- HTML
- CSS
- JavaScript
- Canvas API

No frameworks are required, so it is beginner-friendly and easy to inspect.

## Project Structure

```text
.
├── index.html          # Main page + canvas container
├── style.css           # Basic layout and visual styling
├── src/
│   └── main.js         # Game logic (movement, attack, collision, health, win/lose)
└── README.md           # Setup and gameplay instructions
```

## Features Implemented

- Player placeholder (blue rectangle)
- Demon placeholder (red rectangle)
- Keyboard movement (Arrow keys or WASD)
- Attack button (Space)
- Enemy health bar
- Player health bar
- Collision detection
- Simple arena background (gradient + grid)
- Basic win/lose condition

## How to Run

### Option 1: Open directly
1. Open `index.html` in any modern browser.
2. Play immediately.

### Option 2 (recommended): Run a local server
From the repository root, run:

```bash
python3 -m http.server 8000
```

Then open:

- `http://localhost:8000`

## Controls

- **Move:** Arrow keys or WASD
- **Attack:** Space bar

## Gameplay Notes

- Move close to the demon to land attacks.
- Attacks have a short cooldown.
- Touching the demon damages the player over time.
- You win when demon health reaches 0.
- You lose when player health reaches 0.

## Next Ideas (Optional)

- Add sprite images and animations
- Add demon AI movement
- Add sound effects
- Add restart button instead of browser refresh
- Add multiple levels/waves
