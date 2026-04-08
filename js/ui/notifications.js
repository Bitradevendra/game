/* ====================================================
   WARZONE EXODUS — NOTIFICATION ENGINE
   Kill feed, notifications, popups, speech
   ==================================================== */

class NotificationEngine {
    constructor() {
        this.killFeedEl = document.getElementById('kill-feed');
        this.notifEl = document.getElementById('notifications');

        this._bindEvents();
    }

    _bindEvents() {
        EventBus.on(EVENTS.SHOW_NOTIFICATION, d => this.showNotif(d.text, d.type));
        EventBus.on(EVENTS.SHOW_KILL_FEED, d => this.showKillFeed(d));
        EventBus.on(EVENTS.SHOW_XP_POPUP, d => this.storeXPPopup(d));
    }

    showNotif(text, type = 'info') {
        if (!this.notifEl) return;

        const el = document.createElement('div');
        const typeClass = {
            info: 'notif-info',
            success: 'notif-success',
            warning: 'notif-warning',
            danger: 'notif-danger',
            gold: 'notif-gold',
            enemy: 'notif-enemy'
        }[type] || 'notif-info';

        el.className = `notification ${typeClass}`;
        el.textContent = text;

        this.notifEl.insertBefore(el, this.notifEl.firstChild);

        // Limit to 5 visible
        while (this.notifEl.children.length > 5) {
            this.notifEl.removeChild(this.notifEl.lastChild);
        }

        // Auto-remove
        const duration = type === 'danger' || type === 'gold' ? 4000 : 2500;
        setTimeout(() => {
            el.style.opacity = '0';
            el.style.transform = 'translateX(100%)';
            setTimeout(() => el.remove(), 300);
        }, duration);
    }

    showKillFeed({ killer, victim, weapon, headshot }) {
        if (!this.killFeedEl) return;

        const el = document.createElement('div');
        el.className = `kill-feed-entry ${headshot ? 'headshot-entry' : ''}`;

        const hs = headshot ? '<span class="headshot-badge">HEADSHOT</span>' : '';
        el.innerHTML = `
      <span class="kill-killer">${killer}</span>
      <span class="kill-weapon">${weapon}</span>
      <span class="kill-victim">${victim}</span>
      ${hs}
    `;

        this.killFeedEl.insertBefore(el, this.killFeedEl.firstChild);

        while (this.killFeedEl.children.length > 6) {
            this.killFeedEl.removeChild(this.killFeedEl.lastChild);
        }

        setTimeout(() => {
            el.style.opacity = '0';
            setTimeout(() => el.remove(), 300);
        }, 4000);
    }

    storeXPPopup(data) {
        // XP popups are rendered by HUD in game loop (needs 3D projection)
        EventBus.emit('_xp_popup_ready', data);
    }

    showDialogue(npcName, icon, text) {
        const el = document.getElementById('npc-dialogue');
        const nameEl = document.getElementById('npc-dialogue-name');
        const textEl = document.getElementById('npc-dialogue-text');
        const iconEl = document.getElementById('npc-dialogue-icon');

        if (!el) return;

        if (nameEl) nameEl.textContent = npcName;
        if (textEl) textEl.textContent = text;
        if (iconEl) iconEl.textContent = icon;

        el.classList.remove('hidden');

        clearTimeout(this._dialogueTimeout);
        this._dialogueTimeout = setTimeout(() => {
            el.classList.add('hidden');
        }, 5000);
    }

    showInteractionHint(text) {
        const el = document.getElementById('interact-prompt');
        const textEl = document.getElementById('interact-action-text');
        if (el && textEl) {
            textEl.textContent = text;
            el.classList.remove('hidden');
        }
    }

    hideInteractionHint() {
        document.getElementById('interact-prompt')?.classList.add('hidden');
    }
}
