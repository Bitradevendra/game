/* ====================================================
   WARZONE EXODUS — UTILS
   Math helpers, color utils, geometry
   ==================================================== */

const Utils = {
    // ---- Math ----
    clamp: (v, min, max) => Math.max(min, Math.min(max, v)),
    lerp: (a, b, t) => a + (b - a) * t,
    lerpAngle(a, b, t) {
        let d = b - a;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        return a + d * t;
    },
    distance2D: (ax, ay, bx, by) => Math.sqrt((bx - ax) ** 2 + (by - ay) ** 2),
    distance3D: (a, b) => Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2 + (b.z - a.z) ** 2),

    randomInRange: (min, max) => Math.random() * (max - min) + min,
    randomInt: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
    randomElement: (arr) => arr[Math.floor(Math.random() * arr.length)],

    radToDeg: (r) => r * 180 / Math.PI,
    degToRad: (d) => d * Math.PI / 180,

    normalizeAngle(angle) {
        while (angle > Math.PI) angle -= Math.PI * 2;
        while (angle < -Math.PI) angle += Math.PI * 2;
        return angle;
    },

    // ---- 3D Helpers ----
    vec3(x = 0, y = 0, z = 0) { return new THREE.Vector3(x, y, z); },
    vec2(x = 0, y = 0) { return new THREE.Vector2(x, y); },

    angleBetween(from, to) {
        return Math.atan2(to.z - from.z, to.x - from.x);
    },

    directionVector(yaw) {
        return new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    },

    // ---- Color ----
    hexToRgb(hex) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return { r, g, b };
    },

    lerpColor(c1, c2, t) {
        const r1 = (c1 >> 16) & 0xff, g1 = (c1 >> 8) & 0xff, b1 = c1 & 0xff;
        const r2 = (c2 >> 16) & 0xff, g2 = (c2 >> 8) & 0xff, b2 = c2 & 0xff;
        const r = Math.round(r1 + (r2 - r1) * t);
        const g = Math.round(g1 + (g2 - g1) * t);
        const b = Math.round(b1 + (b2 - b1) * t);
        return (r << 16) | (g << 8) | b;
    },

    brightness(hex, factor) {
        let r = (hex >> 16) & 0xff;
        let g = (hex >> 8) & 0xff;
        let b = hex & 0xff;
        r = Math.min(255, Math.round(r * factor));
        g = Math.min(255, Math.round(g * factor));
        b = Math.min(255, Math.round(b * factor));
        return (r << 16) | (g << 8) | b;
    },

    // ---- String ----
    formatTime(seconds) {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = Math.floor(seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    },

    formatNumber(n) {
        if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
        if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
        return n.toString();
    },

    // ---- DOM ----
    el: (id) => document.getElementById(id),
    show: (id) => { const e = document.getElementById(id); if (e) e.classList.remove('hidden'); },
    hide: (id) => { const e = document.getElementById(id); if (e) e.classList.add('hidden'); },
    toggle: (id) => { const e = document.getElementById(id); if (e) e.classList.toggle('hidden'); },

    // ---- Game helpers ----
    getRarityFromNumber(n) {
        if (n < C.LOOT_RARITY.LEGENDARY.chance * 100) return 'legendary';
        if (n < (C.LOOT_RARITY.LEGENDARY.chance + C.LOOT_RARITY.EPIC.chance) * 100) return 'epic';
        if (n < (C.LOOT_RARITY.LEGENDARY.chance + C.LOOT_RARITY.EPIC.chance + C.LOOT_RARITY.RARE.chance) * 100) return 'rare';
        return 'common';
    },

    randomRarity() {
        const roll = Math.random() * 100;
        let cumulative = 0;
        for (const [key, rarity] of Object.entries(C.LOOT_RARITY)) {
            cumulative += rarity.chance * 100;
            if (roll < cumulative) return key.toLowerCase();
        }
        return 'common';
    },

    // ---- Geometry ----
    aabbIntersects(ax, ay, aw, ah, bx, by, bw, bh) {
        return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
    },

    pointInRect(px, py, rx, ry, rw, rh) {
        return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
    },

    lineIntersectsRect(x1, y1, x2, y2, rx, ry, rw, rh) {
        const minX = rx, maxX = rx + rw, minY = ry, maxY = ry + rh;
        const dx = x2 - x1, dy = y2 - y1;
        let tMin = 0, tMax = 1;
        for (let axis = 0; axis < 2; axis++) {
            const d = axis === 0 ? dx : dy;
            const mn = axis === 0 ? minX - x1 : minY - y1;
            const mx = axis === 0 ? maxX - x1 : maxY - y1;
            if (Math.abs(d) < 1e-8) {
                if (mn > 0 || mx < 0) return false;
            } else {
                const t1 = mn / d, t2 = mx / d;
                tMin = Math.max(tMin, Math.min(t1, t2));
                tMax = Math.min(tMax, Math.max(t1, t2));
                if (tMin > tMax) return false;
            }
        }
        return true;
    },

    // ---- Physics ----
    applyGravity(velocity, dt) {
        velocity.y += C.GRAVITY * dt;
        return velocity;
    },

    // ---- Canvas ----
    drawRoundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    },

    // ---- UUID ----
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    // ---- Easing ----
    easeInOut: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
    easeOut: (t) => 1 - (1 - t) ** 3,
    easeIn: (t) => t ** 3,

    // ---- Smoothstep ----
    smoothstep: (edge0, edge1, x) => {
        const t = Utils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
        return t * t * (3 - 2 * t);
    },

    // ---- Performance ----
    throttle(fn, ms) {
        let last = 0;
        return function (...args) {
            const now = Date.now();
            if (now - last >= ms) { last = now; fn.apply(this, args); }
        };
    },

    debounce(fn, ms) {
        let timer = null;
        return function (...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), ms);
        };
    },

    // ---- Async ----
    sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

    // ---- XP helpers (delegates to SaveManager) ----
    getXPProgress() {
        if (typeof SaveManager === 'undefined') return 0;
        return SaveManager.getXPProgress ? SaveManager.getXPProgress() : 0;
    },

    // ---- DOM helpers ----
    show(id) {
        const el = typeof id === 'string' ? document.getElementById(id) : id;
        if (el) el.classList.remove('hidden');
    },

    hide(id) {
        const el = typeof id === 'string' ? document.getElementById(id) : id;
        if (el) el.classList.add('hidden');
    },

    toggle(id) {
        const el = typeof id === 'string' ? document.getElementById(id) : id;
        if (el) el.classList.toggle('hidden');
    },

    // ---- Time formatting (MM:SS) ----
    formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    },

    // ---- Color interpolation (hex integers) ----
    lerpColor(a, b, t) {
        const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
        const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
        const r = Math.round(ar + (br - ar) * t);
        const g = Math.round(ag + (bg - ag) * t);
        const bl = Math.round(ab + (bb - ab) * t);
        return (r << 16) | (g << 8) | bl;
    }
};
