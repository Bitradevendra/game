/* achievements.js - Achievement system */

const ACHIEVEMENTS = [
    { id: 'first_blood', name: 'First Blood', icon: '🩸', desc: 'Kill your first enemy', condition: s => s.totalKills >= 1, reward: 100 },
    { id: 'kill_10', name: 'Soldier', icon: '🎖', desc: 'Kill 10 enemies', condition: s => s.totalKills >= 10, reward: 200 },
    { id: 'kill_50', name: 'Veteran', icon: '🏅', desc: 'Kill 50 enemies', condition: s => s.totalKills >= 50, reward: 500 },
    { id: 'kill_100', name: 'Elite Warrior', icon: '🏆', desc: 'Kill 100 enemies', condition: s => s.totalKills >= 100, reward: 1000 },
    { id: 'headshot_10', name: 'Marksman', icon: '🎯', desc: 'Land 10 headshots', condition: s => s.totalHeadshots >= 10, reward: 300 },
    { id: 'headshot_50', name: 'Sniper Elite', icon: '🔭', desc: 'Land 50 headshots', condition: s => s.totalHeadshots >= 50, reward: 700 },
    { id: 'streak_5', name: 'On Fire', icon: '🔥', desc: 'Get a 5-kill streak', condition: s => s.highestKillStreak >= 5, reward: 400 },
    { id: 'streak_10', name: 'Unstoppable', icon: '⚡', desc: 'Get a 10-kill streak', condition: s => s.highestKillStreak >= 10, reward: 800 },
    { id: 'streak_20', name: 'Godlike', icon: '👑', desc: 'Get a 20-kill streak', condition: s => s.highestKillStreak >= 20, reward: 2000 },
    { id: 'survive_5min', name: 'Survivor', icon: '⏱', desc: 'Survive for 5 minutes', condition: s => s.longestWin >= 300, reward: 300 },
    { id: 'survive_15m', name: 'Iron Will', icon: '🛡', desc: 'Survive for 15 minutes', condition: s => s.longestWin >= 900, reward: 700 },
    { id: 'level_5', name: 'Promoted', icon: '⬆', desc: 'Reach Level 5', condition: s => s.level >= 5, reward: 500 },
    { id: 'level_20', name: 'Commander', icon: '🎗', desc: 'Reach Level 20', condition: s => s.level >= 20, reward: 2000 },
    { id: 'max_level', name: 'Legend', icon: '💎', desc: `Reach Level ${C.MAX_LEVEL}`, condition: s => s.level >= C.MAX_LEVEL, reward: 5000 },
    { id: 'boss_killed', name: 'Giant Slayer', icon: '👾', desc: 'Defeat a boss enemy', condition: s => (s.bossKills || 0) >= 1, reward: 1000 },
    { id: 'wave_10', name: 'Wave Rider', icon: '🌊', desc: 'Survive 10 waves', condition: s => s.highestWaveSurvived >= 10, reward: 800 },
    { id: 'mission_5', name: 'Campaign Hero', icon: '📋', desc: 'Complete 5 missions', condition: s => s.totalMissionsCompleted >= 5, reward: 1000 },
    { id: 'accuracy_80', name: 'Precision', icon: '💯', desc: 'Achieve 80% shooting accuracy', condition: s => (s.bulletsHit / (s.bulletsShot || 1)) * 100 >= 80, reward: 600 },
    { id: 'npc_helped', name: 'Friendly Fire', icon: '🤝', desc: 'Help 3 NPCs', condition: s => s.npcHelped >= 3, reward: 400 },
    { id: 'vehicle_kill', name: 'Road Kill', icon: '🚗', desc: 'Get a vehicle kill', condition: s => s.vehicleKills >= 1, reward: 400 }
];

class AchievementSystem {
    constructor() {
        this.earned = new Set(Object.keys(SaveManager.get('achievements') || {}));
    }

    checkAll() {
        const stats = SaveManager.getData()?.player;
        const gameStats = SaveManager.getData()?.stats;
        if (!stats) return;

        const combined = { ...stats, ...gameStats };

        for (const ach of ACHIEVEMENTS) {
            if (this.earned.has(ach.id)) continue;

            try {
                if (ach.condition(combined)) {
                    this._unlock(ach);
                }
            } catch (e) { /* skip */ }
        }
    }

    _unlock(ach) {
        this.earned.add(ach.id);
        SaveManager.set(`achievements.${ach.id}`, { earned: Date.now() });
        SaveManager.addXP(ach.reward);

        AudioEngine.play('levelUp');
        EventBus.emit(EVENTS.ACHIEVEMENT_EARNED, ach);
        EventBus.emit(EVENTS.SHOW_NOTIFICATION, {
            text: `🏆 ACHIEVEMENT: ${ach.icon} ${ach.name} — +${ach.reward} XP`,
            type: 'gold'
        });
    }

    getEarned() { return this.earned; }
    getTotal() { return ACHIEVEMENTS.length; }
    getProgress() { return (this.earned.size / ACHIEVEMENTS.length) * 100; }
}
