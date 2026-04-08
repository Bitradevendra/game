/* ====================================================
   WARZONE EXODUS — ZONES, WEATHER, DAY/NIGHT
   World systems: zone management, atmosphere, time
   ==================================================== */

// ==================== ZONE MANAGER ====================
class ZoneManager {
    constructor() {
        this.currentZone = C.ZONES[0];
        this.zoneEffects = {};
    }

    setZone(zoneId, scene, renderer) {
        const zone = C.ZONES.find(z => z.id === zoneId);
        if (!zone || zone.id === this.currentZone.id) return;

        this.currentZone = zone;
        this._applyZoneEffects(zone, scene, renderer);
        EventBus.emit(EVENTS.ZONE_ENTERED, zone);
    }

    _applyZoneEffects(zone, scene, renderer) {
        if (zone.fog) {
            const fogColor = parseInt(zone.color.replace('#', '0x'));
            scene.fog = new THREE.FogExp2(fogColor, zone.fog * 0.01);
        }
    }

    getCurrentZone() { return this.currentZone; }
}

// ==================== WEATHER SYSTEM ====================
class WeatherSystem {
    constructor(scene, particles) {
        this.scene = scene;
        this.particles = particles;
        this.currentWeather = 'clear';
        this.targetWeather = 'clear';
        this.transitionProgress = 0;
        this.weatherTimer = 0;
        this.weatherInterval = Utils.randomInRange(60, 180); // seconds
        this.rainMesh = null;
        this.lightningTimer = 0;
        this.windDirection = new THREE.Vector3(1, 0, 0);
        this.windStrength = 0;
        this._lightningFlash = null;
        this._fogPlane = null;
    }

    update(dt) {
        this.weatherTimer += dt;

        // Weather changes
        if (this.weatherTimer >= this.weatherInterval) {
            this.weatherTimer = 0;
            this.weatherInterval = Utils.randomInRange(60, 180);
            this._changeWeather();
        }

        // Transition
        if (this.transitionProgress < 1) {
            this.transitionProgress = Math.min(1, this.transitionProgress + dt / 10);
        }

        const weather = C.WEATHER[this.currentWeather];

        // Rain particles
        if (weather.rain && this.rainMesh) {
            const pos = this.rainMesh.geometry.attributes.position;
            for (let i = 0; i < pos.count; i++) {
                pos.setY(i, pos.getY(i) - 15 * dt);
                if (pos.getY(i) < -5) {
                    pos.setY(i, 20);
                    pos.setX(i, pos.getX(i) + this.windDirection.x * 5 * dt);
                    pos.setZ(i, pos.getZ(i) + this.windDirection.z * 5 * dt);
                }
            }
            pos.needsUpdate = true;
        }

        // Lightning
        if (weather.lightning) {
            this.lightningTimer -= dt;
            if (this.lightningTimer <= 0) {
                this.lightningTimer = Utils.randomInRange(4, 12);
                this._triggerLightning();
            }
        }

        // Wind changes
        this.windDirection.x = Math.sin(Date.now() * 0.0003);
        this.windDirection.z = Math.cos(Date.now() * 0.0002);
        this.windStrength = Math.sin(Date.now() * 0.001) * 0.5 + 0.5;
    }

    _changeWeather() {
        const weatherTypes = Object.keys(C.WEATHER);
        this.targetWeather = Utils.randomElement(weatherTypes);
        console.log('[Weather] Changing to:', this.targetWeather);

        const prevWeather = this.currentWeather;
        this.currentWeather = this.targetWeather;
        this.transitionProgress = 0;

        // Cleanup old effects
        if (this.rainMesh) {
            this.scene.remove(this.rainMesh);
            this.rainMesh = null;
        }

        // Setup new effects
        const weather = C.WEATHER[this.currentWeather];
        if (weather.rain) {
            this._createRain();
        }

        EventBus.emit(EVENTS.WEATHER_CHANGED, this.currentWeather);
        EventBus.emit(EVENTS.SHOW_NOTIFICATION, {
            text: `⛅ Weather: ${this.currentWeather.toUpperCase()}`,
            type: 'info'
        });

        // Sound
        if (this.currentWeather === 'storm') {
            setTimeout(() => AudioEngine.play('thunder'), Utils.randomInRange(500, 3000));
        }
    }

    _createRain() {
        const count = 800;
        const geo = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            positions[i * 3] = Utils.randomInRange(-50, 50);
            positions[i * 3 + 1] = Utils.randomInRange(-5, 25);
            positions[i * 3 + 2] = Utils.randomInRange(-50, 50);
        }
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const mat = new THREE.PointsMaterial({
            color: 0x8899bb, size: 0.15,
            transparent: true, opacity: 0.6
        });
        this.rainMesh = new THREE.Points(geo, mat);
        this.rainMesh.frustumCulled = false;
        this.scene.add(this.rainMesh);
    }

    _triggerLightning() {
        // Flash
        const flash = new THREE.AmbientLight(0xccddff, 3);
        this.scene.add(flash);
        AudioEngine.play('thunder');

        setTimeout(() => {
            this.scene.remove(flash);
        }, 100);

        setTimeout(() => {
            const flash2 = new THREE.AmbientLight(0xccddff, 2);
            this.scene.add(flash2);
            setTimeout(() => this.scene.remove(flash2), 80);
        }, 150);

        EventBus.emit(EVENTS.SHOW_NOTIFICATION, {
            text: '⚡ Lightning strike!',
            type: 'warning'
        });
    }

    setFollowCamera(camera) {
        this.camera = camera;
        // Make rain follow camera position
        if (this.rainMesh) {
            this.rainMesh.position.copy(camera.position);
        }
    }

    updateCameraFollow(camera) {
        if (this.rainMesh) {
            this.rainMesh.position.x = camera.position.x;
            this.rainMesh.position.z = camera.position.z;
        }
    }

    getVisibility() {
        const weather = C.WEATHER[this.currentWeather];
        return weather ? weather.visibility : 1.0;
    }

    getWindStrength() { return this.windStrength; }
    getWindDirection() { return this.windDirection; }
    getCurrentWeather() { return this.currentWeather; }
}

// ==================== DAY/NIGHT CYCLE ====================
class DayNightCycle {
    constructor(scene) {
        this.scene = scene;
        this.time = 0.25; // 0 = midnight, 0.25 = dawn, 0.5 = noon, 0.75 = dusk
        this.dayDuration = C.DAY_DURATION;
        this.isDay = true;
        this.sunLight = null;
        this.moonLight = null;
        this.ambient = null;
    }

    init(sunLight, ambient) {
        this.sunLight = sunLight;
        this.ambient = ambient;

        // Moon light
        this.moonLight = new THREE.DirectionalLight(0x4455aa, 0.3);
        this.scene.add(this.moonLight);
    }

    update(dt) {
        this.time += dt / this.dayDuration;
        if (this.time > 1) {
            this.time -= 1;
            EventBus.emit(EVENTS.DAY_CHANGED, this.time);
        }

        const wasDay = this.isDay;
        this.isDay = this.time > 0.2 && this.time < 0.8;

        if (wasDay !== this.isDay) {
            EventBus.emit(EVENTS.DAY_CHANGED, this.isDay ? 'day' : 'night');
            EventBus.emit(EVENTS.SHOW_NOTIFICATION, {
                text: this.isDay ? '☀ Dawn breaks...' : '🌙 Night falls...',
                type: 'info'
            });
        }

        this._updateLighting();
    }

    _updateLighting() {
        if (!this.sunLight) return;

        // Sun position on arc
        const sunAngle = (this.time - 0.25) * Math.PI * 2;
        const sunX = Math.cos(sunAngle) * 200;
        const sunY = Math.sin(sunAngle) * 200;
        const sunZ = 100;

        this.sunLight.position.set(sunX, sunY, sunZ);

        // Day/night colors and intensities
        let sunIntensity, ambientIntensity, sunColor, skyColor;

        if (this.time < 0.2) {
            // Midnight->Dawn transition
            const t = this.time / 0.2;
            sunIntensity = Utils.lerp(0, 0.3, t);
            ambientIntensity = Utils.lerp(0.1, 0.3, t);
            sunColor = Utils.lerpColor(0x112244, 0xff8844, t);
        } else if (this.time < 0.3) {
            // Dawn
            const t = (this.time - 0.2) / 0.1;
            sunIntensity = Utils.lerp(0.3, 1.2, t);
            ambientIntensity = Utils.lerp(0.3, 0.6, t);
            sunColor = Utils.lerpColor(0xff8844, 0xfff5e0, t);
        } else if (this.time < 0.7) {
            // Day
            sunIntensity = 1.2;
            ambientIntensity = 0.6;
            sunColor = 0xfff5e0;
        } else if (this.time < 0.8) {
            // Dusk
            const t = (this.time - 0.7) / 0.1;
            sunIntensity = Utils.lerp(1.2, 0.3, t);
            ambientIntensity = Utils.lerp(0.6, 0.3, t);
            sunColor = Utils.lerpColor(0xfff5e0, 0xff4400, t);
        } else {
            // Night
            const t = (this.time - 0.8) / 0.2;
            sunIntensity = Utils.lerp(0.3, 0, t);
            ambientIntensity = Utils.lerp(0.3, 0.1, t);
            sunColor = Utils.lerpColor(0xff4400, 0x112244, t);
        }

        this.sunLight.intensity = Math.max(0, sunIntensity);
        this.sunLight.color.setHex(sunColor);
        if (this.ambient) {
            this.ambient.intensity = Math.max(0.05, ambientIntensity);
        }

        // Moon active at night
        if (this.moonLight) {
            this.moonLight.intensity = this.isDay ? 0 : 0.3;
            this.moonLight.position.set(-sunX, Math.abs(sunY), sunZ);
        }

        // Update sky background
        this._updateSkyColor();
    }

    _updateSkyColor() {
        const skyColors = {
            dawn: 0xf08030,
            day: 0x5577aa,
            dusk: 0x803020,
            night: 0x050510
        };

        let skyColor;
        if (this.time < 0.25) skyColor = Utils.lerpColor(skyColors.night, skyColors.dawn, this.time / 0.25);
        else if (this.time < 0.35) skyColor = Utils.lerpColor(skyColors.dawn, skyColors.day, (this.time - 0.25) / 0.1);
        else if (this.time < 0.65) skyColor = skyColors.day;
        else if (this.time < 0.8) skyColor = Utils.lerpColor(skyColors.day, skyColors.dusk, (this.time - 0.65) / 0.15);
        else skyColor = Utils.lerpColor(skyColors.dusk, skyColors.night, (this.time - 0.8) / 0.2);

        this.scene.background = new THREE.Color(skyColor);
    }

    getTimeOfDay() {
        if (this.time < 0.22) return 'night';
        if (this.time < 0.28) return 'dawn';
        if (this.time < 0.72) return 'day';
        if (this.time < 0.78) return 'dusk';
        return 'night';
    }

    getTimeString() {
        const hours = Math.floor(this.time * 24);
        const minutes = Math.floor((this.time * 24 - hours) * 60);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    isDaytime() { return this.isDay; }

    getAmbientFactor() {
        // Returns 0 (full dark) to 1 (full light) for AI sight calculations
        if (this.isDay) return 1.0;
        if (this.time > 0.21 || this.time < 0.2) return 0.3;
        return 0.5;
    }
}

// ==================== VEGETATION SYSTEM ====================
class VegetationSystem {
    constructor(scene) {
        this.scene = scene;
        this.grasses = [];
        this.windTime = 0;
    }

    generateGrass(worldSize, density = 200) {
        // Grass tufts using planes
        const grassMat = new THREE.MeshBasicMaterial({ color: 0x336622, side: THREE.DoubleSide });
        const grassGeo = new THREE.PlaneGeometry(0.8, 1.2);

        for (let i = 0; i < density; i++) {
            const blades = Utils.randomInt(3, 6);
            for (let b = 0; b < blades; b++) {
                const grass = new THREE.Mesh(grassGeo, grassMat);
                grass.position.set(
                    Utils.randomInRange(-worldSize / 3, worldSize / 3),
                    0.6,
                    Utils.randomInRange(-worldSize / 3, worldSize / 3)
                );
                grass.rotation.y = Math.random() * Math.PI;
                grass.userData.grassBlade = true;
                grass.userData.phase = Math.random() * Math.PI * 2;
                this.scene.add(grass);
                this.grasses.push(grass);
            }
        }
    }

    update(dt) {
        this.windTime += dt;
        // Animate grass swaying
        for (let i = 0; i < this.grasses.length; i += 8) { // Update subset for performance
            const grass = this.grasses[i];
            grass.rotation.x = Math.sin(this.windTime * 1.5 + grass.userData.phase) * 0.15;
        }
    }

    clear() {
        this.grasses.forEach(g => this.scene.remove(g));
        this.grasses = [];
    }
}
