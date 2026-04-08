/* ====================================================
   WARZONE EXODUS — TOUCH CONTROLS v2
   Reliable dual-joystick + action buttons for mobile
   ==================================================== */

class TouchControls {
    constructor(inputManager) {
        this.input = inputManager;
        this.isMobile = this._detectMobile();

        // Move joystick
        this.moveStick = { active: false, id: null, sx: 0, sy: 0, dx: 0, dy: 0 };
        // Look (camera)
        this.lookStick = { active: false, id: null, px: 0, py: 0 };
        this._lookDX = 0;
        this._lookDY = 0;

        // Buttons
        this.buttons = {
            fire: false, ads: false, jump: false, crouch: false,
            reload: false, grenade: false, ability: false, sprint: false,
            interact: false, pause: false, inventory: false
        };

        this.STICK_RADIUS = 55;
        this.DEAD_ZONE = 0.15;
        this.LOOK_SENS = 0.45;   // much lower for touch

        // DOM
        this.container = null;
        this.moveBase = null;
        this.moveThumb = null;
        this.lookBase = null;
        this.lookThumb = null;

        if (this.isMobile) this._build();
    }

    _detectMobile() {
        const ua = navigator.userAgent;
        if (/Android|iPhone|iPad|iPod|Mobile/i.test(ua)) return true;
        if ('ontouchstart' in window && navigator.maxTouchPoints > 1) return true;
        if (window.innerWidth <= 900 && navigator.maxTouchPoints > 0) return true;
        return false;
    }

    /* ═══════════════════ BUILD UI ═══════════════════ */
    _build() {
        // Mark body as mobile
        document.body.classList.add('is-mobile');

        this.container = document.createElement('div');
        this.container.id = 'touch-hud';
        (document.getElementById('game-container') || document.body).appendChild(this.container);

        // ── Left stick ──
        this.moveBase = this._mkDiv('joystick-base js-move', this.container);
        this.moveThumb = this._mkDiv('joystick-thumb', this.moveBase);
        // position bottom-left default
        Object.assign(this.moveBase.style, { left: '60px', bottom: '80px', opacity: '0.35' });

        // ── Right stick ──
        this.lookBase = this._mkDiv('joystick-base js-look', this.container);
        this.lookThumb = this._mkDiv('joystick-thumb jt-look', this.lookBase);
        Object.assign(this.lookBase.style, { right: '60px', bottom: '80px', opacity: '0.2' });

        // ── Action buttons ──
        const btns = [
            { key: 'fire', icon: '🔫', cls: 'btn-fire' },
            { key: 'ads', icon: '🎯', cls: 'btn-ads' },
            { key: 'jump', icon: '⬆', cls: 'btn-jump' },
            { key: 'crouch', icon: '⬇', cls: 'btn-crouch' },
            { key: 'reload', icon: '🔁', cls: 'btn-reload' },
            { key: 'grenade', icon: '💣', cls: 'btn-grenade' },
            { key: 'ability', icon: '⚡', cls: 'btn-ability' },
            { key: 'interact', icon: '👐', cls: 'btn-interact' },
        ];

        const rightPanel = this._mkDiv('touch-right-btns', this.container);
        btns.forEach(b => {
            const el = document.createElement('button');
            el.className = `tbtn ${b.cls}`;
            el.innerHTML = b.icon;
            el.dataset.action = b.key;
            rightPanel.appendChild(el);

            el.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); this._btnDown(b.key, el); }, { passive: false });
            el.addEventListener('touchend', e => { e.preventDefault(); e.stopPropagation(); this._btnUp(b.key, el); }, { passive: false });
            el.addEventListener('touchcancel', e => { e.preventDefault(); this._btnUp(b.key, el); }, { passive: false });
        });

        // ── Top buttons ──
        const topBar = this._mkDiv('touch-top-bar', this.container);
        [
            { key: 'pause', icon: '⏸' },
            { key: 'inventory', icon: '🎒' },
            { key: 'sprint', icon: '🏃' },
        ].forEach(b => {
            const el = document.createElement('button');
            el.className = 'tbtn tbtn-top';
            el.innerHTML = b.icon;
            el.dataset.action = b.key;
            topBar.appendChild(el);

            if (b.key === 'sprint') {
                // toggle
                el.addEventListener('touchstart', e => {
                    e.preventDefault(); e.stopPropagation();
                    this.buttons.sprint = !this.buttons.sprint;
                    el.classList.toggle('active', this.buttons.sprint);
                }, { passive: false });
            } else {
                el.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); this._btnDown(b.key, el); }, { passive: false });
                el.addEventListener('touchend', e => { e.preventDefault(); e.stopPropagation(); this._btnUp(b.key, el); }, { passive: false });
            }
        });

        // ── Weapon slots ──
        const wbar = this._mkDiv('touch-wbar', this.container);
        for (let i = 0; i < 5; i++) {
            const s = document.createElement('button');
            s.className = 'tbtn-wslot';
            s.textContent = i + 1;
            s.addEventListener('touchstart', e => {
                e.preventDefault(); e.stopPropagation();
                this.input._justPressed.add(`Digit${i + 1}`);
                s.classList.add('active');
                setTimeout(() => s.classList.remove('active'), 200);
            }, { passive: false });
            wbar.appendChild(s);
        }

        this._bindTouch();
        console.log('[Touch] Mobile controls ready');
    }

    _mkDiv(cls, parent) {
        const d = document.createElement('div');
        d.className = cls;
        parent.appendChild(d);
        return d;
    }

    /* ═══════════════════ TOUCH EVENTS ═══════════════════ */
    _bindTouch() {
        // Bind to DOCUMENT so we always capture touches
        document.addEventListener('touchstart', this._onStart.bind(this), { passive: false });
        document.addEventListener('touchmove', this._onMove.bind(this), { passive: false });
        document.addEventListener('touchend', this._onEnd.bind(this), { passive: false });
        document.addEventListener('touchcancel', this._onEnd.bind(this), { passive: false });

        // Prevent scroll / zoom on game area
        document.addEventListener('gesturestart', e => e.preventDefault(), { passive: false });
    }

    _onStart(e) {
        // Skip if touch started on a button
        if (e.target.closest('.tbtn') || e.target.closest('.tbtn-wslot') || e.target.closest('.tbtn-top')) return;
        // Only process touches on game area
        if (e.target.closest('#main-menu') || e.target.closest('#mission-select') ||
            e.target.closest('#death-screen') || e.target.closest('#victory-screen') ||
            e.target.closest('#pause-menu') || e.target.closest('#settings-panel')) return;

        e.preventDefault();
        const mid = window.innerWidth * 0.4; // 40% left for move, 60% right for look

        for (const t of e.changedTouches) {
            if (t.clientX < mid && !this.moveStick.active) {
                this._startMove(t);
            } else if (t.clientX >= mid && !this.lookStick.active) {
                this._startLook(t);
            }
        }
    }

    _onMove(e) {
        for (const t of e.changedTouches) {
            if (this.moveStick.active && this.moveStick.id === t.identifier) {
                this._updateMove(t);
            }
            if (this.lookStick.active && this.lookStick.id === t.identifier) {
                this._updateLook(t);
            }
        }
    }

    _onEnd(e) {
        for (const t of e.changedTouches) {
            if (this.moveStick.active && this.moveStick.id === t.identifier) this._endMove();
            if (this.lookStick.active && this.lookStick.id === t.identifier) this._endLook();
        }
    }

    /* ── Move Joystick ── */
    _startMove(t) {
        this.moveStick.active = true;
        this.moveStick.id = t.identifier;
        this.moveStick.sx = t.clientX;
        this.moveStick.sy = t.clientY;
        this.moveStick.dx = 0;
        this.moveStick.dy = 0;

        // Snap base to touch point
        this.moveBase.style.left = (t.clientX - this.STICK_RADIUS) + 'px';
        this.moveBase.style.top = (t.clientY - this.STICK_RADIUS) + 'px';
        this.moveBase.style.bottom = 'auto';
        this.moveBase.style.opacity = '1';
        this.moveThumb.style.transform = 'translate(0,0)';
    }

    _updateMove(t) {
        const dx = t.clientX - this.moveStick.sx;
        const dy = t.clientY - this.moveStick.sy;
        const dist = Math.hypot(dx, dy);
        const R = this.STICK_RADIUS;
        const clamped = Math.min(dist, R);
        const angle = Math.atan2(dy, dx);
        const cx = Math.cos(angle) * clamped;
        const cy = Math.sin(angle) * clamped;

        // Normalized -1..1
        this.moveStick.dx = cx / R;
        this.moveStick.dy = cy / R;

        this.moveThumb.style.transform = `translate(${cx}px, ${cy}px)`;
    }

    _endMove() {
        this.moveStick.active = false;
        this.moveStick.id = null;
        this.moveStick.dx = 0;
        this.moveStick.dy = 0;
        this.moveThumb.style.transform = 'translate(0,0)';
        this.moveBase.style.opacity = '0.35';
        // Reset position
        this.moveBase.style.left = '60px';
        this.moveBase.style.bottom = '80px';
        this.moveBase.style.top = 'auto';
    }

    /* ── Look Joystick ── */
    _startLook(t) {
        this.lookStick.active = true;
        this.lookStick.id = t.identifier;
        this.lookStick.px = t.clientX;
        this.lookStick.py = t.clientY;
        this._lookDX = 0;
        this._lookDY = 0;

        this.lookBase.style.left = (t.clientX - this.STICK_RADIUS) + 'px';
        this.lookBase.style.top = (t.clientY - this.STICK_RADIUS) + 'px';
        this.lookBase.style.bottom = 'auto';
        this.lookBase.style.right = 'auto';
        this.lookBase.style.opacity = '0.8';
        this.lookThumb.style.transform = 'translate(0,0)';
    }

    _updateLook(t) {
        // Delta from last touch event (for camera rotation)
        this._lookDX = t.clientX - this.lookStick.px;
        this._lookDY = t.clientY - this.lookStick.py;
        this.lookStick.px = t.clientX;
        this.lookStick.py = t.clientY;

        // Visual thumb (from start position)
        const sx = this.moveStick.active ? this.lookStick.px : t.clientX;
        // simple clamped offset from current base center
        const baseRect = this.lookBase.getBoundingClientRect();
        const bcx = baseRect.left + baseRect.width / 2;
        const bcy = baseRect.top + baseRect.height / 2;
        const ox = t.clientX - bcx;
        const oy = t.clientY - bcy;
        const d = Math.hypot(ox, oy);
        const R = this.STICK_RADIUS;
        const c = Math.min(d, R);
        const a = Math.atan2(oy, ox);
        this.lookThumb.style.transform = `translate(${Math.cos(a) * c}px, ${Math.sin(a) * c}px)`;
    }

    _endLook() {
        this.lookStick.active = false;
        this.lookStick.id = null;
        this._lookDX = 0;
        this._lookDY = 0;
        this.lookThumb.style.transform = 'translate(0,0)';
        this.lookBase.style.opacity = '0.2';
        this.lookBase.style.left = 'auto';
        this.lookBase.style.top = 'auto';
        this.lookBase.style.right = '60px';
        this.lookBase.style.bottom = '80px';
    }

    /* ═══════════════════ BUTTONS ═══════════════════ */
    _btnDown(key, el) {
        this.buttons[key] = true;
        el.classList.add('pressed');
        if (navigator.vibrate) navigator.vibrate(10);

        // One-shot keys
        const map = {
            jump: 'Space', grenade: 'KeyG', reload: 'KeyR', ability: 'KeyQ',
            interact: 'KeyE', pause: 'Escape', inventory: 'KeyI'
        };
        if (map[key]) this.input._justPressed.add(map[key]);
    }

    _btnUp(key, el) {
        this.buttons[key] = false;
        el.classList.remove('pressed');
    }

    /* ═══════════════════ PUBLIC API ═══════════════════ */

    /** Returns analog movement & button state */
    getState() {
        if (!this.isMobile) return null;
        const jx = this.moveStick.dx;  // -1..1
        const jy = this.moveStick.dy;  // -1..1
        const dz = this.DEAD_ZONE;

        return {
            // ANALOG values for smooth movement
            moveX: Math.abs(jx) > dz ? jx : 0,
            moveY: Math.abs(jy) > dz ? jy : 0,
            // Booleans for compatibility
            forward: jy < -dz,
            back: jy > dz,
            left: jx < -dz,
            right: jx > dz,
            sprint: this.buttons.sprint || (Math.abs(jx) + Math.abs(jy)) > 0.85,
            jump: this.buttons.jump,
            crouch: this.buttons.crouch,
            ads: this.buttons.ads,
            fire: this.buttons.fire,
            reload: this.buttons.reload,
            grenade: this.buttons.grenade,
            interact: this.buttons.interact,
            ability: this.buttons.ability,
            pause: this.buttons.pause,
            inventory: this.buttons.inventory,
            exitVehicle: false,
            nextGrenade: false
        };
    }

    /** Returns camera look delta (consumed each call) */
    getMouseDelta() {
        const x = this._lookDX * this.LOOK_SENS;
        const y = this._lookDY * this.LOOK_SENS;
        this._lookDX = 0;
        this._lookDY = 0;
        return { x, y };
    }

    show() { if (this.container) this.container.style.display = ''; }
    hide() { if (this.container) this.container.style.display = 'none'; }
    isAvailable() { return this.isMobile; }
    setActiveWeaponSlot() { }
}
