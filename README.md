# game

`game` is a browser-based 3D action game titled `Warzone Exodus`, built with HTML, CSS, JavaScript, and Three.js.

## Overview

The project appears to be a single-player battle-royale style game with AI enemies, combat systems, inventory, HUD overlays, progression, missions, and world-generation logic.

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

- a modern desktop or mobile web browser
- internet access for CDN-hosted dependencies such as Three.js and fonts

## Running The Project

This project is static, so you can open it directly in a browser:

```bash
start index.html
```

For a cleaner local workflow, serve the folder with a simple local server and then open the served URL in your browser.

## How It Works

- `index.html` defines the main game canvas, menu screens, HUD, and overlay UI
- `css/` contains the visual styling for gameplay, HUD, menus, inventory, and touch controls
- `js/main.js` and `js/game.js` initialize and coordinate the game flow
- `js/ai/`, `js/combat/`, `js/entities/`, `js/systems/`, `js/ui/`, and `js/world/` split the game logic into focused modules
- Three.js is used for the rendering layer, while the rest of the code manages game systems and interface state
