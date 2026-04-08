/* abilities.js - Special player abilities manager */

class AbilityManager {
    constructor(player, scene, particles) {
        this.player = player;
        this.scene = scene;
        this.particles = particles;
        this.droneActive = false;
        this.droneMesh = null;
        this.droneTimer = 0;

        EventBus.on('airstrike_beacon', this._handleAirstrike.bind(this));
        EventBus.on('drone_deploy', this._handleDrone.bind(this));
        EventBus.on('decoy_deploy', this._handleDecoy.bind(this));
    }

    _handleAirstrike({ position }) {
        // Spawn 5 explosions in a line
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                const pos = position.clone().add(new THREE.Vector3(
                    Utils.randomInRange(-8, 8),
                    0,
                    Utils.randomInRange(-8, 8)
                ));
                if (this.particles) this.particles.createExplosion(pos, 2.5, 0xff4400);
                AudioEngine.play('explosion', 2.0);
                EventBus.emit(EVENTS.EXPLOSION, { position: pos, size: 2.5 });
                EventBus.emit('camera_shake', { intensity: 1.5, duration: 0.8 });
            }, i * 400 + 1500); // delay from beacon
        }
        EventBus.emit(EVENTS.SHOW_NOTIFICATION, { text: '💣 Air strike inbound!', type: 'danger' });
    }

    _handleDrone({ position }) {
        if (this.droneActive) return;
        this.droneActive = true;
        this.droneTimer = C.ABILITIES.DRONE.duration;

        // Drone mesh
        const geo = new THREE.CylinderGeometry(0.3, 0.3, 0.15, 8);
        const mat = new THREE.MeshBasicMaterial({ color: 0x224488 });
        this.droneMesh = new THREE.Mesh(geo, mat);
        this.droneMesh.position.copy(position).add(new THREE.Vector3(0, 10, 0));
        this.scene.add(this.droneMesh);

        // Lights
        const light = new THREE.PointLight(0x0044ff, 1, 20);
        this.droneMesh.add(light);

        EventBus.emit(EVENTS.SHOW_NOTIFICATION, { text: '🚁 Scout drone deployed!', type: 'info' });
        EventBus.emit('drone_active', { drone: this.droneMesh }); // Enemy AI reveals positions
    }

    _handleDecoy({ position }) {
        EventBus.emit(EVENTS.SHOW_NOTIFICATION, { text: '🔮 Decoy deployed!', type: 'info' });
    }

    update(dt, enemies) {
        // Drone patrol
        if (this.droneActive && this.droneMesh) {
            this.droneTimer -= dt;

            // Orbit player
            const t = Date.now() * 0.001;
            const orbitR = 8;
            this.droneMesh.position.set(
                this.player.position.x + Math.cos(t) * orbitR,
                this.player.position.y + 12,
                this.player.position.z + Math.sin(t) * orbitR
            );
            this.droneMesh.rotation.y += dt * 3;

            // Reveal nearby enemies on minimap
            for (const enemy of enemies) {
                if (enemy.isAlive && enemy.position.distanceTo(this.droneMesh.position) < 30) {
                    enemy._revealedByDrone = true;
                }
            }

            if (this.droneTimer <= 0) {
                this.scene.remove(this.droneMesh);
                this.droneMesh = null;
                this.droneActive = false;
                EventBus.emit(EVENTS.SHOW_NOTIFICATION, { text: '🚁 Drone out of battery!', type: 'warning' });
            }
        }
    }
}
