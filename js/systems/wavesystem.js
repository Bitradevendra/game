/* ====================================================
   WARZONE EXODUS — WAVE SYSTEM
   Survival mode & campaign enemy waves
   ==================================================== */

class WaveSystem {
    constructor(scene, particles, world) {
        this.scene = scene;
        this.particles = particles;
        this.world = world;

        this.currentWave = 0;
        this.isActive = false;
        this.waveInProgress = false;
        this.waveTimer = 0;
        this.betweenWaveTimer = 0;
        this.betweenWaveDuration = 8;
        this.enemies = [];
        this.enemiesDefeated = 0;
        this.totalEnemiesThisWave = 0;
        this.mode = 'survival'; // 'survival' | 'campaign'

        // Difficulty scaling
        this.difficultyMultiplier = 1.0;

        EventBus.on(EVENTS.ENEMY_KILLED, this._onEnemyKilled.bind(this));
    }

    startSurvivalMode() {
        this.mode = 'survival';
        this.currentWave = 0;
        this.isActive = true;
        this.enemies = [];
        EventBus.emit(EVENTS.GAME_MODE_STARTED, 'survival');
        this._startNextWave();
    }

    startCampaignWave(waveNumber, enemyList) {
        this.mode = 'campaign';
        this.currentWave = waveNumber;
        this.isActive = true;
        this.enemies = enemyList;
        this.waveInProgress = true;
        this.totalEnemiesThisWave = enemyList.length;
        this.enemiesDefeated = 0;
    }

    update(dt) {
        if (!this.isActive) return;

        this.waveTimer += dt;

        if (this.betweenWaveTimer > 0) {
            this.betweenWaveTimer -= dt;
            if (this.betweenWaveTimer <= 0) {
                this._startNextWave();
            }
            return;
        }

        // Check if wave complete
        if (this.waveInProgress) {
            const aliveEnemies = this.enemies.filter(e => e.isAlive);
            if (aliveEnemies.length === 0 && this.enemies.length > 0) {
                this._waveComplete();
            }
        }
    }

    _startNextWave() {
        this.currentWave++;
        this.waveInProgress = true;
        this.enemiesDefeated = 0;

        // Scale difficulty
        this.difficultyMultiplier = 1.0 + (this.currentWave - 1) * 0.15;

        const waveConfig = this._getWaveConfig(this.currentWave);
        const spawnPoints = this.world.getEnemySpawnPoints();
        this.enemies = [];

        // Spawn enemies
        for (const config of waveConfig.enemies) {
            const spawn = Utils.randomElement(spawnPoints) || { x: 30, z: 30 };
            const enemy = new Enemy(this.scene, this.particles, config.type);

            // Scale stats
            enemy.health = Math.round(enemy.health * this.difficultyMultiplier);
            enemy.maxHealth = enemy.health;
            enemy.damage = Math.round(enemy.damage * (1 + (this.currentWave - 1) * 0.1));

            enemy.setPosition(
                spawn.x + Utils.randomInRange(-10, 10),
                0,
                spawn.z + Utils.randomInRange(-10, 10)
            );

            this.enemies.push(enemy);
        }

        // Boss wave?
        if (waveConfig.hasBoss) {
            const spawn = spawnPoints[0] || { x: 0, z: 50 };
            const bossType = Utils.randomElement(['BOSS_TITAN', 'BOSS_GHOST', 'BOSS_TANK']);
            const boss = new Boss(this.scene, this.particles, bossType);
            boss.setPosition(spawn.x, 0, spawn.z);
            this.enemies.push(boss);

            EventBus.emit(EVENTS.BOSS_SPAWNED, { boss });
            const bossWarn = document.getElementById('boss-warning');
            const bossNameEl = document.getElementById('boss-name');
            if (bossWarn && bossNameEl) {
                bossWarn.classList.remove('hidden');
                bossNameEl.textContent = boss.typeName;
                setTimeout(() => bossWarn.classList.add('hidden'), 4000);
            }
        }

        this.totalEnemiesThisWave = this.enemies.length;

        // Show wave notification
        const waveEl = document.getElementById('wave-notification');
        const waveTextEl = document.getElementById('wave-text');
        if (waveEl && waveTextEl) {
            waveEl.classList.remove('hidden');
            waveTextEl.textContent = waveConfig.hasBoss ? `WAVE ${this.currentWave}\nBOSS INCOMING!` : `WAVE ${this.currentWave}`;
            setTimeout(() => waveEl.classList.add('hidden'), 3000);
        }

        EventBus.emit(EVENTS.WAVE_STARTED, { wave: this.currentWave, config: waveConfig });
        EventBus.emit(EVENTS.SHOW_NOTIFICATION, {
            text: `🌊 WAVE ${this.currentWave}: ${this.enemies.length} enemies!`,
            type: 'danger'
        });

        AudioEngine.play('explosion', 0.4);

        return this.enemies;
    }

    _getWaveConfig(wave) {
        const configs = {
            1: { enemies: this._fill(['GRUNT'], 5), hasBoss: false },
            2: { enemies: this._fill(['GRUNT', 'SHOTGUNNER'], 7), hasBoss: false },
            3: { enemies: this._fill(['GRUNT', 'SCOUT', 'SNIPER'], 8), hasBoss: false },
            4: { enemies: this._fill(['ELITE', 'GRUNT', 'SNIPER'], 10), hasBoss: false },
            5: { enemies: this._fill(['ELITE', 'SHOTGUNNER'], 8), hasBoss: true },
            6: { enemies: this._fill(['ELITE', 'HEAVY', 'SCOUT'], 12), hasBoss: false },
            7: { enemies: this._fill(['HEAVY', 'ROCKETEER', 'SNIPER'], 10), hasBoss: false },
            8: { enemies: this._fill(['HEAVY', 'FLAMER', 'ELITE'], 12), hasBoss: false },
            9: { enemies: this._fill(['ROCKETEER', 'FLAMER', 'HEAVY'], 14), hasBoss: false },
            10: { enemies: this._fill(['ELITE', 'HEAVY'], 10), hasBoss: true }
        };

        // Beyond wave 10: procedural
        if (wave > 10) {
            const count = Math.min(8 + wave, 30);
            const types = ['GRUNT', 'ELITE', 'HEAVY', 'SNIPER', 'SHOTGUNNER', 'SCOUT', 'ROCKETEER', 'FLAMER'];
            const enemies = [];
            for (let i = 0; i < count; i++) {
                enemies.push({ type: Utils.randomElement(types) });
            }
            return { enemies, hasBoss: wave % 5 === 0 };
        }

        return configs[wave] || configs[10];
    }

    _fill(types, count) {
        const result = [];
        for (let i = 0; i < count; i++) {
            result.push({ type: Utils.randomElement(types) });
        }
        return result;
    }

    _waveComplete() {
        this.waveInProgress = false;

        const bonusXP = this.currentWave * 100;
        SaveManager.addXP(bonusXP);
        SaveManager.addStat('highestWaveSurvived', this.currentWave > (SaveManager.get('player.highestWaveSurvived') || 0) ? this.currentWave : 0);

        EventBus.emit(EVENTS.SHOW_NOTIFICATION, {
            text: `✅ Wave ${this.currentWave} complete! +${bonusXP} XP`,
            type: 'success'
        });

        // Between wave heal
        EventBus.emit('between_waves', { wave: this.currentWave });

        if (this.mode === 'survival') {
            this.betweenWaveTimer = this.betweenWaveDuration;
            EventBus.emit(EVENTS.SHOW_NOTIFICATION, {
                text: `⏱ Next wave in ${this.betweenWaveDuration}s...`,
                type: 'info'
            });
        }

        // Quest tracking
        EventBus.emit('wave_complete', { wave: this.currentWave });
    }

    _onEnemyKilled({ enemy }) {
        if (!this.waveInProgress) return;
        if (this.enemies.includes(enemy)) {
            this.enemiesDefeated++;
        }
    }

    getAliveEnemies() {
        return this.enemies.filter(e => e.isAlive);
    }

    getProgress() {
        if (this.totalEnemiesThisWave === 0) return 1;
        return this.enemiesDefeated / this.totalEnemiesThisWave;
    }

    getCurrentWave() { return this.currentWave; }
    getAllEnemies() { return this.enemies; }

    stop() {
        this.isActive = false;
        this.waveInProgress = false;
    }
}
