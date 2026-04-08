/* ====================================================
   WARZONE EXODUS — PROGRESSION SYSTEM
   Level, XP, skill tree, achievements
   ==================================================== */

const SKILL_TREE = {
    combat: {
        title: 'COMBAT', icon: '⚔', className: 'combat',
        skills: [
            { id: 'faster_reload', name: 'Speed Loader', icon: '🔃', desc: '-15% reload time', cost: 1, effect: { reloadSpeed: 0.85 } },
            { id: 'reduced_recoil', name: 'Recoil Control', icon: '🎯', desc: '-20% weapon recoil', cost: 1, effect: { recoil: 0.8 } },
            { id: 'dual_wield', name: 'Dual Wield', icon: '🤺', desc: 'Equip 2 pistols at once', cost: 2, requires: ['faster_reload'] },
            { id: 'headshot_bonus', name: 'Marksman', icon: '💀', desc: '+0.5x headshot multiplier', cost: 1, effect: { headshotMult: 0.5 } },
            { id: 'extra_mag', name: 'Extra Mags', icon: '📦', desc: '+30% reserve ammo', cost: 1, effect: { magBonus: 1.3 } },
            { id: 'fire_rate', name: 'Trigger Discipline', icon: '🔥', desc: '+10% fire rate', cost: 2, effect: { fireRate: 1.1 } },
            { id: 'penetration', name: 'AP Rounds', icon: '🔩', desc: 'Bullets penetrate armor', cost: 2, effect: { penetration: 0.3 } },
            { id: 'melee_master', name: 'Melee Master', icon: '🗡', desc: '+50% melee damage', cost: 1, effect: { meleeDmg: 1.5 } }
        ]
    },
    survival: {
        title: 'SURVIVAL', icon: '❤', className: 'survival',
        skills: [
            { id: 'max_health', name: 'Iron Body', icon: '💪', desc: '+20 max HP', cost: 1, effect: { maxHealth: 20 } },
            { id: 'med_boost', name: 'Quick Heal', icon: '🩹', desc: 'Medkits heal 50% more', cost: 1, effect: { healBonus: 1.5 } },
            { id: 'fast_regen', name: 'Fast Recovery', icon: '♻', desc: '2x health regeneration', cost: 2, effect: { regenRate: 2 } },
            { id: 'fall_resist', name: 'Paratrooper', icon: '🪂', desc: 'Halved fall damage', cost: 1, effect: { fallDamage: 0.5 } },
            { id: 'stamina_boost', name: 'Endurance', icon: '🏃', desc: '50% more stamina', cost: 1, effect: { stamina: 1.5 } },
            { id: 'armor_boost', name: 'Plate Carrier', icon: '🛡', desc: '+25 max armor', cost: 1, effect: { maxArmor: 25 } },
            { id: 'regen_regen', name: 'Adrenaline Glands', icon: '⚕', desc: 'Auto-regen over 5HP', cost: 2, requires: ['fast_regen'] },
            { id: 'death_aversion', name: 'Last Stand', icon: '💥', desc: 'Survive 1 kill at 1 HP', cost: 3, requires: ['max_health', 'fast_regen'] }
        ]
    },
    stealth: {
        title: 'STEALTH', icon: '👁', className: 'stealth',
        skills: [
            { id: 'silent_step', name: 'Cat Step', icon: '🐱', desc: 'Silent movement', cost: 1, effect: { silent: true } },
            { id: 'better_camo', name: 'Camouflage', icon: '🌿', desc: 'Slower enemy detection', cost: 1, effect: { camoBonus: 0.5 } },
            { id: 'silent_takedown', name: 'Assassin', icon: '🔪', desc: 'Instant melee kill', cost: 2, requires: ['silent_step'] },
            { id: 'crouch_speed', name: 'Prowler', icon: '🦊', desc: '+50% crouch movement', cost: 1, effect: { crouchSpeed: 1.5 } },
            { id: 'suppressor_bonus', name: 'Ghost', icon: '👻', desc: 'Suppressed = 3x stealth', cost: 2 },
            { id: 'cloak_upgrade', name: 'Enhanced Cloak', icon: '🔮', desc: '+3s invisibility duration', cost: 2, requires: ['better_camo'] },
            { id: 'silent_shoot', name: 'Whisper', icon: '🤫', desc: 'No enemy alert from shots', cost: 3, requires: ['suppressor_bonus', 'cloak_upgrade'] }
        ]
    },
    tech: {
        title: 'TECH', icon: '🔧', className: 'tech',
        skills: [
            { id: 'better_radar', name: 'Field Scanner', icon: '📡', desc: 'See enemies on minimap', cost: 1, effect: { radarRange: 1.5 } },
            { id: 'drone_support', name: 'Drone Expert', icon: '🚁', desc: '+8s drone duration', cost: 1, effect: { droneDur: 1.5 } },
            { id: 'turret_deploy', name: 'Engineer', icon: '🔧', desc: 'Deploy auto-turret', cost: 3, requires: ['better_radar'] },
            { id: 'weapon_crafting', name: 'Armorer', icon: '🔩', desc: 'Craft attachments in field', cost: 2 },
            { id: 'hack_vehicles', name: 'Hacker', icon: '💻', desc: 'Remotely disable vehicles', cost: 2, requires: ['better_radar'] },
            { id: 'enhanced_hud', name: 'HUD Upgrade', icon: '📊', desc: 'Shows enemy health & type', cost: 1, effect: { hud: true } },
            { id: 'thermal_vision', name: 'Thermal Vision', icon: '🌡', desc: 'See enemies through walls', cost: 2, requires: ['enhanced_hud'] }
        ]
    }
};

class ProgressionSystem {
    constructor() {
        this.unlockedSkills = new Set(Object.keys(SaveManager.get('player.skills') || {}));
    }

    unlockSkill(skillId, player) {
        const skill = this._findSkill(skillId);
        if (!skill) return false;

        const skillPoints = SaveManager.get('player.skillPoints') || 0;
        if (skillPoints < skill.cost) {
            EventBus.emit(EVENTS.SHOW_NOTIFICATION, { text: '⚠ Not enough skill points!', type: 'warning' });
            return false;
        }

        // Check requirements
        if (skill.requires) {
            for (const req of skill.requires) {
                if (!this.unlockedSkills.has(req)) {
                    EventBus.emit(EVENTS.SHOW_NOTIFICATION, { text: `⚠ Requires: ${req}`, type: 'warning' });
                    return false;
                }
            }
        }

        this.unlockedSkills.add(skillId);
        SaveManager.set(`player.skills.${skillId}`, true);
        SaveManager.set('player.skillPoints', skillPoints - skill.cost);

        // Apply effect
        if (skill.effect && player) {
            this._applyEffect(skill.effect, player);
        }

        AudioEngine.play('levelUp');
        EventBus.emit(EVENTS.SHOW_NOTIFICATION, {
            text: `✅ Skill unlocked: ${skill.name}!`,
            type: 'gold'
        });

        return true;
    }

    _applyEffect(effect, player) {
        if (effect.maxHealth) {
            player.maxHealth += effect.maxHealth;
            player.health = Math.min(player.maxHealth, player.health + effect.maxHealth);
        }
        if (effect.maxArmor) player.maxArmor += effect.maxArmor;
        if (effect.stamina) player.stamina = Math.min(C.PLAYER_MAX_STAMINA * (effect.stamina || 1), player.stamina * (effect.stamina || 1));
        if (effect.silent) player.effects.silentStep = { permanent: true };
        if (effect.fallDamage) player.effects.fallResist = { permanent: true };
        if (effect.regenRate) player.effects.fastRegen = { permanent: true };
        if (effect.hud) player.effects.enhancedHUD = true;
    }

    _findSkill(id) {
        for (const branch of Object.values(SKILL_TREE)) {
            const skill = branch.skills.find(s => s.id === id);
            if (skill) return skill;
        }
        return null;
    }

    isUnlocked(skillId) { return this.unlockedSkills.has(skillId); }

    getSkillsForPlayer() {
        return this.unlockedSkills;
    }

    applyAllSkills(player) {
        for (const skillId of this.unlockedSkills) {
            const skill = this._findSkill(skillId);
            if (skill && skill.effect) this._applyEffect(skill.effect, player);
        }
    }

    renderSkillTree(container) {
        if (!container) return;
        container.innerHTML = '';
        const skillPoints = SaveManager.get('player.skillPoints') || 0;

        for (const [branchId, branch] of Object.entries(SKILL_TREE)) {
            const branchEl = document.createElement('div');
            branchEl.className = 'skill-branch';

            branchEl.innerHTML = `
        <div class="skill-branch-title ${branch.className}">${branch.icon} ${branch.title}</div>
      `;

            branch.skills.forEach(skill => {
                const unlocked = this.unlockedSkills.has(skill.id);
                const canUnlock = !unlocked && skillPoints >= skill.cost &&
                    (!skill.requires || skill.requires.every(r => this.unlockedSkills.has(r)));

                const skillEl = document.createElement('div');
                skillEl.className = `skill-node ${unlocked ? 'unlocked' : ''} ${!canUnlock && !unlocked ? 'unavailable' : ''}`;
                skillEl.innerHTML = `
          <span class="skill-icon">${skill.icon}</span>
          <div class="skill-info">
            <div class="skill-name">${skill.name}</div>
            <div class="skill-desc">${skill.desc}</div>
            ${skill.requires ? `<div class="skill-desc" style="color:#ff8844">Requires: ${skill.requires.join(', ')}</div>` : ''}
          </div>
          ${unlocked ? '<span class="skill-unlocked-badge">✓</span>' : `<span class="skill-cost">${skill.cost}SP</span>`}
        `;

                if (!unlocked && canUnlock) {
                    skillEl.addEventListener('click', () => {
                        if (this.unlockSkill(skill.id, window._gameRef?.player)) {
                            this.renderSkillTree(container);
                            document.getElementById('skill-points-count').textContent = SaveManager.get('player.skillPoints') || 0;
                        }
                    });
                }

                branchEl.appendChild(skillEl);
            });

            container.appendChild(branchEl);
        }
    }
}
