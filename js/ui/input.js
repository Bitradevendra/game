/* ====================================================
   WARZONE EXODUS — INPUT MANAGER v2
   Keyboard + mouse + touch integration
   ==================================================== */

class InputManager {
    constructor() {
        this.keys = {};
        this.mouse = { x: 0, y: 0, dx: 0, dy: 0, buttons: {} };
        this.isPointerLocked = false;
        this.isMobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent)
            || (navigator.maxTouchPoints > 1 && window.innerWidth <= 1024);

        this._justPressed = new Set();
        this._justReleased = new Set();
        this.touch = null;   // set externally

        this.actions = {
            forward: false, back: false, left: false, right: false,
            jump: false, sprint: false, crouch: false, ads: false,
            fire: false, reload: false, grenade: false, interact: false,
            ability: false, pause: false, inventory: false,
            weaponSlot1: false, weaponSlot2: false, weaponSlot3: false,
            weaponSlot4: false, weaponSlot5: false,
            nextGrenade: false, exitVehicle: false
        };

        this._bindEvents();
    }

    _bindEvents() {
        document.addEventListener('keydown', e => this._onKeyDown(e));
        document.addEventListener('keyup', e => this._onKeyUp(e));
        document.addEventListener('mousemove', e => this._onMouseMove(e));
        document.addEventListener('mousedown', e => { this.mouse.buttons[e.button] = true; });
        document.addEventListener('mouseup', e => { this.mouse.buttons[e.button] = false; });
        document.addEventListener('pointerlockchange', () => {
            this.isPointerLocked = !!document.pointerLockElement;
        });
        document.addEventListener('wheel', e => {
            this._justPressed.add(e.deltaY > 0 ? 'scrollDown' : 'scrollUp');
        });
    }

    _onKeyDown(e) {
        if (this.keys[e.code]) return;
        this.keys[e.code] = true;
        this._justPressed.add(e.code);
        this._mapAction(e.code, true);
    }

    _onKeyUp(e) {
        this.keys[e.code] = false;
        this._justReleased.add(e.code);
        this._mapAction(e.code, false);
    }

    _onMouseMove(e) {
        if (this.isPointerLocked) {
            this.mouse.dx += e.movementX;
            this.mouse.dy += e.movementY;
        }
        this.mouse.x = e.clientX;
        this.mouse.y = e.clientY;
    }

    _mapAction(code, on) {
        const map = {
            'KeyW': 'forward', 'ArrowUp': 'forward',
            'KeyS': 'back', 'ArrowDown': 'back',
            'KeyA': 'left', 'ArrowLeft': 'left',
            'KeyD': 'right', 'ArrowRight': 'right',
            'Space': 'jump',
            'ShiftLeft': 'sprint', 'ShiftRight': 'sprint',
            'KeyC': 'crouch', 'ControlLeft': 'crouch',
            'KeyR': 'reload', 'KeyG': 'grenade', 'KeyE': 'interact',
            'KeyQ': 'ability', 'Escape': 'pause',
            'KeyI': 'inventory', 'Tab': 'inventory',
            'Digit1': 'weaponSlot1', 'Digit2': 'weaponSlot2',
            'Digit3': 'weaponSlot3', 'Digit4': 'weaponSlot4',
            'Digit5': 'weaponSlot5',
            'KeyF': 'exitVehicle', 'KeyT': 'nextGrenade'
        };
        const a = map[code];
        if (a) this.actions[a] = on;
    }

    requestPointerLock() {
        if (this.isMobile) return;
        const c = document.getElementById('game-canvas');
        if (c && !this.isPointerLocked) c.requestPointerLock();
    }

    releasePointerLock() {
        if (document.pointerLockElement) document.exitPointerLock();
    }

    /* ── getState: merged keyboard + touch ── */
    getState() {
        // Mobile touch path
        if (this.touch?.isMobile) {
            const ts = this.touch.getState();
            if (ts) {
                return {
                    ...ts,
                    // merge one-shot events from both sources
                    jump: ts.jump || this._justPressed.has('Space'),
                    reload: ts.reload || this._justPressed.has('KeyR'),
                    grenade: ts.grenade || this._justPressed.has('KeyG'),
                    interact: ts.interact || this._justPressed.has('KeyE'),
                    ability: ts.ability || this._justPressed.has('KeyQ'),
                    pause: ts.pause || this._justPressed.has('Escape'),
                    inventory: ts.inventory || this._justPressed.has('KeyI'),
                    nextGrenade: this._justPressed.has('KeyT'),
                    exitVehicle: this._justPressed.has('KeyF')
                };
            }
        }

        // Desktop keyboard + mouse path
        return {
            forward: this.actions.forward,
            back: this.actions.back,
            left: this.actions.left,
            right: this.actions.right,
            moveX: 0, moveY: 0,  // no analog on desktop
            jump: this.justPressed('Space'),
            sprint: this.actions.sprint,
            crouch: this.keys['KeyC'] || this.keys['ControlLeft'],
            ads: !!this.mouse.buttons[2],
            fire: !!this.mouse.buttons[0],
            reload: this.justPressed('KeyR'),
            grenade: this.justPressed('KeyG'),
            interact: this.justPressed('KeyE'),
            ability: this.justPressed('KeyQ'),
            pause: this.justPressed('Escape'),
            inventory: this.justPressed('KeyI') || this.justPressed('Tab'),
            nextGrenade: this.justPressed('KeyT'),
            exitVehicle: this.justPressed('KeyF')
        };
    }

    /* ── getMouseDelta: touch OR mouse ── */
    getMouseDelta() {
        // Mobile: always use touch look
        if (this.touch?.isMobile) {
            return this.touch.getMouseDelta();
        }
        // Desktop: use accumulated mouse movement
        const d = { x: this.mouse.dx, y: this.mouse.dy };
        this.mouse.dx = 0;
        this.mouse.dy = 0;
        return d;
    }

    justPressed(code) { return this._justPressed.has(code); }
    isDown(code) { return !!this.keys[code]; }

    clearFrame() {
        this._justPressed.clear();
        this._justReleased.clear();
    }
}
