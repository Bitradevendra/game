/* ====================================================
   WARZONE EXODUS — PROJECTILE SYSTEM
   Physics-based projectiles with bullet drop
   ==================================================== */

class ProjectileManager {
    constructor(scene, particles) {
        this.scene = scene;
        this.particles = particles;
        this.projectiles = [];
        this.grenades = [];
        this.decoys = [];
    }

    spawnProjectile(origin, direction, weapon, isPlayer = true) {
        if (!weapon) return;

        const proj = {
            position: origin.clone(),
            velocity: direction.clone().multiplyScalar(weapon.bulletSpeed || 500),
            damage: weapon.damage,
            damage2: weapon.splashDamage,
            splashRadius: weapon.splashRadius || 0,
            isExplosive: weapon.isExplosive || false,
            isFire: weapon.isFire || false,
            isPlayer,
            weaponName: weapon.name,
            alive: true,
            travelDist: 0,
            maxDist: (weapon.range || 100) + 100,
            penetration: weapon.penetration || 0.3,
            drop: weapon.bulletDrop || 0.3,
            mesh: null
        };

        // Only create a visible mesh for slower projectiles (RPG, crossbow)
        if (weapon.bulletSpeed < 200 || weapon.isExplosive) {
            proj.mesh = this._createProjectileMesh(weapon);
            proj.mesh.position.copy(origin);
            this.scene.add(proj.mesh);
        }

        this.projectiles.push(proj);
        return proj;
    }

    _createProjectileMesh(weapon) {
        let geo, mat;

        if (weapon.isExplosive) {
            // Rocket / grenade projectile
            geo = new THREE.CylinderGeometry(0.05, 0.1, 0.5, 6);
            mat = new THREE.MeshBasicMaterial({ color: 0x888866 });
        } else {
            // Arrow / crossbow bolt
            geo = new THREE.BoxGeometry(0.03, 0.03, 0.5);
            mat = new THREE.MeshBasicMaterial({ color: 0x663300 });
        }

        return new THREE.Mesh(geo, mat);
    }

    spawnGrenade(config) {
        const geo = new THREE.SphereGeometry(0.12, 6, 6);
        const colors = { frag: 0x445533, smoke: 0x665544, flash: 0xcccc88, molotov: 0x884422 };
        const mat = new THREE.MeshLambertMaterial({ color: colors[config.type] || 0x445533 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(config.position);
        this.scene.add(mesh);

        const grenade = {
            ...config,
            mesh,
            alive: true,
            bounces: 0,
            exploded: false
        };

        this.grenades.push(grenade);
        return grenade;
    }

    update(dt, enemies, player, world) {
        this._updateProjectiles(dt, enemies, player, world);
        this._updateGrenades(dt, enemies, player, world);
        this._updateDecoys(dt, enemies);
    }

    _updateProjectiles(dt, enemies, player, world) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];
            if (!proj.alive) { this.projectiles.splice(i, 1); continue; }

            // Bullet drop
            proj.velocity.y -= proj.drop * dt * 9.8;

            // Move
            const step = proj.velocity.clone().multiplyScalar(dt);
            proj.position.add(step);
            proj.travelDist += step.length();

            if (proj.mesh) {
                proj.mesh.position.copy(proj.position);
                proj.mesh.lookAt(proj.position.clone().add(proj.velocity));
            }

            // Max range
            if (proj.travelDist >= proj.maxDist) {
                this._killProjectile(proj, i);
                continue;
            }

            // Terrain collision
            const terrainH = world ? world.getTerrainHeight(proj.position.x, proj.position.z) : 0;
            if (proj.position.y < terrainH) {
                if (proj.isExplosive) {
                    this._explode(proj.position, proj);
                } else if (this.particles) {
                    this.particles.createDebrisCloud(proj.position.clone(), 0.3);
                }
                this._killProjectile(proj, i);
                continue;
            }

            // Enemy/player collision
            const targets = proj.isPlayer ? enemies : (player ? [player] : []);
            let hit = false;

            for (const target of targets) {
                if (!target || !target.isAlive) continue;
                const dist = this._checkSphereHit(proj.position, target.position, 0.6);
                if (dist !== null) {
                    if (proj.isExplosive) {
                        this._explode(proj.position, proj, enemies, player);
                    } else {
                        let dmg = proj.damage;
                        const isHead = this._checkHeadHit(proj.position, target);
                        if (isHead) dmg *= C.HEADSHOT_MULTIPLIER;
                        target.takeDamage(dmg, proj.isPlayer ? 'player' : 'enemy', isHead);
                        if (this.particles) {
                            this.particles.createBloodSplatter(proj.position.clone(), proj.velocity.clone().normalize());
                        }
                    }
                    this._killProjectile(proj, i);
                    hit = true;
                    break;
                }
            }

            if (hit) continue;
        }
    }

    _checkSphereHit(position, targetPos, radius) {
        const dist = position.distanceTo(targetPos);
        return dist < radius ? dist : null;
    }

    _checkHeadHit(position, target) {
        if (!target.getHeadPosition) return false;
        return position.distanceTo(target.getHeadPosition()) < 0.35;
    }

    _explode(position, proj, enemies = [], player = null) {
        if (this.particles) {
            this.particles.createExplosion(position, 1.5, 0xff6600);
            this.particles.createDebrisCloud(position, 1.5);
        }

        AudioEngine.play('explosion', 1.5);
        EventBus.emit(EVENTS.EXPLOSION, { position: position.clone(), size: 1.5 });

        const radius = proj.splashRadius || 8;
        const maxDmg = proj.damage || 150;
        const splashDmg = proj.damage2 || 80;

        // Damage nearby enemies
        if (enemies) {
            for (const enemy of enemies) {
                if (!enemy.isAlive) continue;
                const dist = position.distanceTo(enemy.position);
                if (dist < radius) {
                    const falloff = 1 - (dist / radius);
                    enemy.takeDamage(Math.round(splashDmg * falloff));
                }
            }
        }

        // Damage player
        if (player && player.isAlive) {
            const dist = position.distanceTo(player.position);
            if (dist < radius) {
                const falloff = 1 - (dist / radius);
                player.takeDamage(Math.round(splashDmg * falloff * 0.5));
            }
        }

        // Camera shake
        EventBus.emit('camera_shake', { intensity: 0.8, duration: 0.5 });
    }

    _killProjectile(proj, index) {
        proj.alive = false;
        if (proj.mesh && proj.mesh.parent) {
            this.scene.remove(proj.mesh);
            proj.mesh = null;
        }
    }

    _updateGrenades(dt, enemies, player, world) {
        for (let i = this.grenades.length - 1; i >= 0; i--) {
            const g = this.grenades[i];
            if (!g.alive) {
                if (g.mesh && g.mesh.parent) this.scene.remove(g.mesh);
                this.grenades.splice(i, 1);
                continue;
            }

            // Physics
            g.velocity.y += C.GRAVITY * dt;
            g.position.addScaledVector(g.velocity, dt);

            // Ground bounce
            const terrainH = world ? world.getTerrainHeight(g.position.x, g.position.z) : 0;
            if (g.position.y < terrainH + 0.1) {
                g.position.y = terrainH + 0.1;
                g.velocity.y *= -0.4;
                g.velocity.x *= 0.7;
                g.velocity.z *= 0.7;
                g.bounces++;
                if (g.bounces > 0) AudioEngine.play('grenadeBounce');
            }

            if (g.mesh) g.mesh.position.copy(g.position);

            // Countdown
            g.timer -= dt;

            // Cooking animation (grenade glows)
            if (g.mesh && g.timer < 1.0) {
                const flash = Math.sin(Date.now() * 0.02) > 0;
                g.mesh.material.color.setHex(flash ? 0xff2200 : 0x445533);
            }

            if (g.timer <= 0 && !g.exploded) {
                g.exploded = true;
                g.alive = false;
                this._detonateGrenade(g, enemies, player);
            }
        }
    }

    _detonateGrenade(g, enemies, player) {
        if (g.mesh && g.mesh.parent) this.scene.remove(g.mesh);

        switch (g.type) {
            case 'frag':
                this._explode(g.position, { damage: 80, damage2: 120, splashRadius: 7 }, enemies, player);
                break;

            case 'smoke':
                if (this.particles) {
                    for (let i = 0; i < 20; i++) {
                        this.particles.createFireEffect(g.position.clone(), 2.0);
                    }
                }
                EventBus.emit(EVENTS.SHOW_NOTIFICATION, { text: '💨 Smoke screen!', type: 'info' });
                // Enemies lose sight in smoke
                enemies.forEach(e => {
                    if (e.isAlive && e.position.distanceTo(g.position) < 8) {
                        e.alertLevel = 0;
                    }
                });
                break;

            case 'flash':
                // Stun nearby enemies
                enemies.forEach(e => {
                    if (e.isAlive) {
                        const dist = e.position.distanceTo(g.position);
                        if (dist < 12) {
                            e.stun(3 + (1 - dist / 12) * 4);
                            EventBus.emit(EVENTS.SHOW_NOTIFICATION, { text: `⚡ ${e.typeName} STUNNED!`, type: 'success' });
                        }
                    }
                });
                // Flash player if close
                if (player && player.position.distanceTo(g.position) < 8) {
                    EventBus.emit('player_flashed', { duration: 2 });
                }
                AudioEngine.play('explosion', 0.5);
                EventBus.emit('camera_shake', { intensity: 0.4, duration: 0.3 });
                break;

            case 'molotov':
                // Lingering fire
                if (this.particles) {
                    for (let i = 0; i < 8; i++) {
                        this.particles.createFireEffect(
                            g.position.clone().add(new THREE.Vector3(
                                Utils.randomInRange(-2, 2), 0, Utils.randomInRange(-2, 2)
                            )),
                            1.5
                        );
                    }
                }
                enemies.forEach(e => {
                    if (e.isAlive && e.position.distanceTo(g.position) < 4) {
                        e.ignite(8);
                    }
                });
                if (player && player.position.distanceTo(g.position) < 3) {
                    EventBus.emit('player_on_fire', { duration: 5 });
                }
                break;
        }

        SaveManager.addStat('grenadeKills', 1);
    }

    spawnDecoy(position) {
        const mat = new THREE.MeshBasicMaterial({ color: 0x0088ff, transparent: true, opacity: 0.5 });
        const geo = new THREE.CylinderGeometry(0.32, 0.32, 1.6, 8);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(position);
        this.scene.add(mesh);

        const decoy = {
            position: position.clone(),
            mesh,
            timer: 10,
            alive: true,
            attractRadius: 20
        };

        this.decoys.push(decoy);
        // Make noises to attract enemies
        EventBus.emit(EVENTS.PLAYER_SPRINTING, { position }); // triggers AI to investigate
    }

    _updateDecoys(dt, enemies) {
        for (let i = this.decoys.length - 1; i >= 0; i--) {
            const d = this.decoys[i];
            d.timer -= dt;

            if (d.timer <= 0) {
                if (d.mesh && d.mesh.parent) this.scene.remove(d.mesh);
                this.decoys.splice(i, 1);
                continue;
            }

            // Attract enemies
            enemies.forEach(e => {
                if (e.isAlive && e.position.distanceTo(d.position) < d.attractRadius) {
                    if (e.state === 'patrol') {
                        e.state = 'alert';
                        e.lastKnownPlayerPos = d.position.clone();
                    }
                }
            });

            // Flicker
            if (d.mesh) d.mesh.material.opacity = 0.3 + Math.sin(Date.now() * 0.01) * 0.2;
        }
    }

    clear() {
        this.projectiles.forEach(p => { if (p.mesh && p.mesh.parent) this.scene.remove(p.mesh); });
        this.grenades.forEach(g => { if (g.mesh && g.mesh.parent) this.scene.remove(g.mesh); });
        this.decoys.forEach(d => { if (d.mesh && d.mesh.parent) this.scene.remove(d.mesh); });
        this.projectiles = [];
        this.grenades = [];
        this.decoys = [];
    }
}
