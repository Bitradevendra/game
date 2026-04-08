/* ====================================================
   WARZONE EXODUS — BOSS ENTITIES
   Boss enemies with phases, special attacks, health bars
   ==================================================== */

class Boss extends Enemy {
    constructor(scene, particles, bossType = 'BOSS_TITAN') {
        super(scene, particles, bossType);

        this.isBoss = true;
        this.phase = 1;
        this.maxPhases = 3;
        this.phaseThresholds = [0.66, 0.33, 0]; // Health % to enter each phase
        this.specialAttackCooldown = 0;
        this.enragedMode = false;
        this.arenaCenter = new THREE.Vector3();
        this.shieldActive = false;
        this.shieldHealth = 0;

        // Boss-specific meshes
        this._createBossMesh();

        // Phase dialogue
        this.phaseLines = {
            1: ['You dare challenge me?!', 'I\'ll bury you here!'],
            2: ['Is that all you\'ve got?!', '*ENRAGED* Come on then!'],
            3: ['*ENRAGED* YOU WILL NOT SURVIVE!', 'MAXIMUM POWER!']
        };
    }

    _createBossMesh() {
        // Remove existing mesh if any
        if (this.mesh && this.mesh.parent) {
            this.mesh.parent.remove(this.mesh);
        }

        const group = new THREE.Group();

        const bossConfigs = {
            BOSS_TITAN: {
                bodyColor: 0x224422, scale: 1.8,
                armorColor: 0x333333, hasShield: false
            },
            BOSS_GHOST: {
                bodyColor: 0x222244, scale: 1.3,
                armorColor: 0x111122, hasShield: true
            },
            BOSS_TANK: {
                bodyColor: 0x443322, scale: 2.2,
                armorColor: 0x444444, hasShield: false
            }
        };

        const conf = bossConfigs[this.typeKey] || bossConfigs.BOSS_TITAN;
        group.scale.setScalar(conf.scale);

        // Main body (bulkier)
        const bodyGeo = new THREE.CylinderGeometry(0.45, 0.5, 1.5, 10);
        const bodyMat = new THREE.MeshLambertMaterial({ color: conf.bodyColor });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.75;
        body.castShadow = true;
        group.add(body);

        // Armor plates
        const plateMat = new THREE.MeshPhongMaterial({ color: conf.armorColor, shininess: 60 });
        const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.2), plateMat);
        chestPlate.position.set(0, 0.9, 0.45);
        group.add(chestPlate);

        // Head (larger)
        const headGeo = new THREE.BoxGeometry(0.55, 0.55, 0.55);
        const headMat = new THREE.MeshLambertMaterial({ color: 0x445544 });
        this.headMesh = new THREE.Mesh(headGeo, headMat);
        this.headMesh.position.y = 1.75;
        this.headMesh.castShadow = true;
        group.add(this.headMesh);

        // Shoulder pads
        for (let side = -1; side <= 1; side += 2) {
            const padGeo = new THREE.SphereGeometry(0.3, 8, 8, 0, Math.PI * 2, 0, Math.PI);
            const pad = new THREE.Mesh(padGeo, plateMat);
            pad.position.set(side * 0.7, 1.2, 0);
            group.add(pad);
        }

        // Glow effect for active boss
        const glowMat = new THREE.MeshBasicMaterial({ color: 0x440022, transparent: true, opacity: 0.15 });
        const glow = new THREE.Mesh(new THREE.SphereGeometry(1.5, 16, 16), glowMat);
        glow.position.y = 0.8;
        group.add(glow);
        this.glowMesh = glow;

        // Shield visualization (for GHOST boss)
        if (conf.hasShield) {
            const shieldMat = new THREE.MeshBasicMaterial({
                color: 0x0044ff, transparent: true, opacity: 0.3,
                side: THREE.DoubleSide
            });
            const shieldMesh = new THREE.Mesh(new THREE.SphereGeometry(2, 12, 12), shieldMat);
            shieldMesh.visible = false;
            group.add(shieldMesh);
            this.shieldMesh = shieldMesh;
        }

        this.mesh = group;
        this.mesh.name = `boss_${this.typeKey}`;
        this.scene.add(this.mesh);

        // Boss health bar (larger)
        this._createBossHealthBar();
    }

    _createBossHealthBar() {
        // Larger health bar
        const bgGeo = new THREE.PlaneGeometry(2, 0.18);
        const bgMat = new THREE.MeshBasicMaterial({ color: 0x440000 });
        this.healthBarBg = new THREE.Mesh(bgGeo, bgMat);

        const fillGeo = new THREE.PlaneGeometry(2, 0.18);
        const fillMat = new THREE.MeshBasicMaterial({ color: 0xff0044 });
        this.healthBarFill = new THREE.Mesh(fillGeo, fillMat);

        const barGroup = new THREE.Group();
        barGroup.add(this.healthBarBg);
        barGroup.add(this.healthBarFill);
        barGroup.position.y = 3.5;

        this.mesh.add(barGroup);
        this.healthBarGroup = barGroup;
    }

    update(dt, player, world, camera) {
        if (!this.isAlive) return;

        super.update(dt, player, world, camera);

        // Check phase transitions
        const healthPct = this.health / this.maxHealth;
        const newPhase = healthPct > this.phaseThresholds[0] ? 1 :
            healthPct > this.phaseThresholds[1] ? 2 : 3;

        if (newPhase > this.phase) {
            this._enterPhase(newPhase);
        }

        // Special attack cooldown
        this.specialAttackCooldown = Math.max(0, this.specialAttackCooldown - dt);

        // Glow animation
        if (this.glowMesh) {
            const intensity = this.phase === 3 ? 1 : this.phase === 2 ? 0.5 : 0.2;
            this.glowMesh.material.opacity = (0.1 + Math.sin(Date.now() * 0.003) * 0.1) * intensity;
            const glowColors = { 1: 0x440022, 2: 0x880011, 3: 0xff0000 };
            this.glowMesh.material.color.setHex(glowColors[this.phase]);
        }

        // Shield regeneration for GHOST boss
        if (this.typeKey === 'BOSS_GHOST' && this.shieldMesh) {
            if (this.shieldActive) {
                this.shieldHealth = Math.min(200, this.shieldHealth + dt * 10);
                if (this.shieldMesh) this.shieldMesh.visible = true;
            }
        }
    }

    _enterPhase(phase) {
        this.phase = phase;
        this.enragedMode = phase >= 2;

        // Stat boosts per phase
        this.damage *= 1.3;
        this.speed *= 1.2;
        this.attackCooldown *= 0.8;

        // Visual effect
        if (this.particles && this.mesh) {
            this.particles.createExplosion(
                this.position.clone().add(new THREE.Vector3(0, 1, 0)),
                phase * 1.5,
                phase >= 3 ? 0xff0000 : 0xff4400
            );
        }

        // Phase speech
        const lines = this.phaseLines[phase] || this.phaseLines[1];
        EventBus.emit(EVENTS.SHOW_NOTIFICATION, {
            text: `💀 ${this.typeName}: "${Utils.randomElement(lines)}"`,
            type: 'danger'
        });

        // Phase 3: activate shield for GHOST
        if (phase === 3 && this.typeKey === 'BOSS_GHOST') {
            this.shieldActive = true;
            this.shieldHealth = 200;
            EventBus.emit(EVENTS.SHOW_NOTIFICATION, { text: '🛡 GHOST activated energy shield!', type: 'danger' });
        }

        // Phase 3: spawn minions for TITAN
        if (phase === 3 && this.typeKey === 'BOSS_TITAN') {
            EventBus.emit('boss_spawn_minions', { boss: this, count: 4 });
        }

        EventBus.emit(EVENTS.SHOW_NOTIFICATION, {
            text: `⚠ ${this.typeName} entered PHASE ${phase}!`,
            type: 'danger'
        });
    }

    takeDamage(amount, source = 'bullet', isHeadshot = false) {
        // Shield absorbs damage first (GHOST boss)
        if (this.shieldActive && this.shieldHealth > 0) {
            const shieldAbsorb = Math.min(this.shieldHealth, amount);
            this.shieldHealth -= shieldAbsorb;
            amount -= shieldAbsorb;

            if (this.shieldMesh) {
                this.shieldMesh.material.opacity = 0.3 + Math.random() * 0.3;
            }

            if (this.shieldHealth <= 0) {
                this.shieldActive = false;
                if (this.shieldMesh) this.shieldMesh.visible = false;
                EventBus.emit(EVENTS.SHOW_NOTIFICATION, { text: '💥 GHOST\'s shield DESTROYED!', type: 'gold' });
            }

            if (amount <= 0) return 0;
        }

        return super.takeDamage(amount, source, isHeadshot);
    }

    useSpecialAttack(player) {
        if (this.specialAttackCooldown > 0) return null;

        const attacks = {
            BOSS_TITAN: ['ground_slam', 'charge', 'grenade_barrage'],
            BOSS_GHOST: ['teleport', 'speed_burst', 'clone'],
            BOSS_TANK: ['missile_salvo', 'shield_charge', 'stomp']
        };

        const availableAttacks = attacks[this.typeKey] || attacks.BOSS_TITAN;
        const attack = Utils.randomElement(availableAttacks);

        this.specialAttackCooldown = Utils.randomInRange(6, 12);

        return {
            type: attack,
            boss: this,
            targetPosition: player.position.clone()
        };
    }

    _die() {
        super._die();

        // Epic death
        if (this.particles) {
            for (let i = 0; i < 5; i++) {
                setTimeout(() => {
                    if (this.particles) {
                        this.particles.createExplosion(
                            this.position.clone().add(new THREE.Vector3(
                                Utils.randomInRange(-2, 2), Utils.randomInRange(0, 3), Utils.randomInRange(-2, 2)
                            )),
                            2.0,
                            0xff4400
                        );
                    }
                }, i * 300);
            }
        }

        EventBus.emit(EVENTS.SHOW_NOTIFICATION, {
            text: `💀 BOSS DEFEATED: ${this.typeName}!`,
            type: 'gold'
        });
    }
}

// ==================== NPC CLASS ====================
class NPC {
    constructor(scene, npcType = 'RESISTANCE') {
        this.scene = scene;
        this.npcType = npcType;
        const conf = C.NPC_TYPES[npcType];
        this.name = conf ? conf.name : 'Unknown';
        this.role = conf ? conf.role : 'generic';
        this.icon = conf ? conf.icon : '🧑';

        this.position = new THREE.Vector3();
        this.interactionRadius = 4;
        this.hasInteracted = false;
        this.dialogue = this._buildDialogue();
        this.dialogueIndex = 0;
        this.isAlive = true;

        this._createMesh();
    }

    _createMesh() {
        const group = new THREE.Group();

        const npcColors = {
            RESISTANCE: 0x445544, TRADER: 0x544433,
            MECHANIC: 0x443322, DOCTOR: 0x445566, PILOT: 0x334477
        };
        const color = npcColors[this.npcType] || 0x555555;

        const bodyGeo = new THREE.CylinderGeometry(0.32, 0.32, 1.3, 8);
        const body = new THREE.Mesh(bodyGeo, new THREE.MeshLambertMaterial({ color }));
        body.position.y = 0.65;
        group.add(body);

        const head = new THREE.Mesh(
            new THREE.SphereGeometry(0.22, 8, 8),
            new THREE.MeshLambertMaterial({ color: 0x886655 })
        );
        head.position.y = 1.45;
        group.add(head);

        // Friendly indicator (yellow glow above)
        const indicator = new THREE.Mesh(
            new THREE.SphereGeometry(0.1, 6, 6),
            new THREE.MeshBasicMaterial({ color: 0xffdd00 })
        );
        indicator.position.y = 2.1;
        group.add(indicator);

        const light = new THREE.PointLight(0xffdd00, 0.5, 3);
        light.position.y = 2.2;
        group.add(light);

        this.mesh = group;
        this.scene.add(this.mesh);
    }

    _buildDialogue() {
        const dialogues = {
            RESISTANCE: [
                'Thank god you\'re here! The enemy has us surrounded.',
                'I have ammo and supplies. Take them, you\'ll need them.',
                'There\'s a sniper on the water tower. Watch your six!'
            ],
            TRADER: [
                'Psst! Looking to trade? I\'ve got good gear.',
                'Gold, supplies, weapons... I got it all.',
                'Come back when you have more loot!'
            ],
            MECHANIC: [
                'I can upgrade your weapons if you bring me parts.',
                'That gun of yours needs work. Let me take a look.',
                'Extended mags, suppressors... I can fit them all.'
            ],
            DOCTOR: [
                'You look hurt. Let me patch you up.',
                'I can boost your max health if you bring me meds.',
                'Stay healthy out there!'
            ],
            PILOT: [
                'My helicopter went down over the ridge!',
                'Get me out of here and I\'ll fly you anywhere!',
                'There are more of them coming from the east!'
            ]
        };
        return dialogues[this.npcType] || ['...'];
    }

    interact(player) {
        if (!this.isAlive) return null;

        const line = this.dialogue[this.dialogueIndex % this.dialogue.length];
        this.dialogueIndex++;

        // Give reward on first interaction
        let reward = null;
        if (!this.hasInteracted) {
            this.hasInteracted = true;
            reward = this._giveReward(player);
        }

        return { dialogue: line, npcName: this.name, icon: this.icon, reward };
    }

    _giveReward(player) {
        switch (this.role) {
            case 'supplier':
                player.heal(20);
                player.grenades.frag = Math.min(5, player.grenades.frag + 2);
                return { text: '+20 HP, +2 Grenades', type: 'success' };
            case 'trader':
                return { text: 'Open Trade Menu', action: 'trade', type: 'info' };
            case 'mechanic':
                return { text: 'Weapon upgraded! +Damage', action: 'upgrade', type: 'gold' };
            case 'medic':
                player.heal(player.maxHealth * 0.3);
                player.maxHealth = Math.min(150, player.maxHealth + 10);
                return { text: '+30% HP Restored, Max HP +10', type: 'success' };
            case 'rescue':
                EventBus.emit(EVENTS.OBJECTIVE_DONE, { id: 'rescue_pilot' });
                return { text: 'Pilot rescued! Mission updated!', type: 'gold' };
            default:
                return { text: 'Thanks for talking.', type: 'info' };
        }
    }

    update(dt) {
        if (this.mesh) this.mesh.position.copy(this.position);
        // Gentle idle bob
        if (this.mesh) {
            this.mesh.position.y += Math.sin(Date.now() * 0.002) * 0.002;
        }
    }
}
