/* ====================================================
   WARZONE EXODUS — ENEMY AI
   State machine AI with cover, flanking, grenades, squad behavior
   ==================================================== */

class EnemyAI {
    constructor(enemy, world) {
        this.enemy = enemy;
        this.world = world;
        this.frameCount = 0;
        this.updateRate = C.AI_UPDATE_RATE;

        // Pathfinding state
        this.currentPath = [];
        this.pathIndex = 0;
        this.stuckTimer = 0;
        this.lastPosition = new THREE.Vector3();

        // Cover positions
        this.knownCoverPoints = [];
        this.targetCoverPoint = null;

        // Speech bubble timer
        this.speechEntityTimer = 0;
    }

    update(dt, player, enemies, world) {
        if (!this.enemy.isAlive || this.enemy.state === 'dead') return;

        this.frameCount++;
        if (this.frameCount % this.updateRate !== 0) {
            // Still move toward target even if not recalculating AI
            this._applyMovement(dt);
            return;
        }

        // State machine
        switch (this.enemy.state) {
            case 'patrol': this._patrol(dt, player, world); break;
            case 'alert': this._alert(dt, player, world); break;
            case 'chase': this._chase(dt, player, world); break;
            case 'attack': this._attack(dt, player, enemies); break;
            case 'cover': this._takeCover(dt, player); break;
            case 'retreat': this._retreat(dt, world); break;
            case 'search': this._search(dt); break;
            case 'stunned': break; // handled in enemy.update
        }

        this._updateStuck(dt);
        this._updateSpeech(dt, player);
        this._applyMovement(dt);
    }

    // ==================== PATROL ====================
    _patrol(dt, player, world) {
        // Check if player is visible
        if (this._canSeePlayer(player)) {
            this.enemy.state = this.enemy.typeKey === 'SNIPER' ? 'attack' : 'chase';
            this.enemy.alertLevel = 1.0;
            this.enemy.lastKnownPlayerPos = player.position.clone();
            EventBus.emit(EVENTS.ENEMY_SPOTTED, { enemy: this.enemy, position: player.position });
            return;
        }

        // Check if heard player
        if (this._canHearPlayer(player)) {
            this.enemy.state = 'alert';
            this.enemy.alertLevel = 0.5;
            this.enemy.lastKnownPlayerPos = player.position.clone();
            return;
        }

        // Walk patrol route
        if (this.enemy.patrolPoints.length === 0) {
            this._generatePatrolRoute();
        }

        const target = this.enemy.patrolPoints[this.enemy.patrolIndex];
        if (!target) return;

        this._moveToward(target, this.enemy.speed * 0.4, dt);

        const dist = Utils.distance2D(this.enemy.position.x, this.enemy.position.z, target.x, target.z);
        if (dist < 2) {
            this.enemy.patrolIndex = (this.enemy.patrolIndex + 1) % this.enemy.patrolPoints.length;
            // Stop and look around occasionally
            this.enemy.patrolTimer = Utils.randomInRange(1, 3);
        }
    }

    _generatePatrolRoute() {
        const center = this.enemy.position.clone();
        const radius = Utils.randomInRange(15, 35);
        const count = Utils.randomInt(3, 6);

        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            this.enemy.patrolPoints.push({
                x: center.x + Math.cos(angle) * radius,
                z: center.z + Math.sin(angle) * radius
            });
        }
    }

    // ==================== ALERT ====================
    _alert(dt, player, world) {
        this.enemy.alertLevel += dt * 0.5;

        if (this.enemy.alertLevel >= 1.0 || this._canSeePlayer(player)) {
            this.enemy.state = 'chase';
            this.enemy.lastKnownPlayerPos = player.position.clone();
            return;
        }

        // Move toward last known position cautiously
        if (this.enemy.lastKnownPlayerPos) {
            this._moveToward(this.enemy.lastKnownPlayerPos, this.enemy.speed * 0.6, dt);
            const dist = this.enemy.position.distanceTo(this.enemy.lastKnownPlayerPos);
            if (dist < 3) {
                this.enemy.state = 'search';
            }
        }
    }

    // ==================== CHASE ====================
    _chase(dt, player, world) {
        if (!this._canSeePlayer(player)) {
            this.enemy.state = 'search';
            return;
        }

        this.enemy.lastKnownPlayerPos = player.position.clone();
        const dist = this.enemy.position.distanceTo(player.position);

        // Attack range based on weapon type
        const attackRange = this._getAttackRange();

        if (dist <= attackRange) {
            // Can attack
            if (this._hasCover() && this.enemy.health < this.enemy.maxHealth * 0.7) {
                this.enemy.state = 'cover';
            } else {
                this.enemy.state = 'attack';
            }
        } else {
            // Flank or direct chase
            if (Math.random() < 0.3 && dist > 20) {
                // Try to flank
                this._setFlankTarget(player);
            } else {
                this._moveToward(player.position, this.enemy.speed, dt);
            }
        }
    }

    _getAttackRange() {
        const ranges = {
            GRUNT: 30, SHOTGUNNER: 10, SNIPER: 100,
            ELITE: 40, HEAVY: 20, SCOUT: 25,
            ROCKETEER: 60, FLAMER: 12
        };
        return (ranges[this.enemy.typeKey] || 30);
    }

    _hasCover() {
        if (!this.world) return false;
        const collidables = this.world.getCollidables();
        for (const col of collidables) {
            if (!col.cover) continue;
            const cx = col.x + col.width / 2;
            const cz = col.z + col.depth / 2;
            const dist = Utils.distance2D(this.enemy.position.x, this.enemy.position.z, cx, cz);
            if (dist < 15) return true;
        }
        return false;
    }

    _setFlankTarget(player) {
        // Go to a position perpendicular to player direction
        const toPlayer = player.position.clone().sub(this.enemy.position).normalize();
        const perp = new THREE.Vector3(-toPlayer.z, 0, toPlayer.x);
        const flankDir = Math.random() > 0.5 ? perp : perp.negate();
        const flankPos = player.position.clone().add(flankDir.multiplyScalar(Utils.randomInRange(10, 20)));
        this.enemy.targetPosition = flankPos;
    }

    // ==================== ATTACK ====================
    _attack(dt, player, enemies) {
        if (!this._canSeePlayer(player)) {
            this.enemy.state = 'search';
            return;
        }

        // Face player
        const toPlayer = player.position.clone().sub(this.enemy.position);
        this.enemy.yaw = Math.atan2(toPlayer.x, toPlayer.z);

        // Shoot
        if (this.enemy.attackTimer <= 0 && !this.enemy.isReloading && this.enemy.ammo > 0) {
            this._shoot(player);
            this.enemy.attackTimer = this.enemy.attackCooldown + Utils.randomInRange(0, 0.5);
        }

        // Reload if empty
        if (this.enemy.ammo <= 0) {
            this.enemy.startReload();
        }

        // Throw grenade occasionally
        if (this.enemy.grenadeTimer <= 0 && Math.random() < 0.3) {
            this._throwGrenade(player);
            this.enemy.grenadeTimer = Utils.randomInRange(8, 20);
        }

        // Strafe while attacking
        const strafeDir = Math.random() - 0.5;
        const right = new THREE.Vector3(-Math.cos(this.enemy.yaw), 0, Math.sin(this.enemy.yaw));
        this.enemy.position.addScaledVector(right, strafeDir * this.enemy.speed * 0.3 * dt);

        // Retreat if low health
        if (this.enemy.shouldRetreat()) {
            this.enemy.hasRetreated = true;
            this.enemy.state = 'retreat';
        }
    }

    _shoot(player) {
        this.enemy.ammo--;

        // Accuracy based on distance and state
        const dist = this.enemy.position.distanceTo(player.position);
        let accuracy = 0.7 - (dist / 100) * 0.3; // Worse at range

        // Type bonuses
        if (this.enemy.typeKey === 'SNIPER') accuracy = 0.92;
        if (this.enemy.typeKey === 'ELITE') accuracy = 0.80;
        if (this.enemy.typeKey === 'SCOUT') accuracy = 0.75;

        // Difficulty bonus from game state
        const diffMult = 1 + (this.enemy.xpValue / 500) * 0.2;
        accuracy *= diffMult;

        // Hit check
        if (Math.random() < accuracy) {
            const bulletDmg = this.enemy.damage + Utils.randomInRange(-5, 5);
            player.takeDamage(bulletDmg, this.enemy);

            // Direction indicator for player
            const angle = Math.atan2(
                this.enemy.position.x - player.position.x,
                this.enemy.position.z - player.position.z
            );
            EventBus.emit('player_shot_from', { angle });
        }

        // Muzzle particles
        // (handled by main game)
        EventBus.emit(EVENTS.ENEMY_DAMAGED, { enemy: this.enemy });
    }

    _throwGrenade(player) {
        const dist = this.enemy.position.distanceTo(player.position);
        if (dist > 25 || dist < 5) return; // Too far or too close

        EventBus.emit('enemy_throw_grenade', {
            position: this.enemy.position.clone().add(new THREE.Vector3(0, 1, 0)),
            target: player.position.clone(),
            type: Math.random() < 0.7 ? 'frag' : 'smoke'
        });

        const speech = Utils.randomElement(['Grenade!', 'Take cover!', 'Fire in the hole!']);
        this._speak(speech);
    }

    // ==================== COVER ====================
    _takeCover(dt, player) {
        if (!this.targetCoverPoint) {
            this.targetCoverPoint = this._findCoverPosition(player);
        }

        if (!this.targetCoverPoint) {
            this.enemy.state = 'attack';
            return;
        }

        const dist = Utils.distance2D(
            this.enemy.position.x, this.enemy.position.z,
            this.targetCoverPoint.x, this.targetCoverPoint.z
        );

        if (dist > 1.5) {
            // Moving to cover
            this._moveToward(this.targetCoverPoint, this.enemy.speed * 1.2, dt);
        } else {
            // In cover: pop out to shoot occasionally
            if (this.enemy.attackTimer <= 0 && this._canSeePlayer(player)) {
                this._shoot(player);
                this.enemy.attackTimer = this.enemy.attackCooldown * 1.8;
                // Then duck back (handled by staying in cover)
            }

            // Heal while in cover
            this.enemy.health = Math.min(this.enemy.maxHealth, this.enemy.health + 5 * dt);

            // Leave cover after healing enough
            if (this.enemy.health > this.enemy.maxHealth * 0.6) {
                this.enemy.state = 'attack';
                this.targetCoverPoint = null;
            }
        }
    }

    _findCoverPosition(player) {
        if (!this.world) return null;

        const collidables = this.world.getCollidables();
        let bestPos = null;
        let bestScore = -Infinity;

        for (const col of collidables) {
            if (!col.cover && col.type !== 'building' && col.type !== 'bunker') continue;

            // Check multiple points around the cover
            const cx = col.x + col.width / 2;
            const cz = col.z + col.depth / 2;

            const testPoints = [
                { x: col.x - 1, z: cz }, { x: col.x + col.width + 1, z: cz },
                { x: cx, z: col.z - 1 }, { x: cx, z: col.z + col.depth + 1 }
            ];

            for (const pt of testPoints) {
                const distToEnemy = Utils.distance2D(this.enemy.position.x, this.enemy.position.z, pt.x, pt.z);
                const distToPlayer = Utils.distance2D(player.position.x, player.position.z, pt.x, pt.z);

                // Good cover: close to enemy, puts object between enemy and player
                const score = -distToEnemy + distToPlayer * 0.5;
                if (score > bestScore && distToEnemy < 20) {
                    bestScore = score;
                    bestPos = pt;
                }
            }
        }

        return bestPos;
    }

    // ==================== RETREAT ====================
    _retreat(dt, world) {
        // Run away from player toward rally point or spawn
        const awayFromPlayer = this.enemy.lastKnownPlayerPos ?
            this.enemy.position.clone().sub(this.enemy.lastKnownPlayerPos).normalize() :
            new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();

        const retreatTarget = {
            x: this.enemy.position.x + awayFromPlayer.x * 30,
            z: this.enemy.position.z + awayFromPlayer.z * 30
        };

        this._moveToward(retreatTarget, this.enemy.speed * 1.3, dt);

        // Call for help
        EventBus.emit(EVENTS.ENEMY_ALERTED, {
            squadId: this.enemy.squadId,
            position: this.enemy.position.clone(),
            retreat: true
        });

        this._speak(Utils.randomElement(['Man down!', 'I need backup!', 'Falling back!']));

        // After retreating a bit, hide and recover
        this.enemy.health += 2 * dt;
        if (this.enemy.health > this.enemy.maxHealth * 0.5) {
            this.enemy.state = 'cover';
            this.enemy.hasRetreated = false;
        }
    }

    // ==================== SEARCH ====================
    _search(dt) {
        if (!this.enemy.lastKnownPlayerPos) {
            this.enemy.state = 'patrol';
            return;
        }

        this._moveToward(this.enemy.lastKnownPlayerPos, this.enemy.speed * 0.7, dt);

        const dist = this.enemy.position.distanceTo(this.enemy.lastKnownPlayerPos);
        if (dist < 3) {
            // Reached last known position, lost player
            this.enemy.state = 'patrol';
            this.enemy.lastKnownPlayerPos = null;
            this.enemy.alertLevel = 0.3;
        }
    }

    // ==================== MOVEMENT ====================
    _moveToward(target, speed, dt) {
        const dx = target.x - this.enemy.position.x;
        const dz = target.z - this.enemy.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist < 0.5) return;

        this.enemy.yaw = Math.atan2(dx, dz);
        this.enemy.velocity.x = (dx / dist) * speed;
        this.enemy.velocity.z = (dz / dist) * speed;
    }

    _applyMovement(dt) {
        if (!this.enemy.velocity) return;

        const newX = this.enemy.position.x + this.enemy.velocity.x * dt;
        const newZ = this.enemy.position.z + this.enemy.velocity.z * dt;

        // World boundary check
        const bound = C.WORLD_SIZE / 2 - 5;

        if (!this.world || !this.world.checkCollision(newX, newZ, 0.4)) {
            this.enemy.position.x = Utils.clamp(newX, -bound, bound);
            this.enemy.position.z = Utils.clamp(newZ, -bound, bound);
        }

        // Ground height
        if (this.world) {
            const terrainH = this.world.getTerrainHeight(this.enemy.position.x, this.enemy.position.z);
            this.enemy.position.y = terrainH;
        }

        // Friction
        this.enemy.velocity.x *= 0.7;
        this.enemy.velocity.z *= 0.7;
    }

    _updateStuck(dt) {
        const moved = this.enemy.position.distanceTo(this.lastPosition);
        if (moved < 0.1) {
            this.stuckTimer += dt;
            if (this.stuckTimer > 2.0) {
                // Unstuck: jitter
                this.enemy.position.x += Utils.randomInRange(-3, 3);
                this.enemy.position.z += Utils.randomInRange(-3, 3);
                this.stuckTimer = 0;
            }
        } else {
            this.stuckTimer = 0;
        }
        this.lastPosition.copy(this.enemy.position);
    }

    // ==================== PERCEPTION ====================
    _canSeePlayer(player) {
        if (!player.isAlive) return false;
        if (player.effects && player.effects.invisible) return false; // Cloaked!

        const dist = this.enemy.position.distanceTo(player.position);
        const isDark = false; // from day/night (passed separately)
        const sightRange = isDark ? C.ENEMY_SIGHT_RANGE_NIGHT : C.ENEMY_SIGHT_RANGE;

        if (dist > sightRange) return false;

        // FOV check (enemies have ~120 degree FOV)
        const toPlayer = player.position.clone().sub(this.enemy.position).normalize();
        const facing = new THREE.Vector3(Math.sin(this.enemy.yaw), 0, Math.cos(this.enemy.yaw));
        const dot = toPlayer.dot(facing);

        if (dot < -0.17) return false; // Behind enemy (> ~100 degrees off)

        // No line-of-sight raycasting for performance (simplified)
        return true;
    }

    _canHearPlayer(player) {
        const dist = this.enemy.position.distanceTo(player.position);
        let hearRange = C.ENEMY_HEAR_RANGE;

        if (player.isSprinting) hearRange *= 1.5;
        if (player.effects && player.effects.silentStep) hearRange *= 0.3;
        if (player.activeWeapon && player.activeWeapon.isSilent) hearRange *= 0.2;

        return dist < hearRange;
    }

    // ==================== SPEECH ====================
    _speak(text) {
        if (this.speechEntityTimer > 0) return;
        this.speechEntityTimer = 4;

        EventBus.emit(EVENTS.SHOW_NOTIFICATION, {
            text: `💬 ${this.enemy.typeName}: "${text}"`,
            type: 'enemy'
        });
    }

    _updateSpeech(dt, player) {
        this.speechEntityTimer = Math.max(0, this.speechEntityTimer - dt);

        // Random speech based on state
        if (this.speechEntityTimer <= 0 && Math.random() < 0.001) {
            this._speak(this.enemy.getSpeechLine());
        }
    }
}
