/* ====================================================
   WARZONE EXODUS — QUEST SYSTEM
   20+ missions with objectives, tracking, cutscenes
   ==================================================== */

const QUEST_DATA = [
    {
        id: 'q1_survive', name: 'First Blood', type: 'kill',
        description: 'Eliminate 5 enemies to prove yourself.',
        objective: 'Kill 5 enemies', target: 5, current: 0,
        reward: { xp: 300, item: 'medkit_large' },
        icon: '⚔', priority: 'primary'
    },
    {
        id: 'q2_headshots', name: 'Sharpshooter', type: 'headshot',
        description: 'Land 3 headshots. Aim for the head!',
        objective: 'Land 3 headshots', target: 3, current: 0,
        reward: { xp: 400, item: 'ammo_sniper' },
        icon: '🎯', priority: 'secondary'
    },
    {
        id: 'q3_loot', name: 'Scavenger', type: 'loot',
        description: 'Collect 5 supply crates scattered across the zone.',
        objective: 'Open 5 crates', target: 5, current: 0,
        reward: { xp: 250, item: 'armor_vest' },
        icon: '📦', priority: 'secondary'
    },
    {
        id: 'q4_stealth', name: 'Ghost Protocol', type: 'stealth_kill',
        description: 'Eliminate 3 enemies with a suppressed weapon without being detected.',
        objective: 'Stealth kills: 0/3', target: 3, current: 0,
        reward: { xp: 500, item: 'night_vision' },
        icon: '👻', priority: 'secondary'
    },
    {
        id: 'q5_streak', name: 'Killing Spree', type: 'streak',
        description: 'Achieve a 5-kill streak without dying.',
        objective: 'Kill streak: 0/5', target: 5, current: 0,
        reward: { xp: 600, item: 'frag_grenade' },
        icon: '🔥', priority: 'secondary'
    },
    {
        id: 'q6_rescue', name: 'No Man Left Behind', type: 'rescue',
        description: 'Find and rescue the downed pilot from the crash site.',
        objective: 'Rescue the pilot', target: 1, current: 0,
        reward: { xp: 800, item: 'medkit_large' },
        icon: '✈', priority: 'primary'
    },
    {
        id: 'q7_destroy_radar', name: 'Signal Blackout', type: 'destroy',
        description: 'Destroy the enemy radar installation to cut their communications.',
        objective: 'Destroy radar tower', target: 1, current: 0,
        reward: { xp: 700, item: 'explosives' },
        icon: '📡', priority: 'primary'
    },
    {
        id: 'q8_survive_waves', name: 'Last Stand', type: 'wave_survive',
        description: 'Survive 10 waves of increasingly powerful enemies.',
        objective: 'Survive wave: 0/10', target: 10, current: 0,
        reward: { xp: 1500, item: 'armor_vest' },
        icon: '🌊', priority: 'primary'
    },
    {
        id: 'q9_intel', name: 'Intel Gatherer', type: 'collect_intel',
        description: 'Find 3 classified intel files hidden across the battlefield.',
        objective: 'Intel files: 0/3', target: 3, current: 0,
        reward: { xp: 450, item: 'intel_1' },
        icon: '📄', priority: 'secondary'
    },
    {
        id: 'q10_grenade', name: 'Demo Expert', type: 'grenade_kills',
        description: 'Eliminate 5 enemies using grenades or explosives.',
        objective: 'Grenade kills: 0/5', target: 5, current: 0,
        reward: { xp: 500, item: 'molotov' },
        icon: '💣', priority: 'secondary'
    },
    {
        id: 'q11_vehicle', name: 'Road Rage', type: 'vehicle_kill',
        description: 'Run over 3 enemies with a vehicle.',
        objective: 'Vehicle kills: 0/3', target: 3, current: 0,
        reward: { xp: 600, item: 'ammo_heavy' },
        icon: '🚗', priority: 'secondary'
    },
    {
        id: 'q12_boss', name: 'Giant Slayer', type: 'boss_kill',
        description: 'Defeat a boss enemy.',
        objective: 'Kill a boss', target: 1, current: 0,
        reward: { xp: 1000, item: 'night_vision' },
        icon: '👾', priority: 'primary'
    },
    {
        id: 'q13_steal_docs', name: 'Operation: Paperwork', type: 'reach_location',
        description: 'Infiltrate the command post and steal classified documents.',
        objective: 'Reach command post', target: 1, current: 0,
        reward: { xp: 900, item: 'intel_2' },
        icon: '🗂', priority: 'primary'
    },
    {
        id: 'q14_treasure', name: 'Treasure Hunter', type: 'find_item',
        description: 'Find the legendary treasure buried somewhere on the map.',
        objective: 'Find the treasure', target: 1, current: 0,
        reward: { xp: 1200, item: 'treasure_map' },
        icon: '💰', priority: 'secondary'
    },
    {
        id: 'q15_accuracy', name: 'Precision Strike', type: 'accuracy',
        description: 'Maintain 70% accuracy over 20 shots.',
        objective: 'Accuracy: 0%', target: 70, current: 0,
        reward: { xp: 400, item: 'ammo_sniper' },
        icon: '🎯', priority: 'secondary'
    }
];

class QuestSystem {
    constructor() {
        this.activeQuests = new Map();
        this.completedQuests = new Set(SaveManager.get('missions.completedIds') || []);
        this.questKills = 0;
        this.questHeadshots = 0;
        this.questGrenadeKills = 0;
        this.questVehicleKills = 0;
        this.questStreakMax = 0;

        // Subscribe to events
        EventBus.on(EVENTS.ENEMY_KILLED, this._onEnemyKilled.bind(this));
        EventBus.on(EVENTS.HEADSHOT, this._onHeadshot.bind(this));
        EventBus.on(EVENTS.OBJECTIVE_DONE, this._onObjectiveDone.bind(this));
        EventBus.on(EVENTS.LOOT_PICKED_UP, this._onLootPickedUp.bind(this));
    }

    startQuest(questId) {
        const def = QUEST_DATA.find(q => q.id === questId);
        if (!def || this.completedQuests.has(questId)) return false;

        const quest = { ...def, current: 0, startTime: Date.now() };
        this.activeQuests.set(questId, quest);

        EventBus.emit(EVENTS.QUEST_STARTED, quest);
        EventBus.emit(EVENTS.SHOW_NOTIFICATION, {
            text: `📋 Quest started: ${quest.name}`,
            type: 'gold'
        });

        return true;
    }

    startMissionQuests(missionId) {
        // Start relevant quests for this mission
        const missionQuests = {
            mission_1: ['q1_survive', 'q2_headshots', 'q3_loot'],
            mission_2: ['q4_stealth', 'q5_streak', 'q6_rescue'],
            mission_3: ['q7_destroy_radar', 'q8_survive_waves'],
            mission_4: ['q9_intel', 'q10_grenade', 'q11_vehicle'],
            mission_5: ['q12_boss', 'q13_steal_docs', 'q14_treasure']
        };

        const quests = missionQuests[missionId] || ['q1_survive'];
        quests.forEach(qId => this.startQuest(qId));

        // Always start some base quests
        this.startQuest('q1_survive');
        this.startQuest('q2_headshots');
    }

    updateProgress(questId, amount = 1) {
        const quest = this.activeQuests.get(questId);
        if (!quest) return;

        quest.current = Math.min(quest.target, quest.current + amount);

        EventBus.emit(EVENTS.QUEST_UPDATED, quest);
        this._updateHUDObjective(quest);

        if (quest.current >= quest.target) {
            this._completeQuest(questId);
        }
    }

    _completeQuest(questId) {
        const quest = this.activeQuests.get(questId);
        if (!quest) return;

        this.activeQuests.delete(questId);
        this.completedQuests.add(questId);

        // Save progress
        SaveManager.set('missions.completedIds', Array.from(this.completedQuests));

        // Give reward
        if (quest.reward) {
            SaveManager.addXP(quest.reward.xp);
            EventBus.emit(EVENTS.SHOW_XP_POPUP, { amount: quest.reward.xp, label: 'QUEST COMPLETE!' });
            if (quest.reward.item) {
                EventBus.emit('quest_item_reward', { item: quest.reward.item });
            }
        }

        AudioEngine.play('questComplete');
        EventBus.emit(EVENTS.QUEST_COMPLETED, quest);
        EventBus.emit(EVENTS.SHOW_NOTIFICATION, {
            text: `🏆 Quest complete: ${quest.name}! +${quest.reward?.xp || 0} XP`,
            type: 'gold'
        });
    }

    _onEnemyKilled({ enemy }) {
        this.questKills++;
        this.updateProgress('q1_survive');

        // Boss kill
        if (enemy.isBoss) {
            this.updateProgress('q12_boss');
        }

        // Grenade kills
        if (enemy.lastDamageSource === 'grenade') {
            this.questGrenadeKills++;
            this.updateProgress('q10_grenade');
        }

        // Vehicle kills
        if (enemy.lastDamageSource === 'vehicle') {
            this.questVehicleKills++;
            this.updateProgress('q11_vehicle');
        }
    }

    _onHeadshot({ enemy }) {
        this.questHeadshots++;
        this.updateProgress('q2_headshots');
    }

    _onObjectiveDone({ id }) {
        switch (id) {
            case 'rescue_pilot': this.updateProgress('q6_rescue'); break;
            case 'destroy_radar': this.updateProgress('q7_destroy_radar'); break;
            case 'reach_command_post': this.updateProgress('q13_steal_docs'); break;
            case 'find_treasure': this.updateProgress('q14_treasure'); break;
        }
    }

    _onLootPickedUp(item) {
        if (item.category === 'intel') {
            this.updateProgress('q9_intel');
        }
        this.updateProgress('q3_loot');
    }

    onWaveComplete(waveNum) {
        this.updateProgress('q8_survive_waves');
    }

    _updateHUDObjective(quest) {
        const objEl = document.getElementById('hud-objective');
        if (!objEl) return;

        // Show the primary active quest
        if (quest.priority === 'primary') {
            objEl.textContent = `${quest.icon} ${quest.objective} (${quest.current}/${quest.target})`;
        }
    }

    getActiveQuestsSummary() {
        return Array.from(this.activeQuests.values()).map(q => ({
            name: q.name,
            objective: `${q.objective.split(':')[0]}: ${q.current}/${q.target}`,
            icon: q.icon,
            priority: q.priority
        }));
    }

    isQuestComplete(questId) {
        return this.completedQuests.has(questId);
    }

    getCompletionPercent() {
        return (this.completedQuests.size / QUEST_DATA.length) * 100;
    }
}
