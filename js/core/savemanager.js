/* ====================================================
   WARZONE EXODUS — SAVE MANAGER
   LocalStorage persistence for player progress
   ==================================================== */

const SaveManager = (() => {
    const KEY = 'warzoneExodus_save_v2';

    const DEFAULT_SAVE = {
        version: '2.0.0',
        created: Date.now(),
        lastPlayed: Date.now(),

        // Player progression
        player: {
            level: 1,
            xp: 0,
            xpToNextLevel: C.XP_LEVEL_BASE,
            skillPoints: 0,
            skills: {},
            totalKills: 0,
            totalDeaths: 0,
            totalPlaytime: 0,
            totalMissionsCompleted: 0,
            totalHeadshots: 0,
            longestWin: 0,
            highestKillStreak: 0,
            highestWaveSurvived: 0,
            currentSkin: 'default',
            currentAbility: 'FOCUS'
        },

        // Mission progress
        missions: {
            completedIds: [],
            currentMission: null,
            campaignProgress: 0
        },

        // Unlocks
        unlocked: {
            weapons: ['AK47', 'PISTOL', 'KNIFE'],
            skins: ['default'],
            abilities: ['FOCUS'],
            missions: ['mission_1']
        },

        // Loadout
        loadout: {
            primary: 'AK47',
            secondary: 'PISTOL',
            melee: 'KNIFE',
            grenade: 'FRAG',
            ability: 'FOCUS'
        },

        // Settings
        settings: {
            mouseSensitivity: 5,
            fov: 75,
            masterVolume: 80,
            musicVolume: 60,
            sfxVolume: 90,
            graphicsQuality: 'medium',
            shadows: true,
            particles: true,
            showFPS: false
        },

        // Statistics
        stats: {
            killsByWeapon: {},
            timePerZone: {},
            damageDealt: 0,
            damageTaken: 0,
            bulletsShot: 0,
            bulletsHit: 0,
            grenadeKills: 0,
            vehicleKills: 0,
            npcHelped: 0
        },

        // Achievements
        achievements: {},

        // Daily Challenge
        dailyChallenge: {
            date: null,
            completed: false,
            challengeId: null
        }
    };

    let saveData = null;

    function load() {
        try {
            const raw = localStorage.getItem(KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                // Merge with defaults to handle new fields in updates
                saveData = deepMerge(DEFAULT_SAVE, parsed);
                saveData.lastPlayed = Date.now();
                return true;
            }
        } catch (e) {
            console.warn('SaveManager: failed to load save:', e);
        }
        saveData = JSON.parse(JSON.stringify(DEFAULT_SAVE));
        return false;
    }

    function save() {
        if (!saveData) return;
        try {
            saveData.lastPlayed = Date.now();
            localStorage.setItem(KEY, JSON.stringify(saveData));
        } catch (e) {
            console.error('SaveManager: failed to save:', e);
        }
    }

    function reset() {
        localStorage.removeItem(KEY);
        saveData = JSON.parse(JSON.stringify(DEFAULT_SAVE));
    }

    function deepMerge(target, source) {
        const out = Object.assign({}, target);
        for (const key of Object.keys(source)) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                out[key] = deepMerge(target[key] || {}, source[key]);
            } else {
                out[key] = source[key];
            }
        }
        return out;
    }

    // Auto-save every 60 seconds
    setInterval(() => { if (saveData) save(); }, 60000);

    return {
        load,
        save,
        reset,

        get(path) {
            if (!saveData) return null;
            return path.split('.').reduce((obj, key) => obj?.[key], saveData);
        },

        set(path, value) {
            if (!saveData) return;
            const keys = path.split('.');
            let obj = saveData;
            for (let i = 0; i < keys.length - 1; i++) {
                if (!obj[keys[i]]) obj[keys[i]] = {};
                obj = obj[keys[i]];
            }
            obj[keys[keys.length - 1]] = value;
        },

        merge(path, data) {
            if (!saveData) return;
            const current = this.get(path) || {};
            this.set(path, Object.assign(current, data));
        },

        getData() { return saveData; },

        hasExistingSave() {
            return !!localStorage.getItem(KEY);
        },

        // XP / Leveling
        addXP(amount) {
            if (!saveData) return 0;
            saveData.player.xp += amount;
            let levelsGained = 0;
            while (saveData.player.xp >= saveData.player.xpToNextLevel && saveData.player.level < C.MAX_LEVEL) {
                saveData.player.xp -= saveData.player.xpToNextLevel;
                saveData.player.level++;
                saveData.player.skillPoints++;
                saveData.player.xpToNextLevel = Math.floor(C.XP_LEVEL_BASE * Math.pow(C.XP_LEVEL_SCALE, saveData.player.level - 1));
                levelsGained++;
                EventBus.emit(EVENTS.PLAYER_LEVELED_UP, saveData.player.level);
            }
            return levelsGained;
        },

        // Unlock tracking
        isUnlocked(type, id) {
            return saveData?.unlocked[type]?.includes(id) || false;
        },

        unlock(type, id) {
            if (!saveData?.unlocked[type]) saveData.unlocked[type] = [];
            if (!saveData.unlocked[type].includes(id)) {
                saveData.unlocked[type].push(id);
                this.save();
            }
        },

        // Stats tracking
        addStat(key, amount = 1) {
            if (!saveData?.stats) return;
            saveData.stats[key] = (saveData.stats[key] || 0) + amount;
        },

        getXPProgress() {
            if (!saveData) return 0;
            return saveData.player.xp / saveData.player.xpToNextLevel;
        }
    };
})();
