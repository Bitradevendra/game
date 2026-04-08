/* ====================================================
   WARZONE EXODUS — SAFE STUBS
   Guards for optional systems so missing methods
   never crash the game loop
   ==================================================== */

// ── AudioEngine safety ──
if (typeof AudioEngine === 'undefined') {
    window.AudioEngine = {
        play() { }, startCombatMusic() { }, stopCombatMusic() { },
        startHeartbeat() { }, stopHeartbeat() { }, setMasterVolume() { }
    };
}
// Patch missing methods on real AudioEngine
if (typeof AudioEngine !== 'undefined') {
    AudioEngine.startCombatMusic = AudioEngine.startCombatMusic || function () { };
    AudioEngine.stopCombatMusic = AudioEngine.stopCombatMusic || function () { };
    AudioEngine.startHeartbeat = AudioEngine.startHeartbeat || function () { };
    AudioEngine.stopHeartbeat = AudioEngine.stopHeartbeat || function () { };
    AudioEngine.setMasterVolume = AudioEngine.setMasterVolume || function () { };
    AudioEngine.play = AudioEngine.play || function () { };
}

// ── EventBus safety ──
if (typeof EventBus === 'undefined') {
    window.EventBus = {
        _h: {},
        on(e, fn) { (this._h[e] = this._h[e] || []).push(fn); },
        emit(e, d) { (this._h[e] || []).forEach(f => { try { f(d); } catch (_) { } }); },
        off(e, fn) { if (this._h[e]) this._h[e] = this._h[e].filter(f => f !== fn); }
    };
}

// ── EVENTS constant safety ──
if (typeof EVENTS === 'undefined') {
    window.EVENTS = {
        PLAYER_DAMAGED: 'player_damaged',
        PLAYER_DIED: 'player_died',
        PLAYER_HEALED: 'player_healed',
        PLAYER_LEVELED_UP: 'player_leveled_up',
        PLAYER_JUMPED: 'player_jumped',
        ENEMY_KILLED: 'enemy_killed',
        ENEMY_ALERTED: 'enemy_alerted',
        WEAPON_FIRED: 'weapon_fired',
        WEAPON_RELOADED: 'weapon_reloaded',
        WEAPON_SWITCHED: 'weapon_switched',
        HEADSHOT: 'headshot',
        LOOT_PICKED_UP: 'loot_picked_up',
        GRENADE_THROWN: 'grenade_thrown',
        ABILITY_USED: 'ability_used',
        ZONE_ENTERED: 'zone_entered',
        WEATHER_CHANGED: 'weather_changed',
        DAY_CHANGED: 'day_changed',
        EXPLOSION: 'explosion',
        VEHICLE_ENTERED: 'vehicle_entered',
        VEHICLE_EXITED: 'vehicle_exited',
        INVENTORY_ARMOR_CHANGED: 'inventory_armor_changed',
        SHOW_NOTIFICATION: 'show_notification',
        SHOW_XP_POPUP: 'show_xp_popup',
        SHOW_KILL_FEED: 'show_kill_feed'
    };
}

// ── ParticleEngine safety ──
class _SafeParticleEngine {
    constructor() { }
    update() { }
    createBloodSplatter() { }
    createMuzzleFlash() { }
    createBulletTracer() { }
    createExplosion() { }
    createFireEffect() { }
    addBulletHole() { }
}
// Only define if not already defined
if (typeof ParticleEngine === 'undefined') {
    window.ParticleEngine = _SafeParticleEngine;
}

// ── Patch missing methods on real classes ──
// ProjectileManager
if (typeof ProjectileManager !== 'undefined') {
    ProjectileManager.prototype.spawnGrenade = ProjectileManager.prototype.spawnGrenade || function () { };
    ProjectileManager.prototype.spawnProjectile = ProjectileManager.prototype.spawnProjectile || function () { };
}

// VehicleManager
if (typeof VehicleManager !== 'undefined') {
    VehicleManager.prototype.spawnVehiclesForMission = VehicleManager.prototype.spawnVehiclesForMission || function () { };
    VehicleManager.prototype.getNearestEmpty = VehicleManager.prototype.getNearestEmpty || function () { return null; };
    VehicleManager.prototype.update = VehicleManager.prototype.update || function () { };
}

// WaveSystem
if (typeof WaveSystem !== 'undefined') {
    WaveSystem.prototype.startSurvivalMode = WaveSystem.prototype.startSurvivalMode || function () { };
    WaveSystem.prototype.getAliveEnemies = WaveSystem.prototype.getAliveEnemies || function () { return []; };
    WaveSystem.prototype.getCurrentWave = WaveSystem.prototype.getCurrentWave || function () { return 0; };
    WaveSystem.prototype.update = WaveSystem.prototype.update || function () { };
}

// QuestSystem
if (typeof QuestSystem !== 'undefined') {
    QuestSystem.prototype.startMissionQuests = QuestSystem.prototype.startMissionQuests || function () { };
}

// ProgressionSystem
if (typeof ProgressionSystem !== 'undefined') {
    ProgressionSystem.prototype.applyAllSkills = ProgressionSystem.prototype.applyAllSkills || function () { };
    ProgressionSystem.prototype.renderSkillTree = ProgressionSystem.prototype.renderSkillTree || function () { };
}

// HUDManager
if (typeof HUDManager !== 'undefined') {
    HUDManager.prototype.setMissionInfo = HUDManager.prototype.setMissionInfo || function () { };
    HUDManager.prototype.setTotalEnemies = HUDManager.prototype.setTotalEnemies || function () { };
    HUDManager.prototype.updateKillCount = HUDManager.prototype.updateKillCount || function () { };
    HUDManager.prototype.showCrosshairExpand = HUDManager.prototype.showCrosshairExpand || function () { };
    HUDManager.prototype.update = HUDManager.prototype.update || function () { };
}

// MinimapRenderer
if (typeof MinimapRenderer !== 'undefined') {
    MinimapRenderer.prototype.update = MinimapRenderer.prototype.update || function () { };
}

// NotificationEngine
if (typeof NotificationEngine !== 'undefined') {
    NotificationEngine.prototype.showDialogue = NotificationEngine.prototype.showDialogue || function () { };
}

// LootSystem
if (typeof LootSystem !== 'undefined') {
    LootSystem.prototype.spawnRandomLoot = LootSystem.prototype.spawnRandomLoot || LootSystem.prototype.spawnLoot || function () { };
    LootSystem.prototype.checkPickup = LootSystem.prototype.checkPickup || function () { return null; };
    LootSystem.prototype.update = LootSystem.prototype.update || function () { };
    LootSystem.prototype.updateSupplyDrop = LootSystem.prototype.updateSupplyDrop || function () { };
}

// InventorySystem
if (typeof InventorySystem !== 'undefined') {
    InventorySystem.prototype.toggle = InventorySystem.prototype.toggle || function () { };
    InventorySystem.prototype.addItem = InventorySystem.prototype.addItem || function () { };
}

// AbilityManager
if (typeof AbilityManager === 'undefined') {
    window.AbilityManager = class {
        constructor() { }
        update() { }
    };
}

// SquadAI
if (typeof SquadAI !== 'undefined') {
    SquadAI.prototype.formSquad = SquadAI.prototype.formSquad || function () { };
    SquadAI.prototype.update = SquadAI.prototype.update || function () { };
}

// AchievementSystem
if (typeof AchievementSystem !== 'undefined') {
    AchievementSystem.prototype.checkAll = AchievementSystem.prototype.checkAll || function () { };
}

// NPC
if (typeof NPC === 'undefined') {
    window.NPC = class {
        constructor(scene, type) {
            this.scene = scene; this.type = type;
            this.position = new THREE.Vector3();
            this.isAlive = true; this.interactionRadius = 3;
        }
        update() { }
        interact() { return null; }
    };
}

// Boss — ensure it extends Enemy safely
if (typeof Boss === 'undefined' && typeof Enemy !== 'undefined') {
    window.Boss = class extends Enemy {
        constructor(scene, particles, type) {
            super(scene, particles, type || 'BOSS_TITAN');
            this.isBoss = true;
        }
    };
}

// EnemyAI
if (typeof EnemyAI === 'undefined') {
    window.EnemyAI = class {
        constructor(enemy, world) { this.enemy = enemy; this.world = world; }
        update() { }
    };
}

// SaveManager if missing C constants
if (typeof C !== 'undefined') {
    // Make sure TOTAL_ENEMIES exists
    if (!C.TOTAL_ENEMIES) {
        Object.defineProperty(C, 'TOTAL_ENEMIES', { value: 50, writable: false });
    }
}

// DayNightCycle
if (typeof DayNightCycle === 'undefined') {
    window.DayNightCycle = class {
        constructor() { this.isDaytime = true; this.timeOfDay = 0.3; }
        init() { }
        update() { }
        getIsDaytime() { return this.isDaytime; }
        getTimeString() { return '12:00'; }
    };
}

// WeatherSystem
if (typeof WeatherSystem === 'undefined') {
    window.WeatherSystem = class {
        constructor() { this.currentWeather = 'clear'; }
        update() { }
        updateCameraFollow() { }
        getVisibility() { return 1.0; }
        getWeather() { return this.currentWeather; }
    };
}

// Pathfinding (used by EnemyAI)
if (typeof Pathfinding === 'undefined') {
    window.Pathfinding = class {
        constructor() { }
        findPath() { return []; }
    };
}

console.log('[Stubs] Safety stubs applied ✅');
