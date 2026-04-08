/* ====================================================
   WARZONE EXODUS — PARTICLE ENGINE
   3D particle system using Three.js BufferGeometry
   ==================================================== */

class ParticleEngine {
    constructor(scene) {
        this.scene = scene;
        this.systems = [];
        this.bulletHoles = [];
        this.maxBulletHoles = C.MAX_BULLET_HOLES;

        // Pre-built geometries for performance
        this._initGeometryPool();
    }

    _initGeometryPool() {
        // Shared materials
        this.materials = {
            spark: new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true }),
            blood: new THREE.MeshBasicMaterial({ color: 0xaa0000, transparent: true }),
            smoke: new THREE.MeshBasicMaterial({ color: 0x888888, transparent: true, opacity: 0.6 }),
            debris: new THREE.MeshBasicMaterial({ color: 0x665544, transparent: true }),
            fire: new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true }),
            snow: new THREE.MeshBasicMaterial({ color: 0xeeeeff, transparent: true }),
            rain: new THREE.MeshBasicMaterial({ color: 0x6688aa, transparent: true, opacity: 0.6 }),
            muzzle: new THREE.MeshBasicMaterial({ color: 0xffee00, transparent: true }),
            bulletTrace: new THREE.MeshBasicMaterial({ color: 0xffff88, transparent: true, opacity: 0.8 }),
            explosion: new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true })
        };

        this.baseGeo = new THREE.SphereGeometry(0.05, 4, 4);
        this.squareGeo = new THREE.PlaneGeometry(0.1, 0.1);
        this.lineGeo = new THREE.BoxGeometry(0.04, 0.04, 1);
    }

    // Create a burst of particles at position
    createExplosion(position, size = 1.0, color = 0xff6600) {
        const count = Math.floor(30 * size);
        const particles = [];

        for (let i = 0; i < count; i++) {
            const mat = this.materials.explosion.clone();
            mat.color.setHex(Utils.lerpColor(color, 0xff2200, Math.random()));
            mat.opacity = 1;

            const mesh = new THREE.Mesh(this.baseGeo, mat);
            mesh.position.copy(position);

            const speed = Utils.randomInRange(3, 12) * size;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;

            mesh.userData = {
                velocity: new THREE.Vector3(
                    Math.sin(phi) * Math.cos(theta) * speed,
                    Math.abs(Math.cos(phi)) * speed * 1.5,
                    Math.sin(phi) * Math.sin(theta) * speed
                ),
                life: 1.0,
                decay: Utils.randomInRange(0.015, 0.04),
                gravity: true,
                type: 'explosion'
            };

            mesh.scale.setScalar(Utils.randomInRange(0.5, 2.5) * size);
            this.scene.add(mesh);
            particles.push(mesh);
        }

        // Smoke puffs
        for (let i = 0; i < Math.floor(8 * size); i++) {
            const mat = this.materials.smoke.clone();
            mat.opacity = 0.7;
            const mesh = new THREE.Mesh(
                new THREE.SphereGeometry(Utils.randomInRange(0.3, 1.0) * size, 6, 6),
                mat
            );
            mesh.position.copy(position).add(new THREE.Vector3(
                Utils.randomInRange(-1, 1) * size,
                Utils.randomInRange(0, 2) * size,
                Utils.randomInRange(-1, 1) * size
            ));
            mesh.userData = {
                velocity: new THREE.Vector3(
                    Utils.randomInRange(-1, 1),
                    Utils.randomInRange(1, 3),
                    Utils.randomInRange(-1, 1)
                ),
                life: 1.0,
                decay: Utils.randomInRange(0.005, 0.015),
                gravity: false,
                expandRate: Utils.randomInRange(0.01, 0.03) * size,
                type: 'smoke'
            };
            this.scene.add(mesh);
            particles.push(mesh);
        }

        this.systems.push({ particles, startTime: Date.now() });
        return particles;
    }

    createMuzzleFlash(position, direction) {
        const particles = [];

        // Core flash
        const flashMat = this.materials.muzzle.clone();
        flashMat.opacity = 1;
        const flash = new THREE.Mesh(
            new THREE.SphereGeometry(0.15, 6, 6),
            flashMat
        );
        flash.position.copy(position);
        flash.userData = {
            life: 1.0, decay: 0.25, velocity: new THREE.Vector3(), gravity: false,
            expandRate: 0.02, type: 'muzzle'
        };
        this.scene.add(flash);
        particles.push(flash);

        // Sparks
        for (let i = 0; i < 8; i++) {
            const mat = this.materials.spark.clone();
            const spark = new THREE.Mesh(this.baseGeo, mat);
            spark.position.copy(position);
            const spread = 0.4;
            spark.userData = {
                velocity: new THREE.Vector3(
                    direction.x * 6 + Utils.randomInRange(-spread, spread),
                    Utils.randomInRange(-spread, spread),
                    direction.z * 6 + Utils.randomInRange(-spread, spread)
                ),
                life: 1.0, decay: Utils.randomInRange(0.08, 0.15),
                gravity: true, type: 'spark'
            };
            this.scene.add(spark);
            particles.push(spark);
        }

        this.systems.push({ particles, startTime: Date.now() });
    }

    createBloodSplatter(position, direction) {
        const particles = [];
        const count = Utils.randomInt(6, 14);

        for (let i = 0; i < count; i++) {
            const mat = this.materials.blood.clone();
            mat.color.setHex(Utils.randomElement([0xaa0000, 0xcc0000, 0x880000]));
            mat.opacity = 1;

            const mesh = new THREE.Mesh(this.baseGeo, mat);
            mesh.position.copy(position);

            const speed = Utils.randomInRange(1, 5);
            mesh.userData = {
                velocity: new THREE.Vector3(
                    direction.x * speed + Utils.randomInRange(-2, 2),
                    Utils.randomInRange(0, 4),
                    direction.z * speed + Utils.randomInRange(-2, 2)
                ),
                life: 1.0, decay: Utils.randomInRange(0.03, 0.08),
                gravity: true, type: 'blood'
            };
            mesh.scale.setScalar(Utils.randomInRange(0.5, 2));
            this.scene.add(mesh);
            particles.push(mesh);
        }

        this.systems.push({ particles, startTime: Date.now() });
    }

    createBulletTracer(from, to) {
        const mat = this.materials.bulletTrace.clone();
        const mesh = new THREE.Mesh(this.lineGeo, mat);

        const dir = to.clone().sub(from);
        const len = dir.length();
        mesh.scale.z = len;
        mesh.position.copy(from).add(to).multiplyScalar(0.5);
        mesh.lookAt(to);

        mesh.userData = {
            life: 1.0, decay: 0.12, velocity: new THREE.Vector3(),
            gravity: false, type: 'tracer'
        };

        this.scene.add(mesh);
        this.systems.push({ particles: [mesh], startTime: Date.now() });
    }

    createDebrisCloud(position, size = 1.0) {
        const particles = [];
        const count = Math.floor(15 * size);

        for (let i = 0; i < count; i++) {
            const mat = this.materials.debris.clone();
            mat.color.setHex(Utils.randomElement([0x665544, 0x554433, 0x887766]));
            const mesh = new THREE.Mesh(
                new THREE.BoxGeometry(
                    Utils.randomInRange(0.05, 0.3),
                    Utils.randomInRange(0.05, 0.3),
                    Utils.randomInRange(0.05, 0.3)
                ),
                mat
            );
            mesh.position.copy(position);
            const speed = Utils.randomInRange(2, 8) * size;
            mesh.userData = {
                velocity: new THREE.Vector3(
                    Utils.randomInRange(-1, 1) * speed,
                    Utils.randomInRange(2, 8) * size,
                    Utils.randomInRange(-1, 1) * speed
                ),
                rotVel: new THREE.Vector3(
                    Utils.randomInRange(-5, 5),
                    Utils.randomInRange(-5, 5),
                    Utils.randomInRange(-5, 5)
                ),
                life: 1.0, decay: Utils.randomInRange(0.01, 0.025),
                gravity: true, type: 'debris'
            };
            this.scene.add(mesh);
            particles.push(mesh);
        }

        this.systems.push({ particles, startTime: Date.now() });
    }

    createFireEffect(position, intensity = 1.0) {
        const particles = [];
        const count = Math.floor(20 * intensity);

        for (let i = 0; i < count; i++) {
            const mat = this.materials.fire.clone();
            mat.color.setHex(Utils.randomElement([0xff4400, 0xff8800, 0xffdd00]));
            mat.opacity = 0.9;

            const mesh = new THREE.Mesh(
                new THREE.SphereGeometry(Utils.randomInRange(0.1, 0.4) * intensity, 4, 4),
                mat
            );
            mesh.position.copy(position).add(new THREE.Vector3(
                Utils.randomInRange(-0.5, 0.5) * intensity,
                Utils.randomInRange(0, 0.5),
                Utils.randomInRange(-0.5, 0.5) * intensity
            ));
            mesh.userData = {
                velocity: new THREE.Vector3(
                    Utils.randomInRange(-0.5, 0.5),
                    Utils.randomInRange(1, 4) * intensity,
                    Utils.randomInRange(-0.5, 0.5)
                ),
                life: 1.0, decay: Utils.randomInRange(0.02, 0.05),
                expandRate: -0.01, gravity: false,
                type: 'fire'
            };
            this.scene.add(mesh);
            particles.push(mesh);
        }

        this.systems.push({ particles, startTime: Date.now() });
    }

    createRainParticles(camera, count = 500) {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);

        for (let i = 0; i < count; i++) {
            positions[i * 3] = Utils.randomInRange(-30, 30);
            positions[i * 3 + 1] = Utils.randomInRange(-5, 20);
            positions[i * 3 + 2] = Utils.randomInRange(-30, 30);
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const material = new THREE.PointsMaterial({
            color: 0x88aacc,
            size: 0.1,
            transparent: true,
            opacity: 0.6
        });

        const rain = new THREE.Points(geometry, material);
        rain.userData = { type: 'rain', camera, speed: 0.4 };
        this.scene.add(rain);
        return rain;
    }

    addBulletHole(position, normal) {
        if (this.bulletHoles.length >= this.maxBulletHoles) {
            const old = this.bulletHoles.shift();
            this.scene.remove(old);
        }

        const geo = new THREE.PlaneGeometry(0.15, 0.15);
        const mat = new THREE.MeshBasicMaterial({
            color: 0x111111,
            transparent: true,
            opacity: 0.9,
            depthTest: true,
            polygonOffset: true,
            polygonOffsetFactor: -1
        });

        const hole = new THREE.Mesh(geo, mat);
        hole.position.copy(position).add(normal.clone().multiplyScalar(0.01));
        hole.lookAt(position.clone().add(normal));

        this.scene.add(hole);
        this.bulletHoles.push(hole);

        // Fade out over time
        setTimeout(() => {
            if (this.scene && hole.parent) this.scene.remove(hole);
            const idx = this.bulletHoles.indexOf(hole);
            if (idx !== -1) this.bulletHoles.splice(idx, 1);
        }, 30000);
    }

    update(dt) {
        const toRemove = [];

        for (let si = 0; si < this.systems.length; si++) {
            const system = this.systems[si];
            let allDead = true;

            for (let pi = 0; pi < system.particles.length; pi++) {
                const mesh = system.particles[pi];
                const d = mesh.userData;

                if (d.life <= 0) {
                    if (mesh.parent) this.scene.remove(mesh);
                    continue;
                }

                allDead = false;
                d.life -= d.decay;

                // Move
                if (d.velocity) {
                    mesh.position.addScaledVector(d.velocity, dt);
                    if (d.gravity) d.velocity.y += C.GRAVITY * dt * 0.5;
                    d.velocity.multiplyScalar(0.97); // air resistance
                }

                // Rotate debris
                if (d.rotVel) {
                    mesh.rotation.x += d.rotVel.x * dt;
                    mesh.rotation.y += d.rotVel.y * dt;
                    mesh.rotation.z += d.rotVel.z * dt;
                }

                // Scale
                if (d.expandRate) {
                    mesh.scale.addScalar(d.expandRate);
                    if (mesh.scale.x < 0.01) { d.life = 0; continue; }
                }

                // Fade
                if (mesh.material && mesh.material.transparent) {
                    mesh.material.opacity = Math.max(0, d.life);
                }
            }

            // Remove dead particles from scene
            if (allDead) {
                system.particles.forEach(m => { if (m.parent) this.scene.remove(m); });
                toRemove.push(si);
            }
        }

        // Remove dead systems (in reverse)
        for (let i = toRemove.length - 1; i >= 0; i--) {
            this.systems.splice(toRemove[i], 1);
        }
    }

    clear() {
        for (const system of this.systems) {
            system.particles.forEach(m => { if (m.parent) this.scene.remove(m); });
        }
        this.systems = [];
        this.bulletHoles.forEach(h => { if (h.parent) this.scene.remove(h); });
        this.bulletHoles = [];
    }
}
