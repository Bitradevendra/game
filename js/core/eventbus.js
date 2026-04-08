/* ====================================================
   WARZONE EXODUS — EVENT BUS
   Global pub/sub event system
   ==================================================== */

const EventBus = (() => {
    const listeners = {};

    return {
        on(event, callback, context = null) {
            if (!listeners[event]) listeners[event] = [];
            listeners[event].push({ callback, context });
            return () => this.off(event, callback); // returns unsubscribe fn
        },

        off(event, callback) {
            if (!listeners[event]) return;
            listeners[event] = listeners[event].filter(l => l.callback !== callback);
        },

        once(event, callback, context = null) {
            const wrapper = (...args) => {
                callback.apply(context, args);
                this.off(event, wrapper);
            };
            this.on(event, wrapper, context);
        },

        emit(event, ...args) {
            if (!listeners[event]) return;
            listeners[event].forEach(l => {
                try {
                    l.callback.apply(l.context, args);
                } catch (e) {
                    console.error(`EventBus error on "${event}":`, e);
                }
            });
        },

        clear(event) {
            if (event) delete listeners[event];
            else Object.keys(listeners).forEach(k => delete listeners[k]);
        },

        listEvents() {
            return Object.keys(listeners);
        }
    };
})();

// Named game events for IDE autocomplete & clarity
const EVENTS = {
    // Player
    PLAYER_DAMAGED: 'player:damaged',
    PLAYER_HEALED: 'player:healed',
    PLAYER_DIED: 'player:died',
    PLAYER_RESPAWNED: 'player:respawned',
    PLAYER_LEVELED_UP: 'player:leveledUp',
    PLAYER_JUMPED: 'player:jumped',
    PLAYER_SPRINTING: 'player:sprinting',
    PLAYER_CROUCHED: 'player:crouched',

    // Combat
    WEAPON_FIRED: 'combat:weaponFired',
    WEAPON_RELOADED: 'combat:weaponReloaded',
    WEAPON_SWITCHED: 'combat:weaponSwitched',
    ENEMY_KILLED: 'combat:enemyKilled',
    ENEMY_DAMAGED: 'combat:enemyDamaged',
    HEADSHOT: 'combat:headshot',
    MELEE_HIT: 'combat:meleeHit',
    GRENADE_THROWN: 'combat:grenadeThrown',
    EXPLOSION: 'combat:explosion',
    ABILITY_USED: 'combat:abilityUsed',

    // World
    ZONE_ENTERED: 'world:zoneEntered',
    WEATHER_CHANGED: 'world:weatherChanged',
    DAY_CHANGED: 'world:dayChanged',
    SUPPLY_DROP_LANDED: 'world:supplyDropLanded',
    VEHICLE_ENTERED: 'world:vehicleEntered',
    VEHICLE_EXITED: 'world:vehicleExited',
    DOOR_OPENED: 'world:doorOpened',
    LOOT_PICKED_UP: 'world:lootPickedUp',
    INTERACT: 'world:interact',

    // Quest / Mission
    QUEST_STARTED: 'quest:started',
    QUEST_UPDATED: 'quest:updated',
    QUEST_COMPLETED: 'quest:completed',
    QUEST_FAILED: 'quest:failed',
    MISSION_COMPLETE: 'mission:complete',
    MISSION_FAILED: 'mission:failed',
    OBJECTIVE_DONE: 'mission:objectiveDone',

    // UI
    SHOW_NOTIFICATION: 'ui:notification',
    SHOW_XP_POPUP: 'ui:xpPopup',
    SHOW_KILL_FEED: 'ui:killFeed',
    WAVE_STARTED: 'ui:waveStarted',
    BOSS_SPAWNED: 'ui:bossSpawned',
    ACHIEVEMENT_EARNED: 'ui:achievement',

    // AI
    ENEMY_ALERTED: 'ai:alerted',
    ENEMY_SPOTTED: 'ai:spotted',
    SQUAD_FORMED: 'ai:squadFormed',

    // Inventory
    ITEM_ADDED: 'inventory:itemAdded',
    ITEM_REMOVED: 'inventory:itemRemoved',
    ITEM_EQUIPPED: 'inventory:itemEquipped',
    ARMOR_CHANGED: 'inventory:armorChanged',

    // Game state
    GAME_PAUSED: 'game:paused',
    GAME_RESUMED: 'game:resumed',
    GAME_OVER: 'game:over',
    GAME_VICTORY: 'game:victory',
    GAME_MODE_STARTED: 'game:modeStarted',

    // Audio
    PLAY_SFX: 'audio:sfx',
    PLAY_MUSIC: 'audio:music',
    STOP_MUSIC: 'audio:stopMusic'
};
