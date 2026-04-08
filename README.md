# Warzone Exodus

A browser-based 3D action game that aims for big energy: cinematic menus, AI enemies, progression systems, battle-royale style pressure, and a surprisingly broad module layout for a front-end game project.

## Why It Gets Attention Fast

Open the landing screen and the intent is obvious: this is trying to feel like a full-scale action title, not a tiny canvas experiment. `Warzone Exodus` is built to create momentum immediately with its title treatment, HUD layering, game systems, and modular code layout.

## What It Does

- runs as a browser-based 3D action game using HTML, CSS, JavaScript, and Three.js
- includes campaign and survival-style framing
- organizes logic into AI, combat, world, UI, inventory, and progression modules
- presents a fully themed interface with loading screens, menus, HUD, and mission flow

## Project Structure

```text
game/
|-- index.html
|-- css/
|   |-- main.css
|   |-- hud.css
|   |-- menu.css
|   |-- inventory.css
|   `-- touch.css
|-- js/
|   |-- main.js
|   |-- game.js
|   |-- ai/
|   |-- combat/
|   |-- core/
|   |-- entities/
|   |-- systems/
|   |-- ui/
|   `-- world/
`-- README.md
```

## Requirements

- a modern browser
- internet access for CDN-hosted Three.js and fonts

## Run Locally

Open the project directly:

```bash
start index.html
```

Or serve it from a simple local static server for a cleaner workflow.

## How It Works

- `index.html` sets up the canvas, menus, overlays, HUD, and mission flow UI.
- `css/` styles the entire experience from combat HUD to inventory and touch controls.
- `js/main.js` and `js/game.js` coordinate bootstrapping and game flow.
- `js/ai/`, `js/combat/`, `js/entities/`, `js/systems/`, `js/ui/`, and `js/world/` split the gameplay into focused modules.
- Three.js provides the rendering base, while the rest of the code handles game state, combat, progression, and interface behavior.

## Why Someone Would Care

This repo is compelling for front-end game builders who want to study how a browser game can be organized to feel much larger, louder, and more ambitious than its footprint suggests.
