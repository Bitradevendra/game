/* ====================================================
   WARZONE EXODUS — LOOT SYSTEM
   Item database, spawn, rarity, supply drops
   ==================================================== */

const ITEM_DB = {
    // Health
    medkit_small: { name: 'Medkit', icon: '🩹', category: 'health', rarity: 'common', stackable: true, description: 'Restores 40 HP.' },
    medkit_large: { name: 'Large Medkit', icon: '🏥', category: 'health', rarity: 'rare', stackable: true, description: 'Restores 80 HP.' },
    bandage: { name: 'Bandage', icon: '🩸', category: 'health', rarity: 'common', stackable: true, amount: 3, description: 'Quick 20 HP heal.' },
    painkiller: { name: 'Painkillers', icon: '💊', category: 'health', rarity: 'common', stackable: true, description: '15 HP + 30s pain reduction.' },
    adrenaline_shot: { name: 'Adrenaline Shot', icon: '💉', category: 'health', rarity: 'epic', stackable: false, description: 'Full HP regeneration burst for 5s.' },

    // Armor
    armor_shard: { name: 'Armor Shard', icon: '🛡', category: 'armor', rarity: 'common', stackable: true, amount: 20 },
    armor_vest: { name: 'Armor Vest', icon: '🦺', category: 'armor', rarity: 'rare', amount: 50 },
    helmet: { name: 'Combat Helmet', icon: '⛑', category: 'armor', rarity: 'rare', stats: { headProtection: 40 } },

    // Ammo
    ammo: { name: 'Ammo', icon: '🔋', category: 'ammo', rarity: 'common', stackable: true, amount: 30 },
    ammo_sniper: { name: 'Sniper Ammo', icon: '🎯', category: 'ammo', rarity: 'rare', stackable: true, amount: 10 },
    ammo_heavy: { name: 'Heavy Ammo', icon: '🔴', category: 'ammo', rarity: 'rare', stackable: true, amount: 50 },

    // Grenades
    frag_grenade: { name: 'Frag Grenade', icon: '💣', category: 'grenade', subtype: 'frag', rarity: 'common', stackable: true, amount: 1, description: 'Explodes after 3 seconds.' },
    smoke_grenade: { name: 'Smoke Grenade', icon: '💨', category: 'grenade', subtype: 'smoke', rarity: 'common', stackable: true, amount: 1, description: 'Creates thick smoke screen.' },
    flash_grenade: { name: 'Flashbang', icon: '⚡', category: 'grenade', subtype: 'flash', rarity: 'rare', stackable: true, amount: 1, description: 'Stuns enemies for 3-7 seconds.' },
    molotov: { name: 'Molotov', icon: '🔥', category: 'grenade', subtype: 'molotov', rarity: 'rare', stackable: true, amount: 1, description: 'Sets area on fire for 8 seconds.' },

    // Special equipment
    night_vision: { name: 'Night Vision Goggles', icon: '👓', category: 'equipment', rarity: 'epic', description: 'See in the dark.' },
    gas_mask: { name: 'Gas Mask', icon: '🎭', category: 'equipment', rarity: 'epic', description: 'Protects from smoke and gas.' },
    energy_drink: { name: 'Energy Drink', icon: '🥤', category: 'consumable', rarity: 'common', stackable: true, amount: 1, description: 'Restores 50 stamina.' },

    // Intel (story collectibles)
    intel_1: { name: 'Military Orders', icon: '📄', category: 'intel', rarity: 'epic', description: 'Classified military documents...' },
    intel_2: { name: 'Enemy Map', icon: '🗺', category: 'intel', rarity: 'rare', description: 'Shows enemy positions.' },
    treasure_map: { name: 'Treasure Map', icon: '🗺', category: 'quest', rarity: 'legendary', description: 'Leads to buried treasure...' },

    // Weapon parts (for crafting)
    weapon_parts: { name: 'Weapon Parts', icon: '🔩', category: 'crafting', rarity: 'common', stackable: true, amount: 1 },
    explosives: { name: 'Explosives', icon: '💥', category: 'crafting', rarity: 'rare', stackable: true, amount: 1 }
};

class LootSystem {
    constructor(scene) {
        this.scene = scene;
        this.lootMeshes = new Map(); // id -> { mesh, item, position }
        this.lootId = 0;
        this.supplyDropCount = 0;
        this.supplyDropTimer = C.SUPPLY_DROP_INTERVAL;
    }

    spawnLoot(itemId, position, rarity = null) {
        const itemDef = ITEM_DB[itemId];
        if (!itemDef) {
            console.warn('LootSystem: Unknown item', itemId);
            return null;
        }

        const id = `loot_${++this.lootId}`;
        const item = { id: itemId, ...itemDef, rarity: rarity || itemDef.rarity || Utils.randomRarity() };

        // Create 3D mesh
        const mesh = this._createLootMesh(item, position);

        this.lootMeshes.set(id, { mesh, item, position: position.clone(), id });
        return id;
    }

    _createLootMesh(item, position) {
        const rarityColors = {
            common: 0x888888, rare: 0x3366ff,
            epic: 0x9933ff, legendary: 0xffaa00
        };
        const color = rarityColors[item.rarity] || rarityColors.common;

        // Icon-based geometry
        let geo;
        switch (item.category) {
            case 'health': geo = new THREE.SphereGeometry(0.25, 6, 6); break;
            case 'armor': geo = new THREE.BoxGeometry(0.4, 0.35, 0.1); break;
            case 'ammo': geo = new THREE.CylinderGeometry(0.15, 0.15, 0.4, 6); break;
            case 'grenade': geo = new THREE.SphereGeometry(0.18, 6, 6); break;
            case 'equipment': geo = new THREE.BoxGeometry(0.35, 0.2, 0.35); break;
            default: geo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
        }

        const mat = new THREE.MeshBasicMaterial({ color });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(position);
        mesh.rotation.y = Math.random() * Math.PI;

        // Glow for rare+ items
        if (item.rarity !== 'common') {
            const light = new THREE.PointLight(color, 0.8, 4);
            mesh.add(light);
        }

        // Floating animation tag
        mesh.userData.floatPhase = Math.random() * Math.PI * 2;
        mesh.userData.baseY = position.y;

        this.scene.add(mesh);
        return mesh;
    }

    spawnRandomLoot(position, count = 2) {
        const items = Object.keys(ITEM_DB);
        const results = [];

        for (let i = 0; i < count; i++) {
            const roll = Math.random() * 100;
            let id;
            if (roll < 3) id = Utils.randomElement(['night_vision', 'gas_mask', 'treasure_map']);
            else if (roll < 15) id = Utils.randomElement(['medkit_large', 'flash_grenade', 'molotov', 'armor_vest']);
            else if (roll < 40) id = Utils.randomElement(['medkit_small', 'bandage', 'frag_grenade', 'armor_shard']);
            else id = Utils.randomElement(['ammo', 'ammo', 'bandage', 'ammo', 'weapon_parts']);

            const spawnPos = position.clone().add(new THREE.Vector3(
                Utils.randomInRange(-1.5, 1.5), 0.5, Utils.randomInRange(-1.5, 1.5)
            ));
            results.push(this.spawnLoot(id, spawnPos));
        }

        return results;
    }

    checkPickup(playerPos, interactPressed, inventory) {
        let nearest = null;
        let minDist = 2.5; // pickup radius

        for (const [id, loot] of this.lootMeshes) {
            const dist = playerPos.distanceTo(loot.position);
            if (dist < minDist) {
                nearest = { id, ...loot };
                minDist = dist;
            }
        }

        if (nearest) {
            // Show prompt
            const promptEl = document.getElementById('interact-prompt');
            const actionEl = document.getElementById('interact-action-text');
            if (promptEl && actionEl) {
                promptEl.classList.remove('hidden');
                const rarity = nearest.item.rarity?.toUpperCase() || 'COMMON';
                actionEl.textContent = `Pick up ${rarity} ${nearest.item.name}`;
            }

            if (interactPressed) {
                this._pickup(nearest.id, inventory);
                return nearest.item;
            }
        } else {
            document.getElementById('interact-prompt')?.classList.add('hidden');
        }

        return null;
    }

    _pickup(id, inventory) {
        const loot = this.lootMeshes.get(id);
        if (!loot) return;

        const added = inventory.addItem(loot.item);
        if (added === -1) {
            EventBus.emit(EVENTS.SHOW_NOTIFICATION, { text: '⚠ Inventory full!', type: 'warning' });
            return;
        }

        AudioEngine.play('pickup');
        EventBus.emit(EVENTS.LOOT_PICKED_UP, loot.item);
        EventBus.emit(EVENTS.SHOW_NOTIFICATION, {
            text: `Picked up: ${loot.item.icon} ${loot.item.name}`,
            type: loot.item.rarity === 'legendary' ? 'gold' : 'info'
        });

        this.scene.remove(loot.mesh);
        this.lootMeshes.delete(id);
        document.getElementById('interact-prompt')?.classList.add('hidden');
    }

    // Supply drop
    updateSupplyDrop(dt, player, inventory) {
        this.supplyDropTimer -= dt;
        if (this.supplyDropTimer <= 0 && this.supplyDropCount < C.SUPPLY_DROP_COUNT) {
            this.supplyDropTimer = C.SUPPLY_DROP_INTERVAL;
            this.supplyDropCount++;
            this._spawnSupplyDrop(player.position);
        }
    }

    _spawnSupplyDrop(playerPos) {
        // Drop near player but not too near
        const angle = Math.random() * Math.PI * 2;
        const dist = Utils.randomInRange(30, 80);
        const dropPos = new THREE.Vector3(
            playerPos.x + Math.cos(angle) * dist,
            0.5,
            playerPos.z + Math.sin(angle) * dist
        );

        // Visual: crate with marker
        const crateGeo = new THREE.BoxGeometry(1.5, 1.5, 1.5);
        const crate = new THREE.Mesh(crateGeo, new THREE.MeshBasicMaterial({ color: 0xff4400 }));
        crate.position.copy(dropPos);
        this.scene.add(crate);

        // Beacon light
        const light = new THREE.PointLight(0xff4400, 2, 20);
        light.position.copy(dropPos).add(new THREE.Vector3(0, 5, 0));
        this.scene.add(light);

        // Spawn legendary+ items
        this.spawnLoot('medkit_large', dropPos.clone().add(new THREE.Vector3(0, 1, 0)), 'legendary');
        this.spawnLoot('armor_vest', dropPos.clone().add(new THREE.Vector3(0.5, 1, 0)), 'epic');
        this.spawnLoot('ammo', dropPos.clone().add(new THREE.Vector3(-0.5, 1, 0)), 'rare');

        EventBus.emit(EVENTS.SUPPLY_DROP_LANDED, { position: dropPos });
        EventBus.emit(EVENTS.SHOW_NOTIFICATION, {
            text: `📦 Supply drop landed! ${Math.round(dist)}m ${angle > Math.PI ? 'West' : 'East'}`,
            type: 'gold'
        });
        AudioEngine.play('explosion', 0.6);

        // Remove crate after 60 seconds
        setTimeout(() => {
            if (crate.parent) this.scene.remove(crate);
            if (light.parent) this.scene.remove(light);
        }, 60000);
    }

    update(dt) {
        // Animate floating loot
        const t = Date.now() * 0.002;
        for (const [id, loot] of this.lootMeshes) {
            if (loot.mesh) {
                loot.mesh.position.y = loot.mesh.userData.baseY + Math.sin(t + loot.mesh.userData.floatPhase) * 0.2;
                loot.mesh.rotation.y += dt * 1.5;
            }
        }
    }

    clear() {
        for (const [id, loot] of this.lootMeshes) {
            if (loot.mesh && loot.mesh.parent) this.scene.remove(loot.mesh);
        }
        this.lootMeshes.clear();
    }
}
