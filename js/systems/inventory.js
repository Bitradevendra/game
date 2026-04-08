/* ====================================================
   WARZONE EXODUS — INVENTORY SYSTEM
   Grid-based inventory with items, tooltips, drop/use
   ==================================================== */

class InventorySystem {
    constructor() {
        this.grid = new Array(36).fill(null); // 6x6 grid
        this.equipped = {
            head: null, chest: null, legs: null,
            primary: null, secondary: null, melee: null
        };
        this.maxSlots = 36;
        this.isOpen = false;

        this._setupUI();
    }

    _setupUI() {
        const grid = document.getElementById('inventory-grid');
        if (!grid) return;
        grid.innerHTML = '';

        for (let i = 0; i < this.maxSlots; i++) {
            const slot = document.createElement('div');
            slot.className = 'inv-slot';
            slot.dataset.slot = i;
            slot.addEventListener('click', () => this._onSlotClick(i));
            slot.addEventListener('contextmenu', (e) => { e.preventDefault(); this._onSlotRightClick(i); });
            slot.addEventListener('mouseenter', (e) => this._showTooltip(e, i));
            slot.addEventListener('mouseleave', () => this._hideTooltip());
            grid.appendChild(slot);
        }

        document.getElementById('close-inventory')?.addEventListener('click', () => this.close());
    }

    addItem(item) {
        // Stack if stackable
        if (item.stackable) {
            for (let i = 0; i < this.maxSlots; i++) {
                if (this.grid[i] && this.grid[i].id === item.id && this.grid[i].amount < 99) {
                    const space = 99 - this.grid[i].amount;
                    const added = Math.min(space, item.amount || 1);
                    this.grid[i].amount += added;
                    this._updateSlotUI(i);
                    EventBus.emit(EVENTS.ITEM_ADDED, { item: this.grid[i], slot: i });
                    return i;
                }
            }
        }

        // Find empty slot
        for (let i = 0; i < this.maxSlots; i++) {
            if (!this.grid[i]) {
                this.grid[i] = { ...item, amount: item.amount || 1 };
                this._updateSlotUI(i);
                EventBus.emit(EVENTS.ITEM_ADDED, { item: this.grid[i], slot: i });
                return i;
            }
        }

        return -1; // Full
    }

    removeItem(slot, amount = 1) {
        if (!this.grid[slot]) return null;
        const item = this.grid[slot];

        if (item.stackable && item.amount > amount) {
            item.amount -= amount;
            this._updateSlotUI(slot);
            EventBus.emit(EVENTS.ITEM_REMOVED, { item, slot, amount });
            return { ...item, amount };
        } else {
            this.grid[slot] = null;
            this._updateSlotUI(slot);
            EventBus.emit(EVENTS.ITEM_REMOVED, { item, slot });
            return item;
        }
    }

    useItem(slot, player) {
        const item = this.grid[slot];
        if (!item) return false;

        const used = this._applyItemEffect(item, player);
        if (used) {
            AudioEngine.play('pickup');
            this.removeItem(slot, 1);
        }
        return used;
    }

    _applyItemEffect(item, player) {
        if (!player) return false;

        switch (item.id) {
            case 'medkit_small':
                if (player.health >= player.maxHealth) return false;
                player.heal(40);
                EventBus.emit(EVENTS.SHOW_NOTIFICATION, { text: '+40 HP', type: 'success' });
                return true;
            case 'medkit_large':
                if (player.health >= player.maxHealth) return false;
                player.heal(80);
                EventBus.emit(EVENTS.SHOW_NOTIFICATION, { text: '+80 HP', type: 'success' });
                return true;
            case 'bandage':
                player.heal(20);
                EventBus.emit(EVENTS.SHOW_NOTIFICATION, { text: '+20 HP (Bandage)', type: 'success' });
                return true;
            case 'painkiller':
                player.heal(15);
                player.effects.painReduction = { timer: 30 };
                EventBus.emit(EVENTS.SHOW_NOTIFICATION, { text: '💊 Painkillers taken - 30s effect', type: 'success' });
                return true;
            case 'armor_shard':
                player.addArmor(20);
                return true;
            case 'armor_vest':
                player.addArmor(50);
                return true;
            case 'energy_drink':
                player.stamina = player.stamina + 50;
                EventBus.emit(EVENTS.SHOW_NOTIFICATION, { text: '⚡ Energy drink - Stamina restored!', type: 'success' });
                return true;
            case 'ammo':
                if (player.activeWeapon) {
                    player.activeWeapon.addAmmo(item.amount || 30);
                    EventBus.emit(EVENTS.SHOW_NOTIFICATION, { text: `Ammo +${item.amount || 30}`, type: 'info' });
                }
                return true;
            case 'frag_grenade':
                player.grenades.frag = Math.min(6, player.grenades.frag + 1);
                return true;
            case 'smoke_grenade':
                player.grenades.smoke = Math.min(4, player.grenades.smoke + 1);
                return true;
            case 'flash_grenade':
                player.grenades.flash = Math.min(4, player.grenades.flash + 1);
                return true;
            case 'molotov':
                player.grenades.molotov = Math.min(3, player.grenades.molotov + 1);
                return true;
            case 'night_vision':
                player.nightVisionActive = !player.nightVisionActive;
                EventBus.emit(EVENTS.SHOW_NOTIFICATION, {
                    text: player.nightVisionActive ? '🌙 Night vision ON' : 'Night vision OFF',
                    type: 'info'
                });
                return false; // Don't consume
            case 'gas_mask':
                player.effects.gasMask = { permanent: true };
                EventBus.emit(EVENTS.SHOW_NOTIFICATION, { text: '🎭 Gas mask equipped', type: 'success' });
                return true;
            default:
                return false;
        }
    }

    _onSlotClick(slot) {
        if (!this.grid[slot]) return;
        // Use item
        this.useItem(slot, window._gameRef?.player);
    }

    _onSlotRightClick(slot) {
        if (!this.grid[slot]) return;
        // Drop item (visual feedback)
        this.removeItem(slot);
        EventBus.emit(EVENTS.SHOW_NOTIFICATION, { text: 'Item dropped', type: 'info' });
    }

    _updateSlotUI(index) {
        const slotEl = document.querySelector(`[data-slot="${index}"]`);
        if (!slotEl) return;
        const item = this.grid[index];

        if (!item) {
            slotEl.innerHTML = '';
            slotEl.className = 'inv-slot';
        } else {
            const rarity = item.rarity || 'common';
            slotEl.className = `inv-slot filled ${rarity}`;
            slotEl.innerHTML = `
        <span class="item-icon">${item.icon || '📦'}</span>
        ${item.stackable ? `<span class="item-count">x${item.amount}</span>` : ''}
        ${item.durability !== undefined ? `
          <div class="item-durability">
            <div class="item-durability-fill ${item.durability < 33 ? 'low' : item.durability < 66 ? 'medium' : ''}" 
                 style="width:${item.durability}%"></div>
          </div>` : ''}
      `;
        }
    }

    _showTooltip(event, slot) {
        const item = this.grid[slot];
        if (!item) return;

        let tooltip = document.getElementById('item-tooltip-el');
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.id = 'item-tooltip-el';
            tooltip.className = 'item-tooltip';
            document.body.appendChild(tooltip);
        }

        const rarityColors = { common: 'rgba(255,255,255,0.6)', rare: '#4488ff', epic: '#cc44ff', legendary: '#ffd700' };
        const rarity = item.rarity || 'common';

        tooltip.innerHTML = `
      <div class="tooltip-name" style="color:${rarityColors[rarity]}">${item.icon || ''} ${item.name}</div>
      <div class="tooltip-rarity rarity-${rarity}">${(item.rarity || 'COMMON').toUpperCase()}</div>
      <div class="tooltip-desc">${item.description || ''}</div>
      ${item.stats ? `<div class="tooltip-stats">
        ${Object.entries(item.stats).map(([k, v]) => `
          <div class="tooltip-stat"><span>${k}</span><span class="tooltip-stat-value">+${v}</span></div>
        `).join('')}
      </div>` : ''}
    `;

        tooltip.style.display = 'block';
        tooltip.style.left = (event.clientX + 10) + 'px';
        tooltip.style.top = (event.clientY - 20) + 'px';
    }

    _hideTooltip() {
        const tooltip = document.getElementById('item-tooltip-el');
        if (tooltip) tooltip.style.display = 'none';
    }

    open() {
        this.isOpen = true;
        Utils.show('inventory-panel');
        this._refreshUI();
    }

    close() {
        this.isOpen = false;
        Utils.hide('inventory-panel');
        this._hideTooltip();
    }

    _refreshUI() {
        for (let i = 0; i < this.maxSlots; i++) {
            this._updateSlotUI(i);
        }
    }

    toggle(player) {
        this.isOpen ? this.close() : this.open(player);
    }

    isFull() {
        return this.grid.every(slot => slot !== null);
    }

    getItemCount(itemId) {
        return this.grid.reduce((total, slot) => {
            if (slot && slot.id === itemId) return total + (slot.amount || 1);
            return total;
        }, 0);
    }
}
