/* ====================================================
   WARZONE EXODUS — CONSTANTS
   All game-wide constants and configuration
   ==================================================== */

const C = {
  // ---- World ----
  WORLD_SIZE: 1200,
  TILE_SIZE: 10,
  
  // ---- Player ----
  PLAYER_SPEED: 8,
  PLAYER_SPRINT_MULT: 1.7,
  PLAYER_CROUCH_MULT: 0.5,
  PLAYER_MAX_HEALTH: 100,
  PLAYER_MAX_ARMOR: 100,
  PLAYER_MAX_STAMINA: 100,
  PLAYER_JUMP_FORCE: 12,
  PLAYER_HEIGHT: 1.8,
  
  // ---- Combat ----
  HEADSHOT_MULTIPLIER: 2.5,
  BODY_MULTIPLIER: 1.0,
  LIMB_MULTIPLIER: 0.6,
  MAX_SPREAD: 0.15,
  
  // ---- Progression ----
  XP_PER_KILL: 100,
  XP_PER_HEADSHOT: 50,
  XP_PER_ASSIST: 40,
  XP_PER_MISSION: 500,
  XP_PER_OBJECTIVE: 200,
  XP_LEVEL_BASE: 500,
  XP_LEVEL_SCALE: 1.4,
  MAX_LEVEL: 50,
  
  // ---- AI ----
  ENEMY_SIGHT_RANGE: 80,
  ENEMY_SIGHT_RANGE_NIGHT: 30,
  ENEMY_HEAR_RANGE: 40,
  AI_UPDATE_RATE: 5, // frames between AI updates
  SQUAD_SIZE: 3,
  
  // ---- Day/Night ----
  DAY_DURATION: 600, // seconds
  NIGHT_DURATION: 300,
  
  // ---- Loot ----
  LOOT_RARITY: {
    COMMON: { chance: 0.55, color: '#aaaaaa', label: 'COMMON' },
    RARE:   { chance: 0.30, color: '#4488ff', label: 'RARE' },
    EPIC:   { chance: 0.12, color: '#cc44ff', label: 'EPIC' },
    LEGENDARY: { chance: 0.03, color: '#ffd700', label: 'LEGENDARY' }
  },
  
  // ---- Zones ----
  ZONES: [
    { id: 'city',    name: 'Abandoned City',        color: '#445566', fog: 0.3 },
    { id: 'forest',  name: 'Dense Forest',          color: '#224422', fog: 0.4 },
    { id: 'desert',  name: 'Desert Military Base',  color: '#886644', fog: 0.1 },
    { id: 'frozen',  name: 'Frozen Mountains',      color: '#aabbcc', fog: 0.6 },
    { id: 'volcano', name: 'Volcanic Lava Zone',    color: '#aa2211', fog: 0.2 }
  ],
  
  // ---- Weather ----
  WEATHER: {
    clear:   { visibility: 1.0, windSpeed: 0.5, rain: false, fog: false },
    rain:    { visibility: 0.6, windSpeed: 1.5, rain: true,  fog: false },
    fog:     { visibility: 0.3, windSpeed: 0.2, rain: false, fog: true  },
    storm:   { visibility: 0.4, windSpeed: 3.0, rain: true,  fog: false, lightning: true },
    snow:    { visibility: 0.5, windSpeed: 1.0, rain: false, fog: true,  snow: true }
  },
  
  // ---- Camera ----
  CAMERA_FOV: 75,
  CAMERA_NEAR: 0.1,
  CAMERA_FAR: 1000,
  CAMERA_HEIGHT: 1.7,
  CAMERA_LAG: 0.12,
  
  // ---- Physics ----
  GRAVITY: -20,
  FRICTION: 0.85,
  
  // ---- Input ----
  MOUSE_SENSITIVITY_BASE: 0.002,
  
  // ---- Audio ----
  AUDIO_FALLOFF: 60,
  
  // ---- Particles ----
  PARTICLE_POOL_SIZE: 2000,
  MAX_BULLET_HOLES: 200,
  
  // ---- Game Modes ----
  MODES: {
    CAMPAIGN: 'campaign',
    SURVIVAL: 'survival',
    BOSS_RUSH: 'boss_rush',
    CHALLENGE: 'challenge',
    PRACTICE: 'practice'
  },
  
  // ---- Enemy Types ----
  ENEMY_TYPES: {
    GRUNT:     { health: 60,  damage: 8,  speed: 5, xp: 80,  armor: 0,   name: 'Grunt' },
    SHOTGUNNER:{ health: 80,  damage: 25, speed: 6, xp: 100, armor: 10,  name: 'Shotgunner' },
    SNIPER:    { health: 50,  damage: 60, speed: 3, xp: 150, armor: 0,   name: 'Sniper' },
    ELITE:     { health: 150, damage: 15, speed: 5, xp: 200, armor: 50,  name: 'Elite' },
    HEAVY:     { health: 250, damage: 20, speed: 3, xp: 300, armor: 80,  name: 'Heavy' },
    SCOUT:     { health: 40,  damage: 6,  speed: 9, xp: 90,  armor: 0,   name: 'Scout' },
    ROCKETEER: { health: 100, damage: 80, speed: 4, xp: 250, armor: 20,  name: 'Rocketeer' },
    FLAMER:    { health: 90,  damage: 12, speed: 5, xp: 200, armor: 10,  name: 'Flamer' },
    BOSS_TITAN:{ health: 800, damage: 30, speed: 4, xp: 1000,armor: 100, name: 'TITAN' },
    BOSS_GHOST:{ health: 500, damage: 25, speed: 8, xp: 1000,armor: 0,   name: 'GHOST' },
    BOSS_TANK: { health: 1200,damage: 40, speed: 2, xp: 1500,armor: 150, name: 'IRON TANK' }
  },
  
  // ---- NPC Types ----
  NPC_TYPES: {
    RESISTANCE: { name: 'Resistance Fighter', icon: '🪖', role: 'supplier' },
    TRADER:     { name: 'Black Market Trader', icon: '💼', role: 'trader' },
    MECHANIC:   { name: 'Mechanic',            icon: '🔧', role: 'mechanic' },
    DOCTOR:     { name: 'Field Doctor',        icon: '⚕', role: 'medic' },
    PILOT:      { name: 'Downed Pilot',        icon: '✈', role: 'rescue' }
  },
  
  // ---- Colors ----
  TEAM_PLAYER: 0x00ff88,
  TEAM_ENEMY:  0xff2244,
  TEAM_NPC:    0xffdd00,
  ZONE_SAFE:   0x00aaff,
  ZONE_DANGER: 0xff4400,
  
  // ---- HUD ----
  DAMAGE_FLASH_DURATION: 400,
  KILL_FEED_DURATION: 5000,
  NOTIFICATION_DURATION: 3000,
  XP_POPUP_DURATION: 1500,
  
  // ---- Supply Drop ----
  SUPPLY_DROP_INTERVAL: 120, // seconds
  SUPPLY_DROP_COUNT: 3, // per match
  
  // ---- Abilities ----
  ABILITIES: {
    FOCUS:      { name: 'Focus Mode',     icon: '🎯', duration: 8,  cooldown: 45, cost: 'ability' },
    DRONE:      { name: 'Scout Drone',    icon: '🚁', duration: 15, cooldown: 60, cost: 'ability' },
    CLOAK:      { name: 'Invisibility',   icon: '👻', duration: 6,  cooldown: 90, cost: 'ability' },
    ADRENALINE: { name: 'Adrenaline Rush',icon: '⚡', duration: 10, cooldown: 60, cost: 'ability' },
    AIRSTRIKE:  { name: 'Air Strike',     icon: '💣', duration: 3,  cooldown: 120,cost: 'ability' },
    DECOY:      { name: 'Decoy Hologram', icon: '🔮', duration: 10, cooldown: 45, cost: 'ability' }
  },
  
  VERSION: '2.0.0'
};

// Freeze constants to prevent accidental mutation
Object.freeze(C);
