/* ====================================================
   WARZONE EXODUS — WEAPON SYSTEM
   All 20+ weapons with stats, attachments, ballistics
   ==================================================== */

const WeaponSystem = (() => {
    // ==================== WEAPON DEFINITIONS ====================
    const WEAPONS = {
        // --- ASSAULT RIFLES ---
        AK47: {
            name: 'AK-47', icon: '🔫', category: 'assault',
            damage: 32, headMult: 2.5, bodyMult: 1.0, limbMult: 0.7,
            fireRate: 600, // RPM
            bulletSpeed: 450, bulletDrop: 0.3,
            reloadTime: 2.5, magSize: 30, reserveAmmo: 120,
            spread: 0.025, recoilX: 0.3, recoilY: 0.6,
            penetration: 0.5, range: 80,
            modes: ['auto', 'burst'],
            attachmentSlots: ['scope', 'grip', 'mag', 'suppressor'],
            unlockedAt: 1,
            stats: { damage: 75, accuracy: 60, range: 70, fireRate: 65 }
        },
        M4A1: {
            name: 'M4A1', icon: '🔫', category: 'assault',
            damage: 28, headMult: 2.5, bodyMult: 1.0, limbMult: 0.7,
            fireRate: 750,
            bulletSpeed: 500, bulletDrop: 0.25,
            reloadTime: 2.2, magSize: 30, reserveAmmo: 120,
            spread: 0.018, recoilX: 0.2, recoilY: 0.5,
            penetration: 0.4, range: 85,
            modes: ['auto', 'semi'],
            attachmentSlots: ['scope', 'grip', 'mag', 'suppressor'],
            unlockedAt: 3,
            stats: { damage: 65, accuracy: 75, range: 80, fireRate: 75 }
        },
        SCAR: {
            name: 'SCAR-H', icon: '🔫', category: 'assault',
            damage: 40, headMult: 2.5, bodyMult: 1.0, limbMult: 0.7,
            fireRate: 520,
            bulletSpeed: 480, bulletDrop: 0.2,
            reloadTime: 2.6, magSize: 20, reserveAmmo: 80,
            spread: 0.02, recoilX: 0.25, recoilY: 0.8,
            penetration: 0.7, range: 90,
            modes: ['auto', 'semi'],
            attachmentSlots: ['scope', 'grip', 'mag'],
            unlockedAt: 8,
            stats: { damage: 90, accuracy: 70, range: 85, fireRate: 55 }
        },

        // --- SNIPERS ---
        AWM: {
            name: 'AWM', icon: '🎯', category: 'sniper',
            damage: 120, headMult: 3.0, bodyMult: 1.0, limbMult: 0.8,
            fireRate: 60,
            bulletSpeed: 900, bulletDrop: 0.05,
            reloadTime: 3.5, magSize: 5, reserveAmmo: 25,
            spread: 0.002, recoilX: 0.1, recoilY: 2.0,
            penetration: 1.0, range: 250,
            modes: ['bolt'],
            attachmentSlots: ['scope', 'suppressor'],
            unlockedAt: 12,
            stats: { damage: 100, accuracy: 95, range: 100, fireRate: 10 }
        },
        DRAGUNOV: {
            name: 'Dragunov', icon: '🎯', category: 'sniper',
            damage: 80, headMult: 2.8, bodyMult: 1.0, limbMult: 0.8,
            fireRate: 120,
            bulletSpeed: 800, bulletDrop: 0.08,
            reloadTime: 3.0, magSize: 10, reserveAmmo: 30,
            spread: 0.005, recoilX: 0.15, recoilY: 1.5,
            penetration: 0.9, range: 200,
            modes: ['semi'],
            attachmentSlots: ['scope', 'suppressor'],
            unlockedAt: 10,
            stats: { damage: 85, accuracy: 90, range: 95, fireRate: 20 }
        },

        // --- SHOTGUNS ---
        SPAS12: {
            name: 'SPAS-12', icon: '💥', category: 'shotgun',
            damage: 80, headMult: 1.5, bodyMult: 1.0, limbMult: 0.9,
            fireRate: 80, pellets: 9,
            bulletSpeed: 350, bulletDrop: 0.8,
            reloadTime: 2.0, magSize: 8, reserveAmmo: 32,
            spread: 0.12, recoilX: 0.1, recoilY: 2.5,
            penetration: 0.2, range: 25,
            modes: ['pump'],
            attachmentSlots: ['scope', 'grip'],
            unlockedAt: 4,
            stats: { damage: 95, accuracy: 30, range: 20, fireRate: 30 }
        },
        DOUBLE_BARREL: {
            name: 'Double Barrel', icon: '💥', category: 'shotgun',
            damage: 100, headMult: 1.5, bodyMult: 1.0, limbMult: 0.9,
            fireRate: 40, pellets: 12,
            bulletSpeed: 300, bulletDrop: 1.0,
            reloadTime: 3.0, magSize: 2, reserveAmmo: 20,
            spread: 0.18, recoilX: 0.2, recoilY: 3.5,
            penetration: 0.1, range: 15,
            modes: ['double'],
            attachmentSlots: [],
            unlockedAt: 5,
            stats: { damage: 100, accuracy: 20, range: 10, fireRate: 15 }
        },

        // --- SMGs ---
        UZI: {
            name: 'UZI', icon: '🔫', category: 'smg',
            damage: 22, headMult: 2.0, bodyMult: 1.0, limbMult: 0.8,
            fireRate: 950,
            bulletSpeed: 400, bulletDrop: 0.4,
            reloadTime: 1.8, magSize: 32, reserveAmmo: 160,
            spread: 0.03, recoilX: 0.25, recoilY: 0.35,
            penetration: 0.2, range: 45,
            modes: ['auto'],
            attachmentSlots: ['scope', 'suppressor', 'mag'],
            unlockedAt: 2,
            stats: { damage: 50, accuracy: 55, range: 40, fireRate: 90 }
        },
        MP5: {
            name: 'MP5', icon: '🔫', category: 'smg',
            damage: 25, headMult: 2.2, bodyMult: 1.0, limbMult: 0.8,
            fireRate: 800,
            bulletSpeed: 420, bulletDrop: 0.35,
            reloadTime: 2.0, magSize: 30, reserveAmmo: 120,
            spread: 0.022, recoilX: 0.2, recoilY: 0.3,
            penetration: 0.3, range: 50,
            modes: ['auto', 'burst'],
            attachmentSlots: ['scope', 'suppressor', 'grip', 'mag'],
            unlockedAt: 4,
            stats: { damage: 55, accuracy: 65, range: 45, fireRate: 85 }
        },

        // --- LMGs ---
        M249: {
            name: 'M249 SAW', icon: '🔫', category: 'lmg',
            damage: 30, headMult: 2.3, bodyMult: 1.0, limbMult: 0.8,
            fireRate: 700,
            bulletSpeed: 460, bulletDrop: 0.3,
            reloadTime: 5.0, magSize: 100, reserveAmmo: 200,
            spread: 0.04, recoilX: 0.35, recoilY: 0.5,
            penetration: 0.6, range: 100,
            modes: ['auto'],
            attachmentSlots: ['scope', 'grip'],
            unlockedAt: 15,
            stats: { damage: 70, accuracy: 50, range: 85, fireRate: 70 }
        },

        // --- SPECIALS ---
        RPG: {
            name: 'RPG-7', icon: '💣', category: 'special',
            damage: 200, splashDamage: 80, splashRadius: 8,
            fireRate: 30,
            bulletSpeed: 120, bulletDrop: 0.5,
            reloadTime: 4.5, magSize: 1, reserveAmmo: 5,
            spread: 0.01, recoilX: 0, recoilY: 4.0,
            penetration: 1.0, range: 150,
            modes: ['single'],
            attachmentSlots: [],
            unlockedAt: 18,
            isExplosive: true,
            stats: { damage: 100, accuracy: 60, range: 70, fireRate: 5 }
        },
        FLAMETHROWER: {
            name: 'Flamethrower', icon: '🔥', category: 'special',
            damage: 15, // per tick, sets on fire
            fireRate: 600, isFire: true,
            bulletSpeed: 30, bulletDrop: 2.0,
            reloadTime: 3.0, magSize: 200, reserveAmmo: 400,
            spread: 0.15, recoilX: 0, recoilY: 0.1,
            penetration: 0, range: 15,
            modes: ['continuous'],
            attachmentSlots: [],
            unlockedAt: 20,
            stats: { damage: 80, accuracy: 20, range: 10, fireRate: 95 }
        },
        CROSSBOW: {
            name: 'Crossbow', icon: '🏹', category: 'special',
            damage: 90, headMult: 3.0,
            fireRate: 30, isSilent: true,
            bulletSpeed: 200, bulletDrop: 0.6,
            reloadTime: 3.5, magSize: 1, reserveAmmo: 20,
            spread: 0.003, recoilX: 0, recoilY: 0.5,
            penetration: 0.8, range: 60,
            modes: ['single'],
            attachmentSlots: ['scope'],
            unlockedAt: 14,
            stats: { damage: 90, accuracy: 70, range: 55, fireRate: 5 }
        },
        GRENADE_LAUNCHER: {
            name: 'M79 GL', icon: '💣', category: 'special',
            damage: 120, splashDamage: 60, splashRadius: 5,
            fireRate: 60,
            bulletSpeed: 80, bulletDrop: 1.5,
            reloadTime: 3.0, magSize: 6, reserveAmmo: 24,
            spread: 0.02, recoilX: 0, recoilY: 2.0,
            penetration: 1.0, range: 80,
            modes: ['single'],
            attachmentSlots: [],
            unlockedAt: 16,
            isExplosive: true,
            stats: { damage: 95, accuracy: 55, range: 65, fireRate: 10 }
        },

        // --- PISTOLS ---
        PISTOL: {
            name: 'M1911', icon: '🔫', category: 'pistol',
            damage: 35, headMult: 2.5,
            fireRate: 300,
            bulletSpeed: 350, bulletDrop: 0.5,
            reloadTime: 1.5, magSize: 8, reserveAmmo: 48,
            spread: 0.012, recoilX: 0.1, recoilY: 0.8,
            penetration: 0.3, range: 40,
            modes: ['semi'],
            attachmentSlots: ['suppressor', 'scope'],
            unlockedAt: 1,
            stats: { damage: 60, accuracy: 70, range: 35, fireRate: 40 }
        },

        // --- MELEE ---
        KNIFE: {
            name: 'Combat Knife', icon: '🔪', category: 'melee',
            damage: 75, headMult: 4.0, isInstant: true, isSilent: true,
            fireRate: 120, range: 2.5,
            modes: ['melee'],
            attachmentSlots: [],
            unlockedAt: 1,
            stats: { damage: 75, accuracy: 90, range: 5, fireRate: 20 }
        }
    };

    // ==================== ATTACHMENT DEFINITIONS ====================
    const ATTACHMENTS = {
        scope_red: { name: 'Red Dot', slot: 'scope', zoom: 1.5, accuracy: +5, icon: '🔭' },
        scope_4x: { name: '4x Scope', slot: 'scope', zoom: 4.0, accuracy: +15, icon: '🔭' },
        scope_8x: { name: '8x Scope', slot: 'scope', zoom: 8.0, accuracy: +25, icon: '🔭' },
        scope_therm: { name: 'Thermal', slot: 'scope', zoom: 4.0, accuracy: +15, thermal: true, icon: '🌡' },
        suppressor: { name: 'Suppressor', slot: 'suppressor', silenced: true, damage: -5, icon: '🔇' },
        ext_mag: { name: 'Extended Mag', slot: 'mag', magSizeBonus: 10, icon: '🔋' },
        grip_vert: { name: 'Vert Grip', slot: 'grip', recoilY: -0.2, recoilX: -0.1, icon: '🪜' },
        grip_angled: { name: 'Angled Grip', slot: 'grip', spread: -0.005, adsSpeed: +0.2, icon: '📐' }
    };

    // ==================== WEAPON FACTORY ====================
    function createWeapon(weaponId) {
        const def = WEAPONS[weaponId];
        if (!def) {
            console.warn('WeaponSystem: Unknown weapon', weaponId);
            return createWeapon('PISTOL');
        }

        return {
            id: weaponId,
            name: def.name,
            icon: def.icon,
            category: def.category,

            // Ammo
            currentAmmo: def.magSize,
            reserveAmmo: def.reserveAmmo,
            magSize: def.magSize,

            // Stats (can be modified by attachments)
            damage: def.damage,
            headMult: def.headMult || 2.5,
            bodyMult: def.bodyMult || 1.0,
            limbMult: def.limbMult || 0.7,
            fireRate: def.fireRate,
            bulletSpeed: def.bulletSpeed || 500,
            bulletDrop: def.bulletDrop || 0.3,
            reloadTime: def.reloadTime,
            spread: def.spread || 0.02,
            recoilX: def.recoilX || 0.2,
            recoilY: def.recoilY || 0.5,
            penetration: def.penetration || 0.3,
            range: def.range || 80,

            // Flags
            isExplosive: def.isExplosive || false,
            isSilent: def.isSilent || false,
            isFire: def.isFire || false,
            isPellet: !!def.pellets,
            pellets: def.pellets || 1,
            splashDamage: def.splashDamage || 0,
            splashRadius: def.splashRadius || 0,
            isMelee: def.category === 'melee',

            // Mode
            currentMode: def.modes[0],
            modes: def.modes,

            // Timing
            _fireTimer: 0,
            _isReloading: false,
            _reloadTimer: 0,

            // Attachments
            attachments: {},
            attachmentSlots: def.attachmentSlots || [],

            // Durability (0-100)
            durability: 100,

            // Stats reference for UI
            stats: def.stats,

            addAmmo(amount) {
                const space = this.reserveAmmo; // could cap
                const added = Math.min(amount, def.reserveAmmo - this.reserveAmmo);
                this.reserveAmmo += added;
                return added;
            },

            equip(attachment) {
                const def = ATTACHMENTS[attachment];
                if (!def || !this.attachmentSlots.includes(def.slot)) return false;
                this.attachments[def.slot] = attachment;
                this._recompute();
                return true;
            },

            _recompute() {
                // Recalculate stats based on equipped attachments
                const base = WEAPONS[this.id];
                this.damage = base.damage;
                this.spread = base.spread;
                this.recoilX = base.recoilX;
                this.recoilY = base.recoilY;
                this.magSize = base.magSize;

                Object.values(this.attachments).forEach(attKey => {
                    const att = ATTACHMENTS[attKey];
                    if (!att) return;
                    if (att.damage) this.damage += att.damage;
                    if (att.spread) this.spread += att.spread;
                    if (att.recoilY) this.recoilY += att.recoilY;
                    if (att.recoilX) this.recoilX += att.recoilX;
                    if (att.magSizeBonus) this.magSize += att.magSizeBonus;
                    if (att.silenced) this.isSilent = true;
                    if (att.thermal) this.hasThermal = true;
                });
            }
        };
    }

    // ==================== FIRE LOGIC ====================
    function tryFire(weapon, player, enemies, scene, particles, world, dt) {
        weapon._fireTimer -= dt;

        if (weapon._isReloading) {
            weapon._reloadTimer -= dt;
            if (weapon._reloadTimer <= 0) {
                weapon._isReloading = false;
                const ammoNeeded = weapon.magSize - weapon.currentAmmo;
                const ammoTaken = Math.min(ammoNeeded, weapon.reserveAmmo + ammoNeeded);
                weapon.currentAmmo += Math.min(ammoNeeded, weapon.reserveAmmo);
                weapon.reserveAmmo = Math.max(0, weapon.reserveAmmo - ammoNeeded);
                EventBus.emit(EVENTS.WEAPON_RELOADED, weapon);
            }
            return null;
        }

        if (weapon._fireTimer > 0) return null;
        if (weapon.currentAmmo <= 0) {
            // Auto-reload
            startReload(weapon);
            AudioEngine.play('emptyClick');
            return null;
        }

        weapon._fireTimer = 60 / weapon.fireRate;
        weapon.currentAmmo--;

        // Degrade durability slightly
        weapon.durability = Math.max(0, weapon.durability - 0.05);

        // Sound
        if (weapon.isSilent || weapon.attachments.suppressor) {
            AudioEngine.play('suppressed');
        } else if (weapon.category === 'shotgun') {
            AudioEngine.play('shotgun');
        } else if (weapon.category === 'sniper') {
            AudioEngine.play('awm');
        } else if (weapon.id === 'RPG' || weapon.id === 'GRENADE_LAUNCHER') {
            AudioEngine.play('rpg');
        } else if (weapon.id === 'UZI' || weapon.id === 'MP5') {
            AudioEngine.play('smg');
        } else {
            AudioEngine.play(weapon.id.toLowerCase().replace(/_/g, ''), undefined);
            AudioEngine.play('ak47'); // fallback
        }

        // Muzzle flash
        const firingOrigin = player.getFiringOrigin();
        const firingDir = player.getFiringDirection();
        if (particles) {
            particles.createMuzzleFlash(firingOrigin, firingDir);
        }

        EventBus.emit(EVENTS.WEAPON_FIRED, { weapon, ammo: weapon.currentAmmo });
        SaveManager.addStat('bulletsShot');

        // Melee: instant check
        if (weapon.isMelee) {
            return tryMeleeHit(weapon, player, enemies, particles);
        }

        // Shoot pellets (shotgun) or single bullet
        const hits = [];
        const pellets = weapon.isPellet ? weapon.pellets : 1;

        for (let p = 0; p < pellets; p++) {
            const spread = weapon.spread;
            const dir = firingDir.clone().add(new THREE.Vector3(
                Utils.randomInRange(-spread, spread),
                Utils.randomInRange(-spread, spread),
                Utils.randomInRange(-spread, spread)
            )).normalize();

            const hit = castRay(firingOrigin, dir, weapon, player, enemies, world);
            if (hit) hits.push(hit);

            // Bullet tracer
            if (particles && p === 0) {
                const tracerEnd = firingOrigin.clone().addScaledVector(dir, hit ? hit.distance : 200);
                particles.createBulletTracer(firingOrigin.clone().addScaledVector(dir, 0.5), tracerEnd);
            }
        }

        // Handle hits
        for (const hit of hits) {
            processHit(hit, weapon, player, enemies, scene, particles);
        }

        return { hits, weapon };
    }

    function tryMeleeHit(weapon, player, enemies, particles) {
        const maxRange = weapon.range || 2.5;
        const hits = [];

        for (const enemy of enemies) {
            if (!enemy.isAlive) continue;
            const dist = player.position.distanceTo(enemy.position);
            if (dist <= maxRange) {
                const dot = player.getFiringDirection().dot(
                    enemy.position.clone().sub(player.position).normalize()
                );
                if (dot > 0.5) { // In front
                    hits.push({ enemy, distance: dist, isHeadshot: false, position: enemy.getChestPosition() });
                }
            }
        }

        return hits.length > 0 ? { hits, weapon } : null;
    }

    function castRay(origin, direction, weapon, player, enemies, world) {
        const maxDist = weapon.range + 50;
        let closestHit = null;
        let closestDist = maxDist;

        // Check enemy hits
        for (const enemy of enemies) {
            if (!enemy.isAlive) continue;

            const toEnemy = enemy.position.clone().sub(origin);
            const proj = toEnemy.dot(direction);
            if (proj < 0) continue;

            const closest = origin.clone().addScaledVector(direction, proj);
            const dist = closest.distanceTo(enemy.position);

            // Head hitbox
            const toHead = enemy.getHeadPosition().clone().sub(origin);
            const headProj = toHead.dot(direction);
            const headClosest = origin.clone().addScaledVector(direction, headProj);
            const headDist = headClosest.distanceTo(enemy.getHeadPosition());

            const isHeadshot = headDist < 0.32;
            const isBodyHit = dist < 0.42;

            if ((isHeadshot || isBodyHit) && proj < closestDist) {
                closestDist = proj;
                closestHit = {
                    enemy,
                    distance: proj,
                    isHeadshot,
                    position: isHeadshot ? enemy.getHeadPosition() : enemy.getChestPosition(),
                    normal: direction.clone().negate()
                };
            }
        }

        return closestHit;
    }

    function processHit(hit, weapon, player, enemies, scene, particles) {
        if (!hit || !hit.enemy) return;

        const enemy = hit.enemy;

        // Calculate damage
        let dmg = weapon.damage;
        if (hit.isHeadshot) {
            dmg *= weapon.headMult;
            EventBus.emit(EVENTS.HEADSHOT, { enemy, damage: dmg });
            EventBus.emit(EVENTS.SHOW_XP_POPUP, { amount: C.XP_PER_HEADSHOT, label: 'HEADSHOT!', position: hit.position });
        }

        // Range falloff
        const rangeFactor = Math.max(0.4, 1 - (hit.distance / weapon.range) * 0.5);
        dmg *= rangeFactor;

        // Apply damage
        const actualDmg = enemy.takeDamage(Math.round(dmg), 'player');

        // Blood particles
        if (particles) {
            particles.createBloodSplatter(hit.position, player.getFiringDirection());
        }

        // Bullet hole on terrain/buildings (not on enemies)
        if (particles && !hit.enemy.isAlive) {
            particles.addBulletHole(hit.position, hit.normal || new THREE.Vector3(0, 1, 0));
        }

        // Stat tracking
        SaveManager.addStat('bulletsHit');
        SaveManager.addStat('damageDealt', Math.round(actualDmg));

        // Kill tracking
        if (!enemy.isAlive) {
            player.onKill();
            const xpGained = enemy.xpValue + (hit.isHeadshot ? C.XP_PER_HEADSHOT : 0);
            SaveManager.addXP(xpGained);
            EventBus.emit(EVENTS.SHOW_XP_POPUP, { amount: xpGained, position: hit.position.clone() });
            EventBus.emit(EVENTS.SHOW_KILL_FEED, { killer: 'You', victim: enemy.typeName, weapon: weapon.name, headshot: hit.isHeadshot });
        }
    }

    function startReload(weapon) {
        if (weapon._isReloading) return;
        if (weapon.reserveAmmo <= 0) {
            EventBus.emit(EVENTS.SHOW_NOTIFICATION, { text: '⚠ No ammo!', type: 'warning' });
            return;
        }
        weapon._isReloading = true;
        weapon._reloadTimer = weapon.reloadTime;
        AudioEngine.play('reload');
        EventBus.emit(EVENTS.WEAPON_RELOADED, { weapon, reloading: true });
    }

    function getZoomFactor(weapon) {
        const scopeAtt = weapon.attachments.scope;
        if (!scopeAtt) return 1.5;
        const att = ATTACHMENTS[scopeAtt];
        return att ? att.zoom : 1.5;
    }

    return {
        WEAPONS,
        ATTACHMENTS,
        createWeapon,
        tryFire,
        startReload,
        getZoomFactor,

        getWeaponList() {
            return Object.entries(WEAPONS).map(([id, def]) => ({
                id, ...def
            }));
        },

        getWeaponsByCategory(category) {
            return this.getWeaponList().filter(w => w.category === category);
        },

        isUnlockedForPlayer(weaponId) {
            return SaveManager.isUnlocked('weapons', weaponId);
        },

        // All weapons unlocked for a mission loadout
        getStarterLoadout() {
            return {
                primary: createWeapon('AK47'),
                secondary: createWeapon('PISTOL'),
                melee: createWeapon('KNIFE')
            };
        }
    };
})();
