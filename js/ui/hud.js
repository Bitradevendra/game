/* ====================================================
   WARZONE EXODUS — HUD MANAGER
   All in-game UI updates
   ==================================================== */

class HUDManager {
    constructor() {
        this.elements = {
            healthBar: document.getElementById('health-bar'),
            regenBar: document.getElementById('health-regen-bar'),
            healthValue: document.getElementById('health-value'),
            armorBar: document.getElementById('armor-bar'),
            armorValue: document.getElementById('armor-value'),
            staminaBar: document.getElementById('stamina-bar'),
            abilityBar: document.getElementById('ability-bar'),
            weaponName: document.getElementById('weapon-name'),
            currentAmmo: document.getElementById('current-ammo'),
            reserveAmmo: document.getElementById('reserve-ammo'),
            weaponMode: document.getElementById('weapon-mode'),
            weaponSlots: document.getElementById('weapon-slots'),
            kills: document.getElementById('hud-kills'),
            totalEnemies: document.getElementById('hud-total-enemies'),
            time: document.getElementById('hud-time'),
            dayNight: document.getElementById('hud-day-night'),
            missionName: document.getElementById('hud-mission-name'),
            objective: document.getElementById('hud-objective'),
            fragCount: document.getElementById('frag-count'),
            smokeCount: document.getElementById('smoke-count'),
            flashCount: document.getElementById('flash-count'),
            molotovCount: document.getElementById('molotov-count'),
            statusEffects: document.getElementById('status-effects'),
            alerts: document.getElementById('hud-alerts')
        };

        this.lowHealthOverlay = null;
        this._createLowHealthOverlay();
        this._createVignette();
        this._createXPBar();

        this._flashTimer = 0;
        this._prevHealth = 100;

        // Listen for events
        EventBus.on(EVENTS.PLAYER_LEVELED_UP, this._onLevelUp.bind(this));
        EventBus.on('player_shot_from', this._showDamageIndicator.bind(this));
        EventBus.on('player_flashed', this._showFlashEffect.bind(this));
    }

    _createLowHealthOverlay() {
        this.lowHealthOverlay = document.createElement('div');
        this.lowHealthOverlay.className = 'low-health-overlay';
        document.getElementById('game-container')?.appendChild(this.lowHealthOverlay);
    }

    _createVignette() {
        const vig = document.createElement('div');
        vig.className = 'vignette';
        document.getElementById('game-container')?.appendChild(vig);
    }

    _createXPBar() {
        const strip = document.createElement('div');
        strip.className = 'xp-strip';
        strip.id = 'xp-strip';
        const fill = document.createElement('div');
        fill.className = 'xp-strip-fill';
        fill.id = 'xp-strip-fill';
        strip.appendChild(fill);
        const levelDisplay = document.createElement('div');
        levelDisplay.className = 'level-display';
        levelDisplay.id = 'level-hud-display';
        document.getElementById('hud')?.appendChild(strip);
        document.getElementById('hud')?.appendChild(levelDisplay);
    }

    update(player, enemies, time, dayNight) {
        if (!player) return;

        this._updateHealth(player);
        this._updateArmor(player);
        this._updateStamina(player);
        this._updateAbility(player);
        this._updateWeapon(player);
        this._updateGrenades(player);
        this._updateTime(time, dayNight);
        this._updateKills(enemies);
        this._updateStatusEffects(player);
        this._updateXPBar();
        this._updateCrosshair(player);
        this._updateLowHealthOverlay(player);
    }

    _updateHealth(player) {
        const pct = player.getHealthPercent() * 100;
        const el = this.elements.healthBar;
        if (el) {
            el.style.width = pct + '%';
            el.className = 'health-bar' + (pct < 30 ? ' critical' : '');
        }
        const valEl = this.elements.healthValue;
        if (valEl) valEl.textContent = Math.ceil(player.health);

        // Flash on damage
        if (player.health < this._prevHealth) {
            this._triggerDamageFlash();
        }
        this._prevHealth = player.health;
    }

    _updateArmor(player) {
        const pct = player.getArmorPercent() * 100;
        if (this.elements.armorBar) this.elements.armorBar.style.width = pct + '%';
        if (this.elements.armorValue) this.elements.armorValue.textContent = Math.ceil(player.armor);
    }

    _updateStamina(player) {
        const pct = player.getStaminaPercent() * 100;
        if (this.elements.staminaBar) this.elements.staminaBar.style.width = pct + '%';
    }

    _updateAbility(player) {
        if (this.elements.abilityBar) {
            this.elements.abilityBar.style.width = (player.abilityCharge * 100) + '%';
        }
    }

    _updateWeapon(player) {
        const weapon = player.activeWeapon;

        if (!weapon) {
            if (this.elements.weaponName) this.elements.weaponName.textContent = '—';
            if (this.elements.currentAmmo) this.elements.currentAmmo.textContent = '—';
            return;
        }

        if (this.elements.weaponName) this.elements.weaponName.textContent = weapon.name;

        if (this.elements.currentAmmo) {
            const isLow = weapon.currentAmmo <= Math.ceil(weapon.magSize * 0.25);
            const isEmpty = weapon.currentAmmo === 0;
            this.elements.currentAmmo.textContent = weapon._isReloading ? 'RELOADING...' : weapon.currentAmmo;
            this.elements.currentAmmo.className = 'current-ammo' + (isEmpty ? ' empty' : isLow ? ' low' : '');
        }

        if (this.elements.reserveAmmo) this.elements.reserveAmmo.textContent = weapon.reserveAmmo;
        if (this.elements.weaponMode) this.elements.weaponMode.textContent = (weapon.currentMode || 'AUTO').toUpperCase();

        this._updateWeaponSlots(player);
    }

    _updateWeaponSlots(player) {
        const el = this.elements.weaponSlots;
        if (!el) return;
        el.innerHTML = '';

        for (let i = 0; i < 5; i++) {
            const slot = document.createElement('div');
            slot.className = `weapon-slot ${i === player.activeWeaponSlot ? 'active' : ''}`;

            if (player.weapons[i]) {
                slot.textContent = player.weapons[i].icon || (i + 1);
                slot.title = player.weapons[i].name;
            } else {
                slot.textContent = i + 1;
            }

            el.appendChild(slot);
        }
    }

    _updateGrenades(player) {
        if (this.elements.fragCount) this.elements.fragCount.textContent = player.grenades.frag;
        if (this.elements.smokeCount) this.elements.smokeCount.textContent = player.grenades.smoke;
        if (this.elements.flashCount) this.elements.flashCount.textContent = player.grenades.flash;
        if (this.elements.molotovCount) this.elements.molotovCount.textContent = player.grenades.molotov;
    }

    _updateTime(time, dayNight) {
        if (this.elements.time) this.elements.time.textContent = Utils.formatTime(time);
        if (this.elements.dayNight && dayNight) {
            const tod = dayNight.getTimeOfDay();
            const icons = { day: '☀', dawn: '🌅', dusk: '🌆', night: '🌙' };
            this.elements.dayNight.textContent = `${icons[tod] || '☀'} ${tod.toUpperCase()}`;
        }
    }

    _updateKills(enemies) {
        const alive = enemies ? enemies.filter(e => e.isAlive).length : 0;
        const total = enemies ? enemies.length : 0;
        const killed = total - alive;
        if (this.elements.kills) this.elements.kills.textContent = killed;
    }

    _updateStatusEffects(player) {
        const el = this.elements.statusEffects;
        if (!el) return;

        const effects = [];
        if (player.effects.focusMode) effects.push({ icon: '🎯', name: 'FOCUS' });
        if (player.effects.invisible) effects.push({ icon: '👻', name: 'CLOAKED' });
        if (player.effects.adrenaline) effects.push({ icon: '⚡', name: 'ADRENALINE' });
        if (player.nightVisionActive) effects.push({ icon: '🌙', name: 'NIGHT VISION' });
        if (player.isSprinting) effects.push({ icon: '🏃', name: 'SPRINT' });
        if (player.isCrouching) effects.push({ icon: '🦆', name: 'CROUCH' });
        if (player.isInVehicle) effects.push({ icon: player.currentVehicle?.icon || '🚗', name: 'IN VEHICLE' });

        el.innerHTML = effects.map(e =>
            `<div class="status-effect">${e.icon} ${e.name}</div>`
        ).join('');
    }

    _updateXPBar() {
        const fill = document.getElementById('xp-strip-fill');
        const levelEl = document.getElementById('level-hud-display');
        if (fill) fill.style.width = (SaveManager.getXPProgress() * 100) + '%';
        if (levelEl) levelEl.textContent = `LV ${SaveManager.get('player.level') || 1}`;
    }

    _updateCrosshair(player) {
        const ch = document.getElementById('crosshair');
        if (!ch) return;

        ch.className = player.isADS ? 'ads' : '';

        // Expand crosshair when shooting (handled by shooting event)
        if (player.isSprinting) {
            ch.style.transform = 'translate(-50%,-50%) scale(1.5)';
        } else if (player.isADS) {
            ch.style.transform = 'translate(-50%,-50%) scale(0.5)';
        } else {
            ch.style.transform = 'translate(-50%,-50%) scale(1)';
        }
    }

    _updateLowHealthOverlay(player) {
        if (!this.lowHealthOverlay) return;
        const isLow = player.health < 30;
        this.lowHealthOverlay.classList.toggle('active', isLow);
    }

    _triggerDamageFlash() {
        const existing = document.querySelector('.screen-damage-flash');
        if (existing) return;

        const flash = document.createElement('div');
        flash.className = 'screen-damage-flash';
        document.getElementById('game-container')?.appendChild(flash);
        setTimeout(() => flash.remove(), 400);
    }

    _showDamageIndicator({ angle }) {
        const container = document.getElementById('damage-indicators');
        if (!container) return;

        const indicator = document.createElement('div');
        indicator.className = 'damage-indicator';

        // Position at edge of screen based on angle
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        const radius = Math.min(cx, cy) * 0.85;

        indicator.style.left = (cx + Math.sin(angle) * radius - 30) + 'px';
        indicator.style.top = (cy - Math.cos(angle) * radius - 30) + 'px';

        container.appendChild(indicator);
        setTimeout(() => indicator.remove(), 1000);
    }

    _showFlashEffect({ duration }) {
        const flash = document.createElement('div');
        flash.style.cssText = `
      position: fixed; inset: 0; background: white; z-index: 9000;
      pointer-events: none; transition: opacity ${duration}s ease-out;
    `;
        document.body.appendChild(flash);

        setTimeout(() => {
            flash.style.opacity = '0';
            setTimeout(() => flash.remove(), duration * 1000);
        }, 50);
    }

    showXPPopup(amount, position3D, camera, renderer, label = '') {
        const container = document.getElementById('xp-popups');
        if (!container || !camera || !renderer) return;

        // Project 3D position to screen
        const vector = position3D.clone().project(camera);
        const x = (vector.x * 0.5 + 0.5) * renderer.domElement.clientWidth;
        const y = (-vector.y * 0.5 + 0.5) * renderer.domElement.clientHeight;

        const popup = document.createElement('div');
        popup.className = 'xp-popup';
        popup.style.left = x + 'px';
        popup.style.top = y + 'px';
        popup.textContent = label ? `${label} +${amount}XP` : `+${amount}XP`;
        container.appendChild(popup);

        setTimeout(() => popup.remove(), C.XP_POPUP_DURATION);
    }

    _onLevelUp(level) {
        const overlay = document.getElementById('level-up-overlay');
        const levelNum = document.getElementById('level-up-number');
        if (overlay && levelNum) {
            levelNum.textContent = level;
            overlay.classList.remove('hidden');
            setTimeout(() => overlay.classList.add('hidden'), 3000);
        }
    }

    setMissionInfo(name, objective) {
        if (this.elements.missionName) this.elements.missionName.textContent = name;
        if (this.elements.objective) this.elements.objective.textContent = objective;
    }

    setTotalEnemies(total) {
        if (this.elements.totalEnemies) this.elements.totalEnemies.textContent = total;
    }

    showCrosshairExpand() {
        const ch = document.getElementById('crosshair');
        if (ch) {
            ch.classList.add('shooting');
            setTimeout(() => ch.classList.remove('shooting'), 100);
        }
    }
}
