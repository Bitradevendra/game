/* ====================================================
   WARZONE EXODUS — VEHICLE SYSTEM
   Driveable vehicles with physics and combat
   ==================================================== */

class Vehicle {
    constructor(scene, type = 'JEEP') {
        this.scene = scene;
        this.type = type;

        const configs = {
            JEEP: { speed: 18, armor: 30, turnRate: 2.0, fuelMax: 100, icon: '🚗', color: 0x445533 },
            ARMORED_TRUCK: { speed: 10, armor: 200, turnRate: 0.8, fuelMax: 80, icon: '🚛', color: 0x444444 },
            MOTORCYCLE: { speed: 25, armor: 10, turnRate: 2.5, fuelMax: 60, icon: '🏍', color: 0x222222 },
            HELICOPTER: { speed: 20, armor: 80, turnRate: 1.5, fuelMax: 120, icon: '🚁', color: 0x334455 }
        };

        const conf = configs[type] || configs.JEEP;
        this.maxSpeed = conf.speed;
        this.armor = conf.armor;
        this.maxArmor = conf.armor;
        this.turnRate = conf.turnRate;
        this.fuel = conf.fuelMax;
        this.maxFuel = conf.fuelMax;
        this.icon = conf.icon;
        this.isFlying = type === 'HELICOPTER';

        this.position = new THREE.Vector3();
        this.velocity = new THREE.Vector3();
        this.yaw = 0;
        this.speed = 0;
        this.isDestroyed = false;
        this.hasMountedGun = type === 'ARMORED_TRUCK';
        this.gunCooldown = 0;

        this.passengers = [];
        this.driver = null;
        this.isOccupied = false;

        this._createMesh(conf.color);
    }

    _createMesh(color) {
        const group = new THREE.Group();

        if (this.isFlying) {
            this._buildHelicopter(group, color);
        } else if (this.type === 'MOTORCYCLE') {
            this._buildMotorcycle(group, color);
        } else {
            this._buildCar(group, color);
        }

        // Damage indicator lights
        this.damageLight = new THREE.PointLight(0xff0000, 0, 5);
        this.damageLight.position.y = 1;
        group.add(this.damageLight);

        this.mesh = group;
        this.scene.add(this.mesh);
    }

    _buildCar(group, color) {
        // Body
        const bodyGeo = new THREE.BoxGeometry(2, 1, 4);
        const body = new THREE.Mesh(bodyGeo, new THREE.MeshLambertMaterial({ color }));
        body.position.y = 0.8;
        body.castShadow = true;
        group.add(body);

        // Cabin
        const cabinGeo = new THREE.BoxGeometry(1.8, 0.8, 2);
        const cabin = new THREE.Mesh(cabinGeo, new THREE.MeshLambertMaterial({ color: Utils.brightness(color, 0.8) }));
        cabin.position.set(0, 1.7, 0.2);
        group.add(cabin);

        // Wheels
        const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 12);
        const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
        const wheelPositions = [
            [-1.1, 0.4, -1.4], [1.1, 0.4, -1.4],
            [-1.1, 0.4, 1.4], [1.1, 0.4, 1.4]
        ];
        this.wheels = [];
        wheelPositions.forEach(pos => {
            const wheel = new THREE.Mesh(wheelGeo, wheelMat);
            wheel.position.set(...pos);
            wheel.rotation.z = Math.PI / 2;
            group.add(wheel);
            this.wheels.push(wheel);
        });

        // Headlights
        const headlightMat = new THREE.MeshBasicMaterial({ color: 0xffffcc });
        [[-0.5, 0, -2], [0.5, 0, -2]].forEach(pos => {
            const light = new THREE.Mesh(new THREE.CircleGeometry(0.15, 8), headlightMat);
            light.position.set(...pos);
            light.rotation.y = Math.PI;
            group.add(light);
        });

        // Mounted gun for armored truck
        if (this.hasMountedGun) {
            const gunBase = new THREE.Mesh(
                new THREE.CylinderGeometry(0.3, 0.3, 0.5, 8),
                new THREE.MeshLambertMaterial({ color: 0x333333 })
            );
            gunBase.position.set(0, 2.2, 0);

            const barrel = new THREE.Mesh(
                new THREE.CylinderGeometry(0.08, 0.08, 1.5, 6),
                new THREE.MeshLambertMaterial({ color: 0x444444 })
            );
            barrel.rotation.x = -Math.PI / 2;
            barrel.position.z = -0.8;
            gunBase.add(barrel);

            group.add(gunBase);
            this.mountedGun = gunBase;
        }
    }

    _buildMotorcycle(group, color) {
        // Frame
        const frameGeo = new THREE.BoxGeometry(0.4, 0.7, 2.2);
        const frame = new THREE.Mesh(frameGeo, new THREE.MeshLambertMaterial({ color }));
        frame.position.y = 0.8;
        group.add(frame);

        // Wheels (just 2)
        const wheelGeo = new THREE.TorusGeometry(0.4, 0.12, 8, 12);
        const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
        this.wheels = [];
        [[-1.0, 0], [1.0, 0]].forEach(([z, x]) => {
            const w = new THREE.Mesh(wheelGeo, wheelMat);
            w.position.set(x, 0.4, z);
            w.rotation.x = Math.PI / 2;
            group.add(w);
            this.wheels.push(w);
        });

        // Handlebars
        const barGeo = new THREE.BoxGeometry(0.9, 0.08, 0.08);
        const bar = new THREE.Mesh(barGeo, new THREE.MeshLambertMaterial({ color: 0x888888 }));
        bar.position.set(0, 1.3, -0.8);
        group.add(bar);
    }

    _buildHelicopter(group, color) {
        // Fuselage
        const fuselageGeo = new THREE.CylinderGeometry(0.6, 0.4, 3, 10);
        fuselageGeo.rotateZ(Math.PI / 2);
        const fuselage = new THREE.Mesh(fuselageGeo, new THREE.MeshLambertMaterial({ color }));
        fuselage.position.y = 1.5;
        group.add(fuselage);

        // Tail
        const tailGeo = new THREE.BoxGeometry(0.2, 0.3, 2.5);
        const tail = new THREE.Mesh(tailGeo, new THREE.MeshLambertMaterial({ color }));
        tail.position.set(0, 1.3, 2.0);
        group.add(tail);

        // Main rotor
        const rotorGeo = new THREE.BoxGeometry(6, 0.05, 0.2);
        const rotorMat = new THREE.MeshBasicMaterial({ color: 0x888888, transparent: true, opacity: 0.7 });
        this.mainRotor = new THREE.Mesh(rotorGeo, rotorMat);
        this.mainRotor.position.y = 2.2;
        group.add(this.mainRotor);

        // Tail rotor
        const tRotorGeo = new THREE.BoxGeometry(1.5, 0.05, 0.15);
        this.tailRotor = new THREE.Mesh(tRotorGeo, rotorMat);
        this.tailRotor.position.set(0.15, 1.4, 3.2);
        this.tailRotor.rotation.z = Math.PI / 2;
        group.add(this.tailRotor);

        // Skids
        const skidGeo = new THREE.BoxGeometry(0.1, 0.1, 2.5);
        const skidMat = new THREE.MeshLambertMaterial({ color: 0x555555 });
        [-0.7, 0.7].forEach(x => {
            const skid = new THREE.Mesh(skidGeo, skidMat);
            skid.position.set(x, 0.5, 0);
            group.add(skid);
        });

        // Propeller blur disk (visual only)
        const blurGeo = new THREE.CircleGeometry(3, 32);
        const blurMat = new THREE.MeshBasicMaterial({
            color: 0xaaaaaa, transparent: true, opacity: 0.15, side: THREE.DoubleSide
        });
        const blur = new THREE.Mesh(blurGeo, blurMat);
        blur.position.y = 2.2;
        group.add(blur);
        this.rotorBlur = blur;
    }

    driveInput(input, dt) {
        if (this.isDestroyed || this.fuel <= 0) return;

        const accel = input.forward ? 1 : (input.back ? -0.5 : 0);
        const brake = input.back && this.speed > 0 ? 1 : 0;
        const turn = input.right ? 1 : (input.left ? -1 : 0);
        const sprint = input.sprint;

        const maxSpd = sprint ? this.maxSpeed * 1.4 : this.maxSpeed;
        const acceleration = sprint ? 15 : 10;

        // Speed update
        if (accel !== 0) {
            this.speed += accel * acceleration * dt;
        } else {
            this.speed *= 0.9; // Engine braking
        }

        if (brake) this.speed *= 0.85;

        this.speed = Utils.clamp(this.speed, -this.maxSpeed * 0.5, maxSpd);

        // Turn based on speed
        if (Math.abs(this.speed) > 0.5) {
            this.yaw -= turn * this.turnRate * dt * Math.sign(this.speed);
        }

        // Helicopter altitude control
        if (this.isFlying) {
            if (input.jump) this.velocity.y += 12 * dt;
            else if (input.crouch) this.velocity.y -= 8 * dt;
            else this.velocity.y *= 0.95;
        }

        // Move forward/back
        this.velocity.x = -Math.sin(this.yaw) * this.speed;
        this.velocity.z = -Math.cos(this.yaw) * this.speed;

        this.position.addScaledVector(this.velocity, dt);

        // Ground constraint for non-flying
        if (!this.isFlying) {
            this.position.y = 0.5; // Simple ground lock
        } else {
            this.position.y = Math.max(3, this.position.y);
        }

        // Fuel consumption
        const fuelUse = Math.abs(this.speed) * 0.02 * dt + (this.isFlying ? 0.05 * dt : 0);
        this.fuel = Math.max(0, this.fuel - fuelUse);

        // Sync mesh
        if (this.mesh) {
            this.mesh.position.copy(this.position);
            this.mesh.rotation.y = this.yaw;
        }

        // Spin rotors
        if (this.mainRotor) this.mainRotor.rotation.y += dt * (8 + Math.abs(this.speed) * 2);
        if (this.tailRotor) this.tailRotor.rotation.x += dt * 12;

        // Spin wheels relative to speed
        if (this.wheels) {
            this.wheels.forEach(w => { w.rotation.y += this.speed * dt * 2; });
        }

        // Damage light when low armor
        if (this.damageLight) {
            this.damageLight.intensity = this.armor < this.maxArmor * 0.3 ?
                0.5 + Math.sin(Date.now() * 0.01) * 0.5 : 0;
        }
    }

    takeDamage(amount) {
        if (this.isDestroyed) return;
        this.armor -= amount;
        if (this.armor <= 0) {
            this._destroy();
        }
    }

    _destroy() {
        this.isDestroyed = true;
        EventBus.emit(EVENTS.EXPLOSION, { position: this.position.clone(), size: 2.0 });
        EventBus.emit(EVENTS.SHOW_NOTIFICATION, { text: '💥 Vehicle destroyed!', type: 'danger' });

        // Eject passengers
        this.passengers.forEach(p => {
            if (p && p.exitVehicle) {
                p.takeDamage(30, this, 'explosion');
                p.exitVehicle();
            }
        });

        // Visual: blacken mesh
        if (this.mesh) {
            this.mesh.traverse(obj => {
                if (obj.material) obj.material.color.setHex(0x111111);
            });
        }

        setTimeout(() => {
            if (this.scene && this.mesh) this.scene.remove(this.mesh);
        }, 15000);
    }

    refuel(amount) {
        this.fuel = Math.min(this.maxFuel, this.fuel + amount);
        EventBus.emit(EVENTS.SHOW_NOTIFICATION, {
            text: `⛽ Refueled +${amount}L (${Math.round(this.fuel)}/${this.maxFuel})`,
            type: 'success'
        });
    }

    fireWeapon() {
        if (this.gunCooldown > 0 || !this.hasMountedGun) return null;
        this.gunCooldown = 0.15;

        const dir = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
        return {
            from: this.position.clone().add(new THREE.Vector3(0, 2.2, 0)),
            direction: dir,
            damage: 20,
            weapon: 'VEHICLE_GUN'
        };
    }

    update(dt) {
        this.gunCooldown = Math.max(0, this.gunCooldown - dt);
    }

    getInteractPrompt() {
        if (this.isDestroyed) return null;
        if (this.fuel <= 0) return `${this.icon} ${this.type} (No Fuel)`;
        return `[F] Enter ${this.icon} ${this.type}`;
    }
}

// ==================== VEHICLE MANAGER ====================
class VehicleManager {
    constructor(scene) {
        this.scene = scene;
        this.vehicles = [];
        this.fuelStations = [];
    }

    spawnVehicle(type, x, z) {
        const vehicle = new Vehicle(this.scene, type);
        vehicle.position.set(x, 0.5, z);
        if (vehicle.mesh) vehicle.mesh.position.copy(vehicle.position);
        this.vehicles.push(vehicle);
        return vehicle;
    }

    spawnVehiclesForMission(world) {
        const spawnPoints = world.getEnemySpawnPoints();
        const types = ['JEEP', 'JEEP', 'ARMORED_TRUCK', 'MOTORCYCLE', 'MOTORCYCLE'];

        types.forEach((type, i) => {
            const pt = spawnPoints[i % spawnPoints.length];
            if (pt) this.spawnVehicle(type, pt.x + Utils.randomInRange(-5, 5), pt.z + Utils.randomInRange(-5, 5));
        });

        // Rare helicopter
        if (Math.random() < 0.3) {
            const pt = spawnPoints[0] || { x: 0, z: 0 };
            this.spawnVehicle('HELICOPTER', pt.x, pt.z - 30);
        }
    }

    getNearestEmpty(playerPos, maxDist = 8) {
        let nearest = null, minDist = Infinity;
        for (const v of this.vehicles) {
            if (v.isOccupied || v.isDestroyed) continue;
            const d = v.position.distanceTo(playerPos);
            if (d < maxDist && d < minDist) {
                nearest = v;
                minDist = d;
            }
        }
        return nearest;
    }

    update(dt) {
        for (const v of this.vehicles) {
            v.update(dt);
        }
    }
}
