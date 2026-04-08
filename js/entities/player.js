/* ====================================================
   WARZONE EXODUS — PLAYER ENTITY
   Player controller, movement, physics, interactions
   ==================================================== */

class Player {
    constructor(scene, camera, world) {
        this.scene = scene;
        this.camera = camera;
        this.world = world;

        // Transform
        this.position = new THREE.Vector3(0, 2, 0);
        this.velocity = new THREE.Vector3();
        this.yaw = 0;
        this.pitch = 0;

        // Stats
        this.health = C.PLAYER_MAX_HEALTH;
        this.maxHealth = C.PLAYER_MAX_HEALTH;
        this.armor = 0;
        this.maxArmor = C.PLAYER_MAX_ARMOR;
        this.stamina = C.PLAYER_MAX_STAMINA;

        // State
        this.isGrounded = false;
        this.isCrouching = false;
        this.isSprinting = false;
        this.isADS = false; // Aiming Down Sights
        this.isAlive = true;
        this.isDead = false;
        this.isInVehicle = false;
        this.currentVehicle = null;
        this.isClimbing = false;
        this.isInvisible = false;

        // Movement
        this.moveInput = { forward: false, back: false, left: false, right: false };
        this.jumpRequested = false;
        this.sprintHeld = false;

        // Combat
        this.weapons = [];
        this.activeWeaponSlot = 0;
        this.grenades = { frag: 2, smoke: 1, flash: 1, molotov: 0 };
        this.activeGrenadeType = 'frag';
        this.ability = 'FOCUS';
        this.abilityCharge = 0; // 0-1
        this.abilityCooldown = 0;
        this.abilityActive = false;
        this.abilityTimer = 0;

        // Status effects
        this.effects = {};
        this.regenTimer = 0;
        this.healthRegenDelay = 8; // seconds after last damage before regen starts
        this.lastDamageTime = 0;
        this.damageFlashTimer = 0;

        // Streak
        this.killStreak = 0;
        this.killStreakTimer = 0;

        // Footstep
        this.footstepTimer = 0;
        this.footstepInterval = 0.5;

        // Night vision
        this.nightVisionActive = false;

        // Physics
        this.gravity = C.GRAVITY;
        this.jumpForce = C.PLAYER_JUMP_FORCE;
        this.height = C.PLAYER_HEIGHT;
        this.crouchHeight = 1.0;
        this.currentHeight = this.height;

        // Visual mesh (third person shadow / body)
        this._createMesh();

        // Subscribe to events
        EventBus.on(EVENTS.LOOT_PICKED_UP, this._onLootPickedUp.bind(this));
    }

    _createMesh() {
        // Player model (simple capsule-like shape)
        const group = new THREE.Group();

        const bodyGeo = new THREE.CylinderGeometry(0.35, 0.35, 1.4, 8);
        const bodyMat = new THREE.MeshLambertMaterial({ color: 0x225533 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.7;
        body.castShadow = true;
        group.add(body);

        const headGeo = new THREE.SphereGeometry(0.25, 8, 8);
        const headMat = new THREE.MeshLambertMaterial({ color: 0x886655 });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 1.6;
        head.castShadow = true;
        group.add(head);

        this.mesh = group;
        this.mesh.name = 'player';
        this.scene.add(this.mesh);
    }

    get activeWeapon() {
        return this.weapons[this.activeWeaponSlot] || null;
    }

    setPosition(x, y, z) {
        this.position.set(x, y, z);
        this._syncMesh();
    }

    _syncMesh() {
        if (this.mesh) {
            this.mesh.position.copy(this.position);
            this.mesh.rotation.y = this.yaw;
        }
    }

    // ==================== UPDATE ====================
    update(dt, inputManager) {
        if (!this.isAlive) return;
        if (this.isInVehicle && this.currentVehicle) {
            this._updateInVehicle(dt, inputManager);
            return;
        }

        this._updateMovement(dt, inputManager);
        this._updatePhysics(dt);
        this._updateAbility(dt);
        this._updateStatus(dt);
        this._updateCamera();
        this._updateFootsteps(dt);
        this._syncMesh();

        // Kill streak timeout
        this.killStreakTimer -= dt;
        if (this.killStreakTimer <= 0) this.killStreak = 0;

        // Ability charge regeneration
        if (!this.abilityActive && this.abilityCharge < 1) {
            this.abilityCharge = Math.min(1, this.abilityCharge + dt / 30);
        }
    }

    _updateMovement(dt, inputManager) {
        const data = inputManager.getState();
        this.isSprinting = data.sprint && (data.forward || (data.moveY && data.moveY < -0.3)) && !this.isCrouching && this.stamina > 5;
        this.isCrouching = data.crouch;
        this.isADS = data.ads;

        // Speed calculation
        let speed = C.PLAYER_SPEED;
        if (this.isSprinting) speed *= C.PLAYER_SPRINT_MULT;
        if (this.isCrouching) speed *= C.PLAYER_CROUCH_MULT;
        if (this.isADS) speed *= 0.7;
        if (this.effects.slowed) speed *= 0.5;
        if (this.effects.adrenaline) speed *= 1.4;

        // Stamina
        if (this.isSprinting) {
            this.stamina = Math.max(0, this.stamina - dt * 15);
            if (this.stamina === 0) this.isSprinting = false;
        } else {
            this.stamina = Math.min(C.PLAYER_MAX_STAMINA, this.stamina + dt * 10);
        }

        // Direction from yaw
        const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
        const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

        const moveDir = new THREE.Vector3();

        // Check for analog joystick values (touch controls)
        if (data.moveX !== undefined && data.moveY !== undefined &&
            (Math.abs(data.moveX) > 0.01 || Math.abs(data.moveY) > 0.01)) {
            // Analog: moveX is left(-1)/right(+1), moveY is up(-1)/down(+1)
            moveDir.addScaledVector(right, data.moveX);
            moveDir.addScaledVector(forward, -data.moveY); // negative because joystick Y up = -1
        } else {
            // Digital keyboard input
            if (data.forward) moveDir.add(forward);
            if (data.back) moveDir.sub(forward);
            if (data.right) moveDir.add(right);
            if (data.left) moveDir.sub(right);
        }

        if (moveDir.length() > 0.01) {
            const magnitude = Math.min(moveDir.length(), 1.0); // 0..1 from joystick
            moveDir.normalize();
            this.velocity.x += moveDir.x * speed * magnitude * dt * 10;
            this.velocity.z += moveDir.z * speed * magnitude * dt * 10;
        }

        // Apply friction
        this.velocity.x *= this.isGrounded ? 0.78 : 0.95;
        this.velocity.z *= this.isGrounded ? 0.78 : 0.95;

        // Limit max speed
        const hSpeed = Math.sqrt(this.velocity.x ** 2 + this.velocity.z ** 2);
        if (hSpeed > speed) {
            const factor = speed / hSpeed;
            this.velocity.x *= factor;
            this.velocity.z *= factor;
        }

        // Jump
        if (data.jump && this.isGrounded) {
            this.velocity.y = this.jumpForce;
            this.isGrounded = false;
            AudioEngine.play('jump');
            EventBus.emit(EVENTS.PLAYER_JUMPED);
        }

        // Camera look (mouse or touch)
        const mouseD = inputManager.getMouseDelta();
        const isMobile = inputManager.isMobile;
        if (isMobile) {
            // Touch: delta already scaled by LOOK_SENS in touch controls
            this.yaw -= mouseD.x * 0.01;
            this.pitch -= mouseD.y * 0.01;
        } else {
            const sensitivity = (SaveManager.get('settings.mouseSensitivity') || 5) * C.MOUSE_SENSITIVITY_BASE;
            this.yaw -= mouseD.x * sensitivity;
            this.pitch -= mouseD.y * sensitivity;
        }
        this.pitch = Utils.clamp(this.pitch, -Math.PI * 0.45, Math.PI * 0.45);

        // Crouch height transition
        const targetHeight = this.isCrouching ? this.crouchHeight : this.height;
        this.currentHeight = Utils.lerp(this.currentHeight, targetHeight, dt * 10);
    }

    _updatePhysics(dt) {
        // Gravity
        if (!this.isGrounded) {
            this.velocity.y += this.gravity * dt;
        }

        // Move
        this.position.addScaledVector(this.velocity, dt);

        // Terrain collision
        const terrainH = this.world ? this.world.getTerrainHeight(this.position.x, this.position.z) : 0;
        const groundLevel = terrainH + 0.01;

        if (this.position.y < groundLevel + this.currentHeight * 0.01) {
            if (this.velocity.y < -5) {
                const fallDamage = Math.max(0, (-this.velocity.y - 8) * 8);
                if (fallDamage > 0) {
                    const reduced = this.effects.fallResist ? fallDamage * 0.5 : fallDamage;
                    this.takeDamage(reduced, null, 'fall');
                }
            }
            this.position.y = groundLevel;
            this.velocity.y = 0;
            this.isGrounded = true;
        } else {
            this.isGrounded = false;
        }

        // World bounds
        const boundary = C.WORLD_SIZE / 2 - 10;
        this.position.x = Utils.clamp(this.position.x, -boundary, boundary);
        this.position.z = Utils.clamp(this.position.z, -boundary, boundary);

        // Building collision
        if (this.world) {
            const col = this.world.checkCollision(this.position.x, this.position.z, 0.5);
            if (col) {
                // Push out
                const cx = col.x + col.width / 2;
                const cz = col.z + col.depth / 2;
                const dx = this.position.x - cx;
                const dz = this.position.z - cz;
                const nx = Math.abs(dx) / (col.width / 2);
                const nz = Math.abs(dz) / (col.depth / 2);
                if (nx > nz) {
                    this.position.x = cx + Math.sign(dx) * (col.width / 2 + 0.6);
                    this.velocity.x = 0;
                } else {
                    this.position.z = cz + Math.sign(dz) * (col.depth / 2 + 0.6);
                    this.velocity.z = 0;
                }
            }
        }
    }

    _updateCamera() {
        // Third-person perspective: camera behind and above player
        const camDist = this.isADS ? 1.5 : 3.5;
        const camHeight = this.currentHeight + (this.isADS ? 0.3 : 0.5);

        // Camera position: behind player
        const camOffset = new THREE.Vector3(
            -Math.sin(this.yaw) * camDist * 0.3,
            camHeight,
            -Math.cos(this.yaw) * camDist
        );

        const targetCamPos = this.position.clone().add(camOffset);

        // Smoothly move camera
        this.camera.position.lerp(targetCamPos, 0.15);

        // Look at player's head level
        const lookAt = this.position.clone().add(new THREE.Vector3(0, this.currentHeight * 0.8, 0));
        // Modify look target based on pitch
        const pitchOffset = new THREE.Vector3(
            Math.sin(this.yaw) * Math.sin(this.pitch) * 10,
            -Math.cos(this.pitch) * 5,
            Math.cos(this.yaw) * Math.sin(this.pitch) * 10
        );
        lookAt.add(pitchOffset);

        this.camera.lookAt(lookAt);
    }

    _updateAbility(dt) {
        this.abilityCooldown = Math.max(0, this.abilityCooldown - dt);

        if (this.abilityActive) {
            this.abilityTimer -= dt;
            if (this.abilityTimer <= 0) {
                this._endAbility();
            }
        }

        // Focus mode: slow motion
        if (this.effects.focusMode) {
            // handled globally by game
        }

        // Invisibility
        if (this.effects.invisible) {
            if (this.mesh) this.mesh.visible = false;
        } else {
            if (this.mesh) this.mesh.visible = true;
        }
    }

    _updateStatus(dt) {
        const now = Date.now() / 1000;

        // Health regeneration
        if (now - this.lastDamageTime > this.healthRegenDelay && this.health < this.maxHealth) {
            const regenRate = this.effects.fastRegen ? 3 : 1;
            this.health = Math.min(this.maxHealth, this.health + regenRate * dt);
            EventBus.emit(EVENTS.PLAYER_HEALED, this.health);
        }

        // Effect timers
        const effectKeys = Object.keys(this.effects);
        for (const key of effectKeys) {
            if (this.effects[key].timer !== undefined) {
                this.effects[key].timer -= dt;
                if (this.effects[key].timer <= 0) {
                    delete this.effects[key];
                }
            }
        }

        // Damage flash
        this.damageFlashTimer = Math.max(0, this.damageFlashTimer - dt);

        // Low health heartbeat
        if (this.health < 25) {
            AudioEngine.startHeartbeat();
        } else {
            AudioEngine.stopHeartbeat();
        }
    }

    _updateFootsteps(dt) {
        if (!this.isGrounded) return;
        const hSpeed = Math.sqrt(this.velocity.x ** 2 + this.velocity.z ** 2);
        if (hSpeed < 0.5) return;

        const interval = this.isSprinting ? 0.3 : this.isCrouching ? 0.7 : 0.5;
        this.footstepTimer -= dt;
        if (this.footstepTimer <= 0) {
            this.footstepTimer = interval;
            if (!this.effects.silentStep) {
                AudioEngine.play('footstep', 'ground');
            }
        }
    }

    _updateInVehicle(dt, inputManager) {
        // Delegate movement to vehicle
        if (this.currentVehicle) {
            this.currentVehicle.driveInput(inputManager.getState(), dt);
            this.position.copy(this.currentVehicle.position);
            this.position.y += 1.5;
        }
        this._updateCamera();
    }

    // ==================== COMBAT ====================
    takeDamage(amount, attacker, source = 'bullet') {
        if (!this.isAlive || this.effects.invincible) return;

        let damage = amount;

        // Armor absorption
        if (this.armor > 0) {
            const absorbed = Math.min(this.armor, damage * 0.6);
            this.armor -= absorbed;
            damage -= absorbed;
        }

        this.health -= damage;
        this.lastDamageTime = Date.now() / 1000;
        this.damageFlashTimer = C.DAMAGE_FLASH_DURATION / 1000;

        EventBus.emit(EVENTS.PLAYER_DAMAGED, { damage, source, attacker, health: this.health });
        AudioEngine.play('bulletHit', 'flesh');

        // Update stats
        SaveManager.addStat('damageTaken', Math.round(damage));

        if (this.health <= 0) {
            this.health = 0;
            this._die(attacker);
        }
    }

    heal(amount, source = 'medkit') {
        if (!this.isAlive) return false;
        const prevHealth = this.health;
        this.health = Math.min(this.maxHealth, this.health + amount);
        const healed = this.health - prevHealth;

        if (healed > 0) {
            EventBus.emit(EVENTS.PLAYER_HEALED, { amount: healed, source, health: this.health });
        }
        return healed;
    }

    addArmor(amount) {
        this.armor = Math.min(this.maxArmor, this.armor + amount);
        EventBus.emit(EVENTS.INVENTORY_ARMOR_CHANGED, this.armor);
    }

    _die(killer) {
        this.isAlive = false;
        this.isDead = true;
        AudioEngine.stopHeartbeat();
        EventBus.emit(EVENTS.PLAYER_DIED, { killer, position: this.position.clone() });

        // Drop weapon
        if (this.mesh) {
            this.mesh.rotation.x = Math.PI / 2;
        }
    }

    useAbility() {
        if (this.abilityCooldown > 0 || this.abilityActive) return false;

        const abilConf = C.ABILITIES[this.ability];
        if (!abilConf) return false;

        this.abilityActive = true;
        this.abilityTimer = abilConf.duration;
        this.abilityCooldown = abilConf.cooldown;
        this.abilityCharge = 0;

        switch (this.ability) {
            case 'FOCUS':
                this.effects.focusMode = { timer: abilConf.duration };
                EventBus.emit(EVENTS.ABILITY_USED, { name: 'Focus Mode', icon: '🎯' });
                break;
            case 'CLOAK':
                this.effects.invisible = { timer: abilConf.duration };
                EventBus.emit(EVENTS.ABILITY_USED, { name: 'Invisibility', icon: '👻' });
                break;
            case 'ADRENALINE':
                this.effects.adrenaline = { timer: abilConf.duration };
                EventBus.emit(EVENTS.ABILITY_USED, { name: 'Adrenaline Rush', icon: '⚡' });
                break;
            case 'AIRSTRIKE':
                EventBus.emit(EVENTS.ABILITY_USED, { name: 'Air Strike', icon: '💣' });
                EventBus.emit('airstrike_beacon', { position: this.position.clone() });
                this.abilityActive = false;
                break;
            case 'DRONE':
                EventBus.emit(EVENTS.ABILITY_USED, { name: 'Scout Drone', icon: '🚁' });
                EventBus.emit('drone_deploy', { position: this.position.clone() });
                break;
            case 'DECOY':
                EventBus.emit(EVENTS.ABILITY_USED, { name: 'Decoy Hologram', icon: '🔮' });
                EventBus.emit('decoy_deploy', { position: this.position.clone() });
                break;
        }

        AudioEngine.play('uiClick');
        return true;
    }

    _endAbility() {
        this.abilityActive = false;
        const key = this.ability.toLowerCase();
        delete this.effects.focusMode;
        delete this.effects.invisible;
        delete this.effects.adrenaline;
    }

    // ==================== GRENADE ====================
    throwGrenade(scene, particles) {
        const type = this.activeGrenadeType;
        if (this.grenades[type] <= 0) {
            EventBus.emit(EVENTS.SHOW_NOTIFICATION, { text: `No ${type} grenades!`, type: 'warning' });
            return null;
        }

        this.grenades[type]--;
        AudioEngine.play('grenadeBounce');
        EventBus.emit(EVENTS.GRENADE_THROWN, { type, grenades: this.grenades });

        // Create physics grenade
        return {
            type,
            position: this.position.clone().add(new THREE.Vector3(0, 1.5, 0)),
            velocity: new THREE.Vector3(
                -Math.sin(this.yaw) * 15,
                8,
                -Math.cos(this.yaw) * 15
            ),
            timer: type === 'frag' ? 3.0 : 2.0,
            bounces: 0
        };
    }

    // ==================== LOOT ====================
    _onLootPickedUp(item) {
        if (!item) return;

        switch (item.category) {
            case 'health':
                const healed = this.heal(item.amount || 50);
                if (healed) EventBus.emit(EVENTS.SHOW_NOTIFICATION, { text: `+${Math.round(healed)} HP`, type: 'success' });
                break;
            case 'armor':
                this.addArmor(item.amount || 30);
                EventBus.emit(EVENTS.SHOW_NOTIFICATION, { text: `+${item.amount || 30} Armor`, type: 'info' });
                break;
            case 'ammo':
                if (this.activeWeapon) {
                    const added = this.activeWeapon.addAmmo(item.amount || 30);
                    EventBus.emit(EVENTS.SHOW_NOTIFICATION, { text: `Ammo +${added}`, type: 'info' });
                }
                break;
            case 'grenade':
                this.grenades[item.subtype] = (this.grenades[item.subtype] || 0) + item.amount;
                break;
        }
    }

    // ==================== WEAPON SWITCHING ====================
    switchWeapon(slot) {
        if (slot === this.activeWeaponSlot) return;
        if (!this.weapons[slot]) return;

        this.activeWeaponSlot = slot;
        EventBus.emit(EVENTS.WEAPON_SWITCHED, { slot, weapon: this.weapons[slot] });
        AudioEngine.play('uiClick');
    }

    addWeapon(weaponName) {
        if (this.weapons.length >= 5) {
            // Replace active slot
            this.weapons[this.activeWeaponSlot] = WeaponSystem.createWeapon(weaponName);
        } else {
            this.weapons.push(WeaponSystem.createWeapon(weaponName));
        }
    }

    // ==================== PROPERTIES ====================
    getHealthPercent() { return this.health / this.maxHealth; }
    getArmorPercent() { return this.armor / this.maxArmor; }
    getStaminaPercent() { return this.stamina / C.PLAYER_MAX_STAMINA; }

    enterVehicle(vehicle) {
        this.isInVehicle = true;
        this.currentVehicle = vehicle;
        if (this.mesh) this.mesh.visible = false;
        EventBus.emit(EVENTS.VEHICLE_ENTERED, vehicle);
    }

    exitVehicle() {
        this.isInVehicle = false;
        this.position.copy(this.currentVehicle.position).add(new THREE.Vector3(2, 1, 0));
        this.currentVehicle = null;
        if (this.mesh) this.mesh.visible = true;
        EventBus.emit(EVENTS.VEHICLE_EXITED);
    }

    getFiringOrigin() {
        return this.position.clone().add(new THREE.Vector3(0, this.currentHeight * 0.8, 0));
    }

    getFiringDirection() {
        return new THREE.Vector3(
            -Math.sin(this.yaw) * Math.cos(this.pitch),
            Math.sin(this.pitch),
            -Math.cos(this.yaw) * Math.cos(this.pitch)
        ).normalize();
    }

    applySkills(skills) {
        if (skills.maxHealth) this.maxHealth = C.PLAYER_MAX_HEALTH + skills.maxHealth * 20;
        if (skills.fastRegen) this.effects.fastRegen = true;
        if (skills.fallResist) this.effects.fallResist = true;
        if (skills.silentStep) this.effects.silentStep = true;
    }

    reset() {
        this.health = this.maxHealth;
        this.armor = 0;
        this.stamina = C.PLAYER_MAX_STAMINA;
        this.isAlive = true;
        this.isDead = false;
        this.velocity.set(0, 0, 0);
        this.effects = {};
        this.killStreak = 0;
    }

    onKill() {
        this.killStreak++;
        this.killStreakTimer = 8;

        // Streak rewards
        if (this.killStreak === 5) {
            EventBus.emit(EVENTS.SHOW_NOTIFICATION, { text: '🔥 KILLING SPREE! x5', type: 'gold' });
            this.abilityCharge = Math.min(1, this.abilityCharge + 0.3);
        } else if (this.killStreak === 10) {
            EventBus.emit(EVENTS.SHOW_NOTIFICATION, { text: '💀 UNSTOPPABLE! x10', type: 'gold' });
            this.abilityCharge = 1;
        } else if (this.killStreak === 20) {
            EventBus.emit(EVENTS.SHOW_NOTIFICATION, { text: '⚡ GODLIKE! x20 - Full Heal!', type: 'gold' });
            this.heal(50);
            this.abilityCharge = 1;
        }

        // Track best streak
        const current = this.killStreak;
        const best = SaveManager.get('player.highestKillStreak') || 0;
        if (current > best) SaveManager.set('player.highestKillStreak', current);
    }
}
