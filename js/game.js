/* ====================================================
   WARZONE EXODUS — MAIN GAME CLASS
   Robust orchestrator with safe initialisation
   ==================================================== */

class Game {
    constructor() {
        this.renderer = null;
        this.scene = null;
        this.camera = null;
        this.input = null;
        this.touch = null;
        this.world = null;
        this.particles = null;
        this.dayNight = null;
        this.weather = null;
        this.loot = null;
        this.inventory = null;
        this.quests = null;
        this.achievements = null;
        this.waves = null;
        this.hud = null;
        this.minimap = null;
        this.notifications = null;
        this.squadAI = null;

        this.player = null;
        this.enemies = [];
        this.npcs = [];
        this.enemyAIs = [];
        this.activeGrenades = [];

        this.state = 'menu';
        this.gameMode = 'campaign';
        this.selectedMission = 1;
        this.totalEnemies = 0;
        this.startTime = 0;
        this.gameTime = 0;
        this.lastTimestamp = 0;
        this.kills = 0;
        this.cameraShake = { intensity: 0, timer: 0 };
        this.menuAnimFrame = null;

        window._gameRef = this;
    }

    // ── safe helper: call fn, log error but don't crash ──
    _try(label, fn) {
        try { return fn(); }
        catch (e) { console.warn(`[Game] ${label}:`, e.message); return null; }
    }

    /* ===========================================
       INIT
    =========================================== */
    async init() {
        this._initRenderer();
        this._initScene();
        this._setupMenu();
        this._startMenuAnimation();
        this._setupEventListeners();

        // Brief loading flash
        Utils.show('loading-screen');
        document.getElementById('loading-status').textContent = 'Ready to Deploy…';
        await Utils.sleep(900);
        Utils.hide('loading-screen');

        Utils.show('main-menu');
        Utils.hide('game-container');
        Utils.hide('hud');

        console.log('%c✅ Game initialized!', 'color:#00ff88;font-weight:bold');
    }

    _initRenderer() {
        const canvas = document.getElementById('game-canvas');
        this.renderer = new THREE.WebGLRenderer({
            canvas, antialias: true, powerPreference: 'high-performance'
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.1;

        window.addEventListener('resize', () => {
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            if (this.camera) {
                this.camera.aspect = window.innerWidth / window.innerHeight;
                this.camera.updateProjectionMatrix();
            }
            // update touch layout on orientation change
            if (this.touch && this.touch.isMobile) {
                this.touch.show();
            }
        });
    }

    _initScene() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(
            C.CAMERA_FOV, window.innerWidth / window.innerHeight,
            C.CAMERA_NEAR, C.CAMERA_FAR
        );
        this.camera.position.set(0, 15, 30);
        this.scene.background = new THREE.Color(0x1a2a3a);
        this.scene.fog = new THREE.FogExp2(0x1a2a3a, 0.008);
    }

    _setupMenu() {
        const geo = new THREE.TorusKnotGeometry(3, 1, 100, 16);
        const mat = new THREE.MeshPhongMaterial({ color: 0x00d4ff, wireframe: true });
        this.menuDecor = new THREE.Mesh(geo, mat);
        this.scene.add(this.menuDecor);

        this.scene.add(new THREE.AmbientLight(0x112244, 2));
        const pt = new THREE.PointLight(0x00d4ff, 3, 50);
        pt.position.set(0, 5, 0);
        this.scene.add(pt);

        // Stars
        const pos = new Float32Array(3000);
        for (let i = 0; i < 3000; i++) pos[i] = Utils.randomInRange(-200, 200);
        const sg = new THREE.BufferGeometry();
        sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.2 }));
        this.scene.add(this.stars);
    }

    _startMenuAnimation() {
        const anim = (t) => {
            if (this.state !== 'menu') return;
            this.menuAnimFrame = requestAnimationFrame(anim);
            const sec = t * 0.001;
            if (this.menuDecor) {
                this.menuDecor.rotation.x = sec * 0.3;
                this.menuDecor.rotation.y = sec * 0.5;
            }
            this.camera.position.x = Math.sin(sec * 0.2) * 10;
            this.camera.position.z = 30 + Math.cos(sec * 0.15) * 5;
            this.camera.lookAt(0, 0, 0);
            this.renderer.render(this.scene, this.camera);
        };
        this.menuAnimFrame = requestAnimationFrame(anim);
    }

    _setupEventListeners() {
        document.getElementById('btn-play')?.addEventListener('click', () => this._showMissionSelect());
        document.getElementById('btn-survival')?.addEventListener('click', () => this.startGame('survival'));
        document.getElementById('btn-loadout')?.addEventListener('click', () => this._showLoadout());
        document.getElementById('btn-achievements')?.addEventListener('click', () => Utils.show('achievements-panel'));
        document.getElementById('btn-settings')?.addEventListener('click', () => Utils.toggle('settings-panel'));
        document.getElementById('btn-back-to-menu')?.addEventListener('click', () => {
            Utils.hide('mission-select'); Utils.show('main-menu');
        });
        document.getElementById('btn-resume')?.addEventListener('click', () => this.resume());
        document.getElementById('btn-settings-pause')?.addEventListener('click', () => Utils.toggle('settings-panel'));
        document.getElementById('btn-main-menu')?.addEventListener('click', () => this.returnToMenu());
        document.getElementById('btn-retry')?.addEventListener('click', () => this.startGame(this.gameMode, this.selectedMission));
        document.getElementById('btn-death-menu')?.addEventListener('click', () => this.returnToMenu());
        document.getElementById('btn-next-mission')?.addEventListener('click', () => this.startGame('campaign', this.selectedMission + 1));
        document.getElementById('btn-victory-menu')?.addEventListener('click', () => this.returnToMenu());
        document.getElementById('btn-play-again')?.addEventListener('click', () => this.startGame(this.gameMode, this.selectedMission));
        document.getElementById('mouse-sensitivity')?.addEventListener('input', e =>
            SaveManager.set('settings.mouseSensitivity', parseFloat(e.target.value)));
        document.getElementById('master-volume')?.addEventListener('input', e =>
            this._try('volume', () => AudioEngine.setMasterVolume(parseFloat(e.target.value))));

        EventBus.on(EVENTS.PLAYER_DIED, this._onPlayerDied.bind(this));
        EventBus.on('camera_shake', (d) => { this.cameraShake.intensity = d.intensity; this.cameraShake.timer = d.duration; });
        EventBus.on(EVENTS.EXPLOSION, (d) => { this.cameraShake.intensity = (d.size || 1) * 0.5; this.cameraShake.timer = 0.4; });
        EventBus.on('enemy_throw_grenade', this._onEnemyThrowGrenade.bind(this));
        EventBus.on('between_waves', () => { if (this.player) this.player.heal(20); });
    }

    /* ===========================================
       MENU HELPERS
    =========================================== */
    _showMissionSelect() {
        Utils.hide('main-menu');
        Utils.show('mission-select');
        this._renderMissionList();
    }

    _renderMissionList() {
        const container = document.getElementById('mission-list');
        if (!container) return;
        container.innerHTML = '';
        const missions = [
            { id: 1, name: 'Insertion Point', zone: 'Abandoned City', difficulty: '⭐', desc: 'Infiltrate enemy lines and establish a forward base.' },
            { id: 2, name: 'Forest Hunt', zone: 'Dense Forest', difficulty: '⭐⭐', desc: 'Track and eliminate the enemy platoon hiding in the forest.' },
            { id: 3, name: 'Desert Storm', zone: 'Military Base', difficulty: '⭐⭐⭐', desc: 'Destroy the radar and take control of the base.' },
            { id: 4, name: 'Frozen Hell', zone: 'Frozen Mountains', difficulty: '⭐⭐⭐⭐', desc: 'Survive the frozen wilderness and extract the scientist.' },
            { id: 5, name: 'Inferno', zone: 'Volcanic Zone', difficulty: '⭐⭐⭐⭐⭐', desc: 'Face the final boss in the volcanic ruins. No mercy.' }
        ];
        missions.forEach(m => {
            const completed = SaveManager.get(`missions.${m.id}.completed`);
            const locked = m.id > 1 && !SaveManager.get(`missions.${m.id - 1}.completed`);
            const el = document.createElement('div');
            el.className = `mission-card ${completed ? 'completed' : ''} ${locked ? 'locked' : ''}`;
            el.innerHTML = `
        <div class="mission-card-header">
          <span class="mission-number">MISSION ${m.id}</span>
          <span class="mission-diff">${m.difficulty}</span>
          ${completed ? '<span class="mission-complete-badge">✓ DONE</span>' : ''}
        </div>
        <div class="mission-name">${m.name}</div>
        <div class="mission-zone">📍 ${m.zone}</div>
        <div class="mission-desc">${m.desc}</div>
        ${locked ? '<div class="mission-locked">🔒 Complete previous mission</div>' : ''}
      `;
            if (!locked) el.addEventListener('click', () => { this.selectedMission = m.id; this.startGame('campaign', m.id); });
            container.appendChild(el);
        });
    }

    _showLoadout() {
        Utils.show('loadout-screen');
        if (this.progression) {
            const c = document.getElementById('skill-tree-container');
            this._try('renderSkillTree', () => this.progression.renderSkillTree(c));
        }
    }

    /* ===========================================
       GAME START
    =========================================== */
    async startGame(mode = 'campaign', missionId = 1) {
        this.gameMode = mode;
        this.selectedMission = missionId;
        this.state = 'loading';

        Utils.show('loading-screen');
        Utils.hide('main-menu');
        Utils.hide('mission-select');
        Utils.hide('death-screen');
        Utils.hide('victory-screen');

        if (this.menuAnimFrame) cancelAnimationFrame(this.menuAnimFrame);

        // Clear scene
        while (this.scene.children.length > 0) this.scene.remove(this.scene.children[0]);
        this.enemies = []; this.npcs = []; this.enemyAIs = [];
        this.activeGrenades = []; this.kills = 0;

        const setText = (t) => {
            const el = document.getElementById('loading-status');
            if (el) el.textContent = t;
        };

        setText('Generating world…'); await Utils.sleep(200);
        await this._initSystems(missionId, mode);

        setText('Spawning enemies…'); await Utils.sleep(200);
        await this._spawnEntities(missionId, mode);

        setText('Ready!'); await Utils.sleep(250);
        Utils.hide('loading-screen');

        Utils.show('game-container');
        Utils.show('hud');

        // Touch HUD
        if (this.touch?.isMobile) this.touch.show();

        this.state = 'playing';
        this.startTime = Date.now();
        this.lastTimestamp = performance.now();

        // Pointer lock (desktop only)
        this.input.requestPointerLock();

        // Music
        this._try('music', () => AudioEngine.startCombatMusic());

        // Quests / waves
        this._try('quests', () => this.quests.startMissionQuests(`mission_${missionId}`));
        if (mode === 'survival') this._try('waves', () => this.waves.startSurvivalMode());

        requestAnimationFrame(this._gameLoop.bind(this));

        const zoneNames = ['', 'Abandoned City', 'Dense Forest', 'Military Base', 'Frozen Mountains', 'Volcanic Zone'];
        EventBus.emit(EVENTS.SHOW_NOTIFICATION, {
            text: `🎮 Mission ${missionId}: ${zoneNames[missionId] || 'Unknown'} — SURVIVE!`,
            type: 'gold'
        });
    }

    async _initSystems(missionId, mode) {
        // Input
        this.input = new InputManager();

        // Touch controls
        if (typeof TouchControls !== 'undefined') {
            this.touch = new TouchControls(this.input);
            this.input.touch = this.touch;
        }

        // World
        const zoneMap = { 1: 'city', 2: 'forest', 3: 'desert', 4: 'frozen', 5: 'volcano' };
        const zoneId = mode === 'survival'
            ? Utils.randomElement(Object.values(zoneMap))
            : (zoneMap[missionId] || 'city');

        this.world = new WorldGenerator(this.scene, zoneId);
        this.world.generate();

        // Lights (world generator adds some, add extras here)
        this.sunLight = new THREE.DirectionalLight(0xfff5e0, 1.2);
        this.sunLight.position.set(100, 200, 100);
        this.sunLight.castShadow = true;
        this.sunLight.shadow.mapSize.width = 1024;
        this.sunLight.shadow.mapSize.height = 1024;
        this.sunLight.shadow.camera.near = 0.5;
        this.sunLight.shadow.camera.far = 500;
        this.sunLight.shadow.camera.left = -200;
        this.sunLight.shadow.camera.right = 200;
        this.sunLight.shadow.camera.top = 200;
        this.sunLight.shadow.camera.bottom = -200;
        this.scene.add(this.sunLight);

        this.ambientLight = new THREE.AmbientLight(0x334455, 0.7);
        this.scene.add(this.ambientLight);

        // Subsystems (wrapped so one failure doesn't break all)
        this._try('ParticleEngine', () => { this.particles = new ParticleEngine(this.scene); });
        this._try('DayNightCycle', () => { this.dayNight = new DayNightCycle(this.scene); this.dayNight.init(this.sunLight, this.ambientLight); });
        this._try('WeatherSystem', () => { this.weather = new WeatherSystem(this.scene, this.particles); });
        this._try('LootSystem', () => { this.loot = new LootSystem(this.scene); });
        this._try('InventorySystem', () => { this.inventory = new InventorySystem(); });
        this._try('QuestSystem', () => { this.quests = new QuestSystem(); });
        this._try('AchievementSystem', () => { this.achievements = new AchievementSystem(); });
        this._try('WaveSystem', () => { this.waves = new WaveSystem(this.scene, this.particles, this.world); });
        this._try('ProgressionSystem', () => { this.progression = new ProgressionSystem(); });
        this._try('SquadAI', () => { this.squadAI = new SquadAI(); });
        this._try('ProjectileManager', () => { this.projectiles = new ProjectileManager(this.scene, this.particles); });
        this._try('VehicleManager', () => { this.vehicles = new VehicleManager(this.scene); });

        // Player
        const spawn = this.world.getPlayerSpawn();
        this.player = new Player(this.scene, this.camera, this.world);
        this.player.setPosition(spawn.x, Math.max(spawn.y || 0, 1), spawn.z);

        // ▶ Set camera right on the player so there's no "fly-in" from (0,15,30)
        this._snapCameraToPlayer();

        // Starter weapons
        const loadout = WeaponSystem.getStarterLoadout();
        this.player.weapons.push(loadout.primary);
        this.player.weapons.push(loadout.secondary);
        this.player.weapons.push(loadout.melee);

        this._try('applySkills', () => { this.progression?.applyAllSkills(this.player); });
        this._try('AbilityManager', () => { this.abilityMgr = new AbilityManager(this.player, this.scene, this.particles); });

        // HUD
        this._try('HUDManager', () => { this.hud = new HUDManager(); });
        this._try('MinimapRenderer', () => { this.minimap = new MinimapRenderer(); });
        this._try('NotificationEngine', () => { this.notifications = new NotificationEngine(); });

        // Vehicles / loot
        this._try('spawnVehicles', () => this.vehicles?.spawnVehiclesForMission(this.world));
        this._try('spawnLoot', () => {
            const pts = this.world.getLootPoints();
            pts.forEach(pt => this.loot?.spawnRandomLoot(
                new THREE.Vector3(pt.x, pt.y || 0.5, pt.z), Utils.randomInt(1, 3)
            ));
        });

        // HUD mission info
        const missionNames = ['', 'Insertion Point', 'Forest Hunt', 'Desert Storm', 'Frozen Hell', 'Inferno'];
        this._try('hudMission', () => this.hud?.setMissionInfo(
            mode === 'survival' ? 'SURVIVAL MODE' : (missionNames[missionId] || `Mission ${missionId}`),
            'Eliminate all enemies'
        ));
    }

    // Immediately position camera at player to prevent black screen
    _snapCameraToPlayer() {
        if (!this.player || !this.camera) return;
        const p = this.player.position;
        const yaw = this.player.yaw || 0;
        const camDist = 3.5, camH = 2.2;
        this.camera.position.set(
            p.x - Math.sin(yaw) * camDist * 0.3,
            p.y + camH,
            p.z - Math.cos(yaw) * camDist
        );
        this.camera.lookAt(p.x, p.y + 1.4, p.z);
    }

    async _spawnEntities(missionId, mode) {
        const spawnPoints = this.world.getEnemySpawnPoints();

        if (mode === 'survival') {
            this.totalEnemies = 999;
        } else {
            const enemyCount = 50; // C.TOTAL_ENEMIES
            const configs = {
                1: { GRUNT: 20, SCOUT: 10, SHOTGUNNER: 10, SNIPER: 5, bossChance: 0.5 },
                2: { GRUNT: 15, SCOUT: 15, SNIPER: 10, ELITE: 5, bossChance: 0.7 },
                3: { GRUNT: 10, ELITE: 15, HEAVY: 10, ROCKETEER: 5, bossChance: 0.8 },
                4: { ELITE: 15, HEAVY: 15, SNIPER: 10, FLAMER: 5, bossChance: 0.9 },
                5: { ELITE: 20, HEAVY: 10, ROCKETEER: 10, FLAMER: 5, bossChance: 1.0 }
            };
            const cfg = configs[missionId] || configs[1];
            const types = [];
            for (const [t, cnt] of Object.entries(cfg)) {
                if (t === 'bossChance') continue;
                for (let i = 0; i < cnt; i++) types.push(t);
            }

            for (let i = 0; i < Math.min(types.length, enemyCount - 1); i++) {
                const sp = spawnPoints[i % spawnPoints.length];
                if (!sp) continue;
                this._try(`enemy_${i}`, () => {
                    const e = new Enemy(this.scene, this.particles, types[i] || 'GRUNT');
                    const ex = sp.x + Utils.randomInRange(-20, 20);
                    const ez = sp.z + Utils.randomInRange(-20, 20);
                    const ey = this.world.getTerrainHeight(ex, ez) + 0.01;
                    e.setPosition(ex, ey, ez);
                    const ai = new EnemyAI(e, this.world);
                    this.enemies.push(e);
                    this.enemyAIs.push({ entity: e, ai });
                });
            }

            // Boss
            this._try('boss', () => {
                if (Math.random() < cfg.bossChance) {
                    const sp = spawnPoints[Math.floor(spawnPoints.length / 2)] || { x: 80, z: 80 };
                    const bossTypes = ['BOSS_TITAN', 'BOSS_GHOST', 'BOSS_TANK'];
                    const b = new Boss(this.scene, this.particles, bossTypes[missionId - 1] || 'BOSS_TITAN');
                    b.setPosition(sp.x, this.world.getTerrainHeight(sp.x, sp.z) + 0.01, sp.z);
                    this.enemies.push(b);
                    this.enemyAIs.push({ entity: b, ai: new EnemyAI(b, this.world) });
                }
            });

            // Squads
            this._try('squads', () => {
                for (let i = 0; i < this.enemies.length; i += C.SQUAD_SIZE) {
                    const g = this.enemies.slice(i, i + C.SQUAD_SIZE).filter(e => !e.isBoss);
                    if (g.length > 1) this.squadAI?.formSquad(g);
                }
            });

            this.totalEnemies = this.enemies.length;
            this._try('hudTotal', () => this.hud?.setTotalEnemies(this.totalEnemies));
        }
    }

    /* ===========================================
       MAIN GAME LOOP
    =========================================== */
    _gameLoop(timestamp) {
        if (this.state !== 'playing') return;
        requestAnimationFrame(this._gameLoop.bind(this));

        const dt = Math.min((timestamp - this.lastTimestamp) / 1000, 0.05);
        this.lastTimestamp = timestamp;
        this.gameTime = (Date.now() - this.startTime) / 1000;

        this._try('update', () => this._update(dt));
        this._render();
    }

    _update(dt) {
        const inp = this.input.getState();

        // Pause
        if (inp.pause) { this.pause(); this.input.clearFrame(); return; }

        // Inventory
        if (inp.inventory) this._try('inventory toggle', () => this.inventory?.toggle(this.player));

        // Player
        if (this.player?.isAlive) {
            this._try('player.update', () => this.player.update(dt, this.input));

            // Fire weapon
            if ((inp.fire || this.input.mouse.buttons[0]) && this.player.activeWeapon) {
                this._try('fire', () => {
                    const r = WeaponSystem.tryFire(
                        this.player.activeWeapon, this.player,
                        this.enemies, this.scene, this.particles, this.world, dt
                    );
                    if (r) this.hud?.showCrosshairExpand?.();
                });
            }

            if (inp.reload && this.player.activeWeapon) this._try('reload', () => WeaponSystem.startReload(this.player.activeWeapon));
            if (inp.ability) this._try('ability', () => this.player.useAbility());
            if (inp.grenade) this._try('grenade', () => {
                const cfg = this.player.throwGrenade(this.scene, this.particles);
                if (cfg) this.projectiles?.spawnGrenade(cfg);
            });

            // Weapon slot keys
            for (let i = 1; i <= 5; i++) {
                if (this.input.justPressed(`Digit${i}`)) this.player.switchWeapon(i - 1);
            }

            // Grenade cycle
            if (inp.nextGrenade) {
                const types = ['frag', 'smoke', 'flash', 'molotov'];
                const ci = types.indexOf(this.player.activeGrenadeType);
                this.player.activeGrenadeType = types[(ci + 1) % types.length];
                EventBus.emit(EVENTS.SHOW_NOTIFICATION, { text: `Grenade: ${this.player.activeGrenadeType}`, type: 'info' });
            }

            // Interact
            if (inp.interact) {
                this._try('interact', () => {
                    if (!this.player.isInVehicle) {
                        const nv = this.vehicles?.getNearestEmpty(this.player.position);
                        if (nv) { nv.isOccupied = true; this.player.enterVehicle(nv); }
                        else this._checkNPCInteract();
                    }
                });
                // Loot
                this._try('loot pickup', () => {
                    const picked = this.loot?.checkPickup(this.player.position, true, this.inventory);
                    if (picked) EventBus.emit(EVENTS.LOOT_PICKED_UP, picked);
                });
            } else {
                this._try('loot check', () => this.loot?.checkPickup(this.player.position, false, this.inventory));
            }

            // Exit vehicle
            if (inp.exitVehicle && this.player.isInVehicle) {
                if (this.player.currentVehicle) this.player.currentVehicle.isOccupied = false;
                this.player.exitVehicle();
            }

            // Vehicle gun (desktop)
            if (this.player.isInVehicle && this.input.mouse.buttons[0]) {
                this._try('vehicleFire', () => {
                    const shot = this.player.currentVehicle?.fireWeapon();
                    if (shot) this.projectiles?.spawnProjectile(shot.from, shot.direction, { damage: shot.damage, bulletSpeed: 500 }, true);
                });
            }

            // Interact prompt (world objects)
            this._try('interactables', () => {
                const iobj = this.world.getNearestInteractable(this.player.position.x, this.player.position.z);
                if (iobj) {
                    EventBus.emit('show_interact_prompt', { text: iobj.prompt || 'Interact' });
                } else {
                    EventBus.emit('hide_interact_prompt');
                }
            });
        }

        // Enemy AI
        for (const { entity, ai } of this.enemyAIs) {
            if (!entity.isAlive) continue;
            this._try('enemy.update', () => entity.update(dt, this.player, this.world, this.camera));
            this._try('enemy.ai', () => ai.update(dt, this.player, this.enemies, this.world));
        }

        // Wave system
        this._try('waves.update', () => {
            if (this.waves) {
                this.waves.update(dt);
                const we = this.waves.getAliveEnemies?.() || [];
                for (const e of we) {
                    if (!this.enemyAIs.find(p => p.entity === e)) {
                        const ai = new EnemyAI(e, this.world);
                        this.enemyAIs.push({ entity: e, ai });
                        this.enemies.push(e);
                    }
                }
            }
        });

        // Projectiles
        this._try('projectiles', () => this.projectiles?.update(dt, this.enemies, this.player, this.world));

        // Particles
        this._try('particles', () => this.particles?.update(dt));

        // World atmosphere
        this._try('dayNight', () => this.dayNight?.update(dt));
        this._try('weather', () => { this.weather?.update(dt); this.weather?.updateCameraFollow(this.camera); });
        this._try('loot.update', () => { this.loot?.update(dt); this.loot?.updateSupplyDrop(dt, this.player, this.inventory); });
        this._try('vehicles', () => this.vehicles?.update(dt));
        this._try('npcs', () => this.npcs.forEach(n => n.update?.(dt)));
        this._try('abilityMgr', () => this.abilityMgr?.update(dt, this.enemies));
        this._try('squadAI', () => this.squadAI?.update(this.enemies, this.player));

        // HUD
        const alive = this.enemies.filter(e => e.isAlive);
        this._try('hud', () => this.hud?.update(this.player, alive, this.gameTime, this.dayNight));
        this._try('minimap', () => this.minimap?.update(this.player, alive, this.npcs, this.world, this.dayNight));

        // Touch: sync active weapon slot indicator
        this._try('touchWeapon', () => this.touch?.setActiveWeaponSlot?.(this.player?.activeWeaponSlot));

        // Camera shake
        this._applyCameraShake(dt);

        // Win / lose
        this._checkKillCount();
        this._checkWinCondition();

        // Achievement check every 5s
        if (Math.floor(this.gameTime) % 5 === 0) this._try('ach', () => this.achievements?.checkAll());

        // Clear input
        this.input.clearFrame();
    }

    _render() {
        this.renderer.render(this.scene, this.camera);
    }

    /* ===========================================
       GAME STATE
    =========================================== */
    pause() {
        if (this.state !== 'playing') return;
        this.state = 'paused';
        this.input.releasePointerLock();
        if (this.touch?.isMobile) this.touch.hide();
        Utils.show('pause-menu');
    }

    resume() {
        if (this.state !== 'paused') return;
        this.state = 'playing';
        Utils.hide('pause-menu');
        this.input.requestPointerLock();
        if (this.touch?.isMobile) this.touch.show();
        this.lastTimestamp = performance.now();
        requestAnimationFrame(this._gameLoop.bind(this));
    }

    returnToMenu() {
        this.state = 'menu';
        this.input?.releasePointerLock();
        if (this.touch?.isMobile) this.touch.hide();
        Utils.hide('game-container');
        Utils.hide('hud');
        Utils.hide('pause-menu');
        Utils.hide('death-screen');
        Utils.hide('victory-screen');
        Utils.show('main-menu');

        // Re-setup scene for menu
        while (this.scene.children.length > 0) this.scene.remove(this.scene.children[0]);
        this._setupMenu();
        this._startMenuAnimation();
    }

    _checkKillCount() {
        const alive = this.enemies.filter(e => e.isAlive);
        this.kills = this.enemies.length - alive.length;
        if (this.hud) this._try('hudKills', () => this.hud.updateKillCount?.(this.kills));
        if (this.gameMode === 'campaign' && alive.length === 0 && this.enemies.length >= this.totalEnemies - 1 && this.totalEnemies > 0) {
            this._victory();
        }
    }

    _checkWinCondition() {
        if (this.state !== 'playing' || !this.player?.isAlive) return;
        const GAME_DURATION = 600;
        if (this.gameMode === 'survival' && this.gameTime >= GAME_DURATION) this._victory();
    }

    _victory() {
        if (this.state === 'victory' || this.state === 'dead') return;
        this.state = 'victory';
        this._try('music stop', () => AudioEngine.stopCombatMusic());
        this.input?.releasePointerLock();
        if (this.touch?.isMobile) this.touch.hide();

        SaveManager.set(`missions.${this.selectedMission}.completed`, true);
        SaveManager.addStat('totalMissionsCompleted');
        const xp = this.kills * C.XP_PER_KILL + Math.round(this.gameTime * 2);
        SaveManager.addXP(xp);

        Utils.hide('hud');
        Utils.show('victory-screen');
        this._el('victory-kills', this.kills);
        this._el('victory-time', Utils.formatTime(this.gameTime));
        this._el('victory-xp', `+${xp} XP`);
        const acc = Math.round((SaveManager.get('stats.bulletsHit') || 0) / Math.max(1, SaveManager.get('stats.bulletsShot') || 1) * 100);
        this._el('victory-accuracy', acc + '%');
    }

    _onPlayerDied({ killer }) {
        if (this.state !== 'playing') return;
        this.state = 'dead';
        this._try('music stop', () => AudioEngine.stopCombatMusic());
        this.input?.releasePointerLock();
        if (this.touch?.isMobile) this.touch.hide();

        setTimeout(() => {
            Utils.hide('hud');
            Utils.show('death-screen');
            this._el('death-kills', this.kills);
            this._el('death-time', Utils.formatTime(this.gameTime));
            this._el('death-killer', killer?.typeName || 'Enemy');
            this._el('death-wave', this._try('curWave', () => this.waves?.getCurrentWave?.() ?? 0) || 0);
        }, 1500);
    }

    _onEnemyThrowGrenade({ position, target, type }) {
        this._try('enemyGrenade', () => {
            const dir = target.clone().sub(position).normalize();
            dir.y += 0.6;
            this.projectiles?.spawnGrenade({ type, position, velocity: dir.multiplyScalar(13), timer: 3, bounces: 0 });
        });
    }

    _checkNPCInteract() {
        for (const npc of this.npcs) {
            if (!npc.isAlive) continue;
            const dist = this.player.position.distanceTo(npc.position);
            if (dist < (npc.interactionRadius || 3)) {
                const r = npc.interact?.(this.player);
                if (r) {
                    this.notifications?.showDialogue?.(r.npcName, r.icon, r.dialogue);
                    if (r.reward) EventBus.emit(EVENTS.SHOW_NOTIFICATION, r.reward);
                    SaveManager.addStat('npcHelped');
                }
                break;
            }
        }
    }

    _applyCameraShake(dt) {
        if (this.cameraShake.timer > 0) {
            this.cameraShake.timer -= dt;
            const i = this.cameraShake.intensity;
            this.camera.position.x += Utils.randomInRange(-i, i);
            this.camera.position.y += Utils.randomInRange(-i * 0.5, i * 0.5);
            this.cameraShake.intensity = Math.max(0, this.cameraShake.intensity - i * dt * 3);
        }
    }

    _el(id, val) {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    }
}
