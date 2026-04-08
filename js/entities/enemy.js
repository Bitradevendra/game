/* ====================================================
   WARZONE EXODUS — ENEMY ENTITY
   Enemy base class with health, mesh, death, drops
   ==================================================== */

class Enemy {
    static nextId = 1;

    constructor(scene, particles, typeKey = 'GRUNT') {
        this.id = Enemy.nextId++;
        this.scene = scene;
        this.particles = particles;

        // Type config
        const typeData = C.ENEMY_TYPES[typeKey] || C.ENEMY_TYPES.GRUNT;
        this.typeKey = typeKey;
        this.typeName = typeData.name;
        this.maxHealth = typeData.health;
        this.health = this.maxHealth;
        this.damage = typeData.damage;
        this.speed = typeData.speed;
        this.xpValue = typeData.xp;
        this.armor = typeData.armor;

        // Position
        this.position = new THREE.Vector3();
        this.velocity = new THREE.Vector3();
        this.yaw = 0;

        // State machine
        this.state = 'patrol'; // patrol | alert | chase | attack | cover | retreat | dead
        this.isAlive = true;
        this.isDead = false;
        this.isStunned = false;

        // AI
        this.targetPosition = new THREE.Vector3();
        this.patrolPoints = [];
        this.patrolIndex = 0;
        this.patrolTimer = 0;
        this.alertLevel = 0; // 0-1
        this.lastKnownPlayerPos = null;
        this.coverPoint = null;
        this.attackTimer = 0;
        this.attackCooldown = 1.0 / typeData.speed * 2;
        this.currentTarget = null;
        this.squadId = null;

        // Weapon
        this.weaponType = this._pickWeaponForType(typeKey);
        this.ammo = 30;
        this.isReloading = false;
        this.reloadTimer = 0;

        // Status
        this.stunTimer = 0;
        this.fireTimer = 0; // on fire from molotov
        this.flashTimer = 0; // blinded
        this.lastDamageSource = null;
        this.grenadeTimer = Utils.randomInRange(8, 20);
        this.retreatHealth = this.maxHealth * 0.25;
        this.hasRetreated = false;

        // Speech (text bubble)
        this.speechTimer = 0;
        this.speechCooldown = Utils.randomInRange(5, 15);

        // Visual
        this._createMesh();
        this._createHealthBar();

        // Loot table
        this.lootTable = this._buildLootTable();
    }

    _pickWeaponForType(type) {
        const typeWeapons = {
            GRUNT: Utils.randomElement(['AK47', 'M4A1', 'PISTOL']),
            SHOTGUNNER: Utils.randomElement(['SPAS12', 'DOUBLE_BARREL']),
            SNIPER: Utils.randomElement(['AWM', 'DRAGUNOV']),
            ELITE: Utils.randomElement(['M4A1', 'SCAR', 'MP5']),
            HEAVY: Utils.randomElement(['M249', 'AK47']),
            SCOUT: Utils.randomElement(['MP5', 'UZI', 'PISTOL']),
            ROCKETEER: 'RPG',
            FLAMER: 'FLAMETHROWER'
        };
        return typeWeapons[type] || 'AK47';
    }

    _createMesh() {
        const group = new THREE.Group();

        // Color by type
        const bodyColors = {
            GRUNT: 0x556644, SHOTGUNNER: 0x664433,
            SNIPER: 0x334455, ELITE: 0x222244,
            HEAVY: 0x443322, SCOUT: 0x445533,
            ROCKETEER: 0x554422, FLAMER: 0x552211
        };
        const color = bodyColors[this.typeKey] || 0x556633;

        // Body
        const bodyGeo = new THREE.CylinderGeometry(0.32, 0.32, 1.3, 8);
        const bodyMat = new THREE.MeshLambertMaterial({ color });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.65;
        body.castShadow = true;
        group.add(body);

        // Head
        const headGeo = new THREE.SphereGeometry(0.22, 8, 8);
        const headMat = new THREE.MeshLambertMaterial({ color: 0x886655 });
        this.headMesh = new THREE.Mesh(headGeo, headMat);
        this.headMesh.position.y = 1.5;
        this.headMesh.castShadow = true;
        group.add(this.headMesh);

        // Weapon indicator
        const weaponColors = {
            SNIPER: 0x224488, SHOTGUNNER: 0x884422, HEAVY: 0x222222,
            ELITE: 0x442288, ROCKETEER: 0x882222, FLAMER: 0xaa2200
        };
        const wColor = weaponColors[this.typeKey] || 0x555555;
        const wGeo = new THREE.BoxGeometry(0.1, 0.1, 0.7);
        const weapon = new THREE.Mesh(wGeo, new THREE.MeshLambertMaterial({ color: wColor }));
        weapon.position.set(0.4, 0.9, 0.4);
        weapon.rotation.y = -Math.PI / 6;
        group.add(weapon);

        // Type badge (elite colors)
        if (this.typeKey === 'ELITE' || this.typeKey === 'HEAVY') {
            const badgeGeo = new THREE.PlaneGeometry(0.4, 0.2);
            const badge = new THREE.Mesh(badgeGeo, new THREE.MeshBasicMaterial({ color: 0xffdd00 }));
            badge.position.set(0, 1.7, 0.23);
            group.add(badge);
        }

        this.mesh = group;
        this.mesh.name = `enemy_${this.id}`;
        this.scene.add(this.mesh);
    }

    _createHealthBar() {
        // Floating health bar (CSS3D-like using a plane)
        const bgGeo = new THREE.PlaneGeometry(0.8, 0.08);
        const bgMat = new THREE.MeshBasicMaterial({ color: 0x440000 });
        this.healthBarBg = new THREE.Mesh(bgGeo, bgMat);

        const fillGeo = new THREE.PlaneGeometry(0.8, 0.08);
        const fillMat = new THREE.MeshBasicMaterial({ color: 0x00ff44 });
        this.healthBarFill = new THREE.Mesh(fillGeo, fillMat);
        this.healthBarFill.scale.x = 1;

        const barGroup = new THREE.Group();
        barGroup.add(this.healthBarBg);
        barGroup.add(this.healthBarFill);
        barGroup.position.y = 2.2;

        this.mesh.add(barGroup);
        this.healthBarGroup = barGroup;
    }

    _updateHealthBar(camera) {
        if (!this.healthBarGroup) return;
        // Make health bar always face camera
        this.healthBarGroup.quaternion.copy(camera.quaternion);
        // Update fill
        const pct = this.health / this.maxHealth;
        this.healthBarFill.scale.x = Math.max(0.001, pct);
        this.healthBarFill.position.x = -(1 - pct) * 0.4;

        // Color by health
        if (pct < 0.33) {
            this.healthBarFill.material.color.setHex(0xff2222);
        } else if (pct < 0.66) {
            this.healthBarFill.material.color.setHex(0xffaa00);
        } else {
            this.healthBarFill.material.color.setHex(0x00ff44);
        }
    }

    _buildLootTable() {
        const base = [
            { item: 'ammo', weight: 40 },
            { item: 'medkit_small', weight: 20 },
            { item: null, weight: 40 }
        ];

        if (this.typeKey === 'ELITE' || this.typeKey === 'HEAVY') {
            base.push({ item: 'armor_shard', weight: 30 });
            base.push({ item: 'medkit_large', weight: 15 });
        }

        return base;
    }

    _dropLoot(lootSystem) {
        if (!lootSystem) return;

        // Roll for loot
        const roll = Math.random() * 100;
        let total = 0;
        for (const entry of this.lootTable) {
            total += entry.weight;
            if (roll < total && entry.item) {
                lootSystem.spawnLoot(entry.item, this.position.clone().add(new THREE.Vector3(0, 0.5, 0)));
                break;
            }
        }

        // Always drop some ammo
        lootSystem.spawnLoot('ammo', this.position.clone().add(new THREE.Vector3(
            Utils.randomInRange(-0.5, 0.5), 0.5, Utils.randomInRange(-0.5, 0.5)
        )));
    }

    setPosition(x, y, z) {
        this.position.set(x, y, z);
        if (this.mesh) this.mesh.position.copy(this.position);
    }

    takeDamage(amount, source = 'bullet', isHeadshot = false) {
        if (!this.isAlive) return 0;

        let damage = amount;

        // Armor mitigation
        if (this.armor > 0) {
            const block = Math.min(this.armor, damage * 0.5);
            this.armor -= block;
            damage -= block;
        }

        if (isHeadshot) damage *= C.HEADSHOT_MULTIPLIER;

        this.health -= damage;
        this.lastDamageSource = source;

        // Hit reaction flash
        if (this.mesh) {
            const mat = this.mesh.children[0]?.material;
            if (mat) {
                const origColor = mat.color.getHex();
                mat.color.setHex(0xff4444);
                setTimeout(() => { if (mat) mat.color.setHex(origColor); }, 150);
            }
        }

        // Blood particles
        if (this.particles) {
            this.particles.createBloodSplatter(
                this.position.clone().add(new THREE.Vector3(0, 1.2, 0)),
                new THREE.Vector3(
                    Utils.randomInRange(-1, 1),
                    Utils.randomInRange(0, 1),
                    Utils.randomInRange(-1, 1)
                )
            );
        }

        // Alert squad
        if (this.squadId) {
            EventBus.emit(EVENTS.ENEMY_ALERTED, { squadId: this.squadId, position: this.position.clone() });
        }

        if (this.health <= 0) {
            this.health = 0;
            this._die();
        }

        return damage;
    }

    _die(lootSystem) {
        if (!this.isAlive) return;
        this.isAlive = false;
        this.isDead = true;
        this.state = 'dead';

        // Death animation: fall over
        if (this.mesh) {
            this.mesh.rotation.x = Math.PI / 2;
            this.mesh.position.y = Math.max(0, this.mesh.position.y - 0.5);

            // Hide health bar
            if (this.healthBarGroup) this.healthBarGroup.visible = false;
        }

        // Death particles
        if (this.particles) {
            this.particles.createBloodSplatter(
                this.position.clone().add(new THREE.Vector3(0, 1, 0)),
                new THREE.Vector3(0, 1, 0)
            );
        }

        EventBus.emit(EVENTS.ENEMY_KILLED, { enemy: this });

        // Drop loot (caller will provide lootSystem)
        setTimeout(() => {
            // Remove mesh after a while
            if (this.mesh && this.mesh.parent) {
                setTimeout(() => {
                    if (this.scene && this.mesh) this.scene.remove(this.mesh);
                }, 8000);
            }
        }, 100);
    }

    update(dt, player, world, camera) {
        if (!this.isAlive) return;

        // Update stun, flash, fire statuses
        if (this.stunTimer > 0) {
            this.stunTimer -= dt;
            return; // Stunned: skip AI
        }

        if (this.flashTimer > 0) {
            this.flashTimer -= dt;
            // Confused movement while blinded
            this.position.x += Utils.randomInRange(-2, 2) * dt;
            this.position.z += Utils.randomInRange(-2, 2) * dt;
        }

        if (this.fireTimer > 0) {
            this.fireTimer -= dt;
            this.health -= 5 * dt; // damage over time
            if (this.particles && Math.random() < 0.3) {
                this.particles.createFireEffect(this.position.clone(), 0.3);
            }
            if (this.health <= 0) this._die();
        }

        // Sync mesh position
        if (this.mesh) {
            this.mesh.position.copy(this.position);
            this.mesh.rotation.y = this.yaw;
        }

        // Update health bar orientation
        if (camera) this._updateHealthBar(camera);

        // Reload timer
        if (this.isReloading) {
            this.reloadTimer -= dt;
            if (this.reloadTimer <= 0) {
                this.isReloading = false;
                this.ammo = 30;
            }
            return;
        }

        // Attack cooldown
        this.attackTimer = Math.max(0, this.attackTimer - dt);

        // Grenade timer
        this.grenadeTimer -= dt;

        // Speech
        this.speechTimer -= dt;
    }

    getHeadPosition() {
        return this.position.clone().add(new THREE.Vector3(0, 1.6, 0));
    }

    getChestPosition() {
        return this.position.clone().add(new THREE.Vector3(0, 1.0, 0));
    }

    getFiringDirection(target) {
        return target.clone().sub(this.getChestPosition()).normalize();
    }

    canSeePlayer(player, world, weather, isDaytime) {
        const sightRange = isDaytime ? C.ENEMY_SIGHT_RANGE : C.ENEMY_SIGHT_RANGE_NIGHT;
        const visModifier = weather ? weather.getVisibility() : 1.0;
        const adjustedRange = sightRange * visModifier;

        const dist = this.position.distanceTo(player.position);
        if (dist > adjustedRange) return false;

        // Line of sight check (simplified - raycasting handled by EnemyAI)
        return true;
    }

    shouldRetreat() {
        return this.health < this.retreatHealth && !this.hasRetreated;
    }

    startReload() {
        if (this.isReloading) return;
        this.isReloading = true;
        this.reloadTimer = 2.5;
        this.ammo = 0;
    }

    // Stun (from flashbang)
    stun(duration) {
        this.stunTimer = duration;
        this.state = 'stunned';
    }

    // Set on fire (from molotov)
    ignite(duration) {
        this.fireTimer = duration;
    }

    // Blind (from flashbang)
    flash(duration) {
        this.flashTimer = duration;
    }

    getSpeechLine() {
        const lines = {
            patrol: ['...', 'Clear.', 'Nothing here.'],
            alert: ['Contact!', 'I see him!', 'THERE!', 'He\'s there!'],
            chase: ['Get him!', 'Flank right!', 'Don\'t let him escape!'],
            attack: ['You\'re dead!', 'Fire!', 'Suppressing!'],
            retreat: ['I need help!', 'Man down!', 'Falling back!'],
            cover: ['Taking cover!', 'Reloading!', 'Covering position!']
        };
        const stateLines = lines[this.state] || lines.patrol;
        return Utils.randomElement(stateLines);
    }
}
