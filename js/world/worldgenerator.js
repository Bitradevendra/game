/* ====================================================
   WARZONE EXODUS — WORLD GENERATOR
   Procedural 3D world creation with Three.js
   ==================================================== */

class WorldGenerator {
    constructor(scene, zoneId = 'city') {
        this.scene = scene;
        this._initZoneId = zoneId;
        this.objects = [];
        this.collidables = [];
        this.interactables = [];
        this.spawnPoints = [];
        this.enemySpawnPoints = [];
        this.lootPoints = [];
        this.currentZone = 'city';
        this.terrain = null;

        // Texture cache
        this._textures = {};
    }

    generateZone(zoneId, missionConfig = {}) {
        this.currentZone = zoneId;
        this._clearWorld();

        const zone = C.ZONES.find(z => z.id === zoneId) || C.ZONES[0];

        // Setup lighting for this zone
        this._setupLighting(zone);

        // Generate terrain
        this._generateTerrain(zone);

        // Generate sky
        this._generateSky(zone);

        // Generate zone-specific content
        switch (zoneId) {
            case 'city': this._generateCity(missionConfig); break;
            case 'forest': this._generateForest(missionConfig); break;
            case 'desert': this._generateDesert(missionConfig); break;
            case 'frozen': this._generateFrozen(missionConfig); break;
            case 'volcano': this._generateVolcano(missionConfig); break;
            default: this._generateCity(missionConfig);
        }

        // Always add some common elements
        this._generateRoads();
        this._generateEnvironmentDetails(zone);
    }

    _clearWorld() {
        this.objects.forEach(obj => this.scene.remove(obj));
        this.objects = [];
        this.collidables = [];
        this.interactables = [];
        this.spawnPoints = [];
        this.enemySpawnPoints = [];
        this.lootPoints = [];
    }

    _setupLighting(zone) {
        // Remove existing lights
        const oldLights = this.scene.children.filter(c => c.isLight);
        oldLights.forEach(l => this.scene.remove(l));

        // Ambient
        const ambient = new THREE.AmbientLight(0x334455, 0.6);
        this.scene.add(ambient);

        // Sun/directional
        this.sunLight = new THREE.DirectionalLight(0xfff5e0, 1.2);
        this.sunLight.position.set(100, 150, 100);
        this.sunLight.castShadow = true;
        this.sunLight.shadow.mapSize.width = 2048;
        this.sunLight.shadow.mapSize.height = 2048;
        this.sunLight.shadow.camera.near = 0.5;
        this.sunLight.shadow.camera.far = 500;
        this.sunLight.shadow.camera.left = -200;
        this.sunLight.shadow.camera.right = 200;
        this.sunLight.shadow.camera.top = 200;
        this.sunLight.shadow.camera.bottom = -200;
        this.scene.add(this.sunLight);

        // Hemisphere (sky/ground)
        const hemi = new THREE.HemisphereLight(0x6699bb, 0x335522, 0.4);
        this.scene.add(hemi);

        // Fog
        const fogColor = parseInt(zone.color.replace('#', '0x'));
        this.scene.fog = new THREE.FogExp2(fogColor, zone.fog * 0.01);
        this.scene.background = new THREE.Color(this._getSkyColor(zone));
    }

    _getSkyColor(zone) {
        const colors = {
            city: 0x334455, forest: 0x223322, desert: 0x886644,
            frozen: 0x8899aa, volcano: 0x331108
        };
        return colors[zone.id] || 0x334455;
    }

    _generateTerrain(zone) {
        const size = C.WORLD_SIZE;
        const resolution = 128;
        const geo = new THREE.PlaneGeometry(size, size, resolution, resolution);

        // Height map using simplex-like noise
        const verts = geo.attributes.position;
        for (let i = 0; i < verts.count; i++) {
            const x = verts.getX(i);
            const z = verts.getY(i);
            let height = 0;

            // Multi-octave noise
            height += this._noise(x * 0.008, z * 0.008) * 15;
            height += this._noise(x * 0.02, z * 0.02) * 4;
            height += this._noise(x * 0.05, z * 0.05) * 1.5;

            // Zone-specific terrain
            if (zone.id === 'frozen') {
                height *= 2.5;
                // Mountain peaks
                const distFromCenter = Math.sqrt(x * x + z * z) / (size * 0.5);
                height += Math.max(0, 1 - distFromCenter) * 30;
            } else if (zone.id === 'volcano') {
                // Volcano cone
                const angleFromCenter = Math.sqrt(x * x + z * z) / (size * 0.3);
                height += Math.max(0, (1 - angleFromCenter) * 40);
            }

            verts.setZ(i, height);
        }

        geo.computeVertexNormals();

        const terrainColors = {
            city: 0x444444, forest: 0x2d5a1e,
            desert: 0x8b6914, frozen: 0xdde8f0,
            volcano: 0x1a0a00
        };

        const mat = new THREE.MeshLambertMaterial({
            color: terrainColors[zone.id] || 0x444444
        });

        this.terrain = new THREE.Mesh(geo, mat);
        this.terrain.rotation.x = -Math.PI / 2;
        this.terrain.receiveShadow = true;
        this.terrain.name = 'terrain';
        this.scene.add(this.terrain);
        this.objects.push(this.terrain);

        // Save height function for queries
        this._terrainVerts = verts;
        this._terrainSize = size;
        this._terrainRes = resolution;
    }

    getTerrainHeight(worldX, worldZ) {
        if (!this._terrainVerts) return 0;
        // Simple bilinear approximation
        const halfSize = this._terrainSize / 2;
        const u = (worldX + halfSize) / this._terrainSize;
        const v = (worldZ + halfSize) / this._terrainSize;
        const ix = Math.floor(u * this._terrainRes);
        const iz = Math.floor(v * this._terrainRes);
        const idx = (iz * (this._terrainRes + 1) + ix);
        if (idx < 0 || idx >= this._terrainVerts.count) return 0;

        // The plane is rotated -90 on X, so z in vertex = height
        return this._terrainVerts.getZ(idx) || 0;
    }

    // Simple deterministic noise
    _noise(x, z) {
        const X = Math.floor(x) & 255;
        const Z = Math.floor(z) & 255;
        const fx = x - Math.floor(x);
        const fz = z - Math.floor(z);
        const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
        const lerp = (a, b, t) => a + t * (b - a);
        const grad = (h, x, z) => {
            const g = [1, 1, -1, -1, 1, -1, 1, -1];
            return g[h & 7] * x + g[(h >> 3) & 7] * z;
        };
        const h = (x, z) => ((x * 1619 + z * 31337) & 0xffff) / 0xffff;
        const ux = fade(fx), uz = fade(fz);
        return lerp(
            lerp(grad(X, fx, fz), grad(X + 1, fx - 1, fz), ux),
            lerp(grad(Z, fx, fz - 1), grad(Z + 1, fx - 1, fz - 1), ux),
            uz
        );
    }

    _generateSky(zone) {
        // Skybox using a large sphere with gradient
        const skyGeo = new THREE.SphereGeometry(800, 32, 16);
        const skyColors = {
            city: [0x334455, 0x112233],
            forest: [0x223322, 0x112211],
            desert: [0x886644, 0x554422],
            frozen: [0x8899aa, 0x556677],
            volcano: [0x331108, 0x110500]
        };
        const cols = skyColors[zone.id] || skyColors.city;
        const skyMat = new THREE.MeshBasicMaterial({
            color: cols[0],
            side: THREE.BackSide
        });
        const sky = new THREE.Mesh(skyGeo, skyMat);
        sky.name = 'sky';
        this.scene.add(sky);
        this.objects.push(sky);
    }

    _generateCity(config) {
        // Streets (6x6 grid of blocks)
        const gridSize = 6;
        const blockSize = 50;
        const streetWidth = 12;

        for (let gx = -gridSize / 2; gx < gridSize / 2; gx++) {
            for (let gz = -gridSize / 2; gz < gridSize / 2; gz++) {
                const bx = gx * (blockSize + streetWidth);
                const bz = gz * (blockSize + streetWidth);

                // Number of buildings per block (2x2 grid)
                const numBuildings = Utils.randomInt(2, 5);
                const positions = this._distributeInBlock(numBuildings, blockSize);

                positions.forEach(pos => {
                    const height = Utils.randomInt(8, 40);
                    const width = Utils.randomInRange(8, 18);
                    const depth = Utils.randomInRange(8, 18);
                    this._createBuilding(
                        bx + pos.x, 0, bz + pos.z,
                        width, height, depth,
                        { style: Utils.randomElement(['office', 'residential', 'industrial']) }
                    );
                });

                // Spawn/enemy points in streets
                this.enemySpawnPoints.push({ x: bx + blockSize / 2 + streetWidth / 2, z: bz });

                // Loot points
                if (Math.random() < 0.3) {
                    this.lootPoints.push({ x: bx + Utils.randomInRange(-20, 20), z: bz + Utils.randomInRange(-20, 20) });
                }
            }
        }

        // Player spawn at center-ish
        this.spawnPoints = [
            { x: 0, z: 0 }, { x: 20, z: 20 }, { x: -20, z: 20 }
        ];

        // Underground metro entrance
        this._createMetroEntrance(0, -30);

        // Debris and destroyed stuff
        for (let i = 0; i < 40; i++) {
            this._createDebrisPile(
                Utils.randomInRange(-100, 100),
                Utils.randomInRange(-100, 100)
            );
        }
    }

    _generateForest(config) {
        // Dense tree coverage
        const treeCount = 300;
        for (let i = 0; i < treeCount; i++) {
            const x = Utils.randomInRange(-200, 200);
            const z = Utils.randomInRange(-200, 200);
            const height = this.getTerrainHeight(x, z);
            this._createTree(x, height, z, Utils.randomInRange(0.6, 1.4));
        }

        // Hidden bunker
        this._createBunker(-60, 0, -60);

        // Treetop platforms
        for (let i = 0; i < 5; i++) {
            const x = Utils.randomInRange(-80, 80);
            const z = Utils.randomInRange(-80, 80);
            this._createTreetopPlatform(x, z);
        }

        // Clearings with loot
        for (let i = 0; i < 8; i++) {
            this.lootPoints.push({
                x: Utils.randomInRange(-180, 180),
                z: Utils.randomInRange(-180, 180)
            });
        }

        this.spawnPoints = [
            { x: 0, z: 0 }, { x: 30, z: -30 }, { x: -30, z: 30 }
        ];
    }

    _generateDesert(config) {
        // Military buildings
        this._createHangar(-80, 0, 0);
        this._createHangar(80, 0, 0);
        this._createRadarTower(0, 0, -80);
        this._createBunker(40, 0, 40);
        this._createBunker(-40, 0, -40);

        // Barriers/cover
        for (let i = 0; i < 30; i++) {
            this._createCoverBarrier(
                Utils.randomInRange(-150, 150),
                Utils.randomInRange(-150, 150)
            );
        }

        // Sand dunes (low hills made of geometry)
        for (let i = 0; i < 20; i++) {
            this._createSandDune(
                Utils.randomInRange(-200, 200),
                Utils.randomInRange(-200, 200)
            );
        }

        this.spawnPoints = [{ x: 0, z: 100 }, { x: -30, z: 80 }, { x: 30, z: 80 }];
    }

    _generateFrozen(config) {
        // Ski lodge
        this._createSkiLodge(0, 0, 0);

        // Ice caves
        for (let i = 0; i < 3; i++) {
            this._createIceCave(
                Utils.randomInRange(-100, 100),
                Utils.randomInRange(-100, 100)
            );
        }

        // Frozen lake
        this._createFrozenLake(50, 0, 50);

        // Snow-covered trees
        for (let i = 0; i < 100; i++) {
            const x = Utils.randomInRange(-200, 200);
            const z = Utils.randomInRange(-200, 200);
            this._createTree(x, 0, z, Utils.randomInRange(0.5, 1.0), 0xffffff);
        }

        this.spawnPoints = [{ x: 0, z: -80 }, { x: -20, z: -60 }, { x: 20, z: -60 }];
    }

    _generateVolcano(config) {
        // Ancient ruins
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const radius = Utils.randomInRange(40, 100);
            this._createRuin(
                Math.cos(angle) * radius,
                Math.sin(angle) * radius
            );
        }

        // Lava rivers (just visual geo)
        this._createLavaRiver();

        // Geysers
        for (let i = 0; i < 5; i++) {
            this._createGeyser(
                Utils.randomInRange(-80, 80),
                Utils.randomInRange(-80, 80)
            );
        }

        this.spawnPoints = [{ x: -100, z: -100 }, { x: -80, z: -80 }, { x: -120, z: -80 }];
    }

    // ==================== BUILDING CREATION ====================
    _createBuilding(x, y, z, width, height, depth, options = {}) {
        const group = new THREE.Group();
        group.position.set(x, y, z);

        const style = options.style || 'office';

        // Colors by style
        const wallColors = {
            office: 0x556677,
            residential: 0x775544,
            industrial: 0x444444
        };
        const wallColor = wallColors[style] || 0x556677;

        // Main structure
        const bodyGeo = new THREE.BoxGeometry(width, height, depth);
        const bodyMat = new THREE.MeshLambertMaterial({ color: wallColor });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = height / 2;
        body.castShadow = true;
        body.receiveShadow = true;
        body.name = 'building';
        group.add(body);

        // Windows (instanced)
        const windowMat = new THREE.MeshBasicMaterial({ color: 0x223344 });
        const windowGeo = new THREE.PlaneGeometry(1.0, 1.4);
        const floors = Math.floor(height / 4);
        const windowsPerFloor = Math.floor(width / 3);

        for (let floor = 0; floor < floors; floor++) {
            for (let w = 0; w < windowsPerFloor; w++) {
                // Front windows
                let win = new THREE.Mesh(windowGeo, windowMat);
                win.position.set(
                    (w - windowsPerFloor / 2 + 0.5) * 3,
                    floor * 4 + 3,
                    depth / 2 + 0.01
                );
                // 30% lit at night
                if (Math.random() < 0.3) {
                    win.material = new THREE.MeshBasicMaterial({ color: 0x886633 });
                }
                group.add(win);
            }
        }

        // Rooftop details
        const roofRailGeo = new THREE.BoxGeometry(width, 0.5, 0.3);
        const roofRail = new THREE.Mesh(roofRailGeo, bodyMat);
        roofRail.position.y = height + 0.25;
        group.add(roofRail);

        // Antenna / water tower
        if (Math.random() < 0.4) {
            const antennaGeo = new THREE.CylinderGeometry(0.05, 0.05, 6);
            const antenna = new THREE.Mesh(antennaGeo, new THREE.MeshBasicMaterial({ color: 0x888888 }));
            antenna.position.set(
                Utils.randomInRange(-width / 2 + 1, width / 2 - 1),
                height + 3,
                Utils.randomInRange(-depth / 2 + 1, depth / 2 - 1)
            );
            group.add(antenna);
        }

        group.name = 'building_group';
        this.scene.add(group);
        this.objects.push(group);

        // Collidable box
        this.collidables.push({
            x: x - width / 2, z: z - depth / 2,
            width, depth,
            minY: 0, maxY: height + 2,
            type: 'building'
        });

        // Loot spawn on rooftop
        this.lootPoints.push({ x, z, y: height + 0.5 });

        // Enemy spawn positions around building
        this.enemySpawnPoints.push(
            { x: x + width / 2 + 5, z },
            { x: x - width / 2 - 5, z },
            { x, z: z + depth / 2 + 5 }
        );

        return group;
    }

    _createTree(x, y, z, scale = 1.0, trunkColor = null) {
        const group = new THREE.Group();
        group.position.set(x, y, z);

        const trunkH = 4 * scale;
        const trunkGeo = new THREE.CylinderGeometry(0.2 * scale, 0.4 * scale, trunkH);
        const trunkMat = new THREE.MeshLambertMaterial({ color: trunkColor || 0x554433 });
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = trunkH / 2;
        trunk.castShadow = true;
        group.add(trunk);

        // Foliage layers
        const foliageColors = [0x1a5c1a, 0x236b23, 0x1a4d1a];
        for (let i = 0; i < 3; i++) {
            const r = (3 - i) * scale;
            const h = (3 + i * 0.5) * scale;
            const leafGeo = new THREE.ConeGeometry(r, h, 8);
            const leafMat = new THREE.MeshLambertMaterial({
                color: trunkColor ? 0xddeeff : foliageColors[i % foliageColors.length]
            });
            const leaf = new THREE.Mesh(leafGeo, leafMat);
            leaf.position.y = trunkH + i * 2.5 * scale;
            leaf.castShadow = true;
            group.add(leaf);
        }

        this.scene.add(group);
        this.objects.push(group);
        this.collidables.push({ x: x - 0.4, z: z - 0.4, width: 0.8, depth: 0.8, type: 'tree' });
    }

    _createHangar(x, y, z) {
        const w = 40, h = 14, d = 25;
        const geo = new THREE.BufferGeometry();

        // Arched shape using custom geometry
        const halfW = w / 2, halfD = d / 2;
        const segments = 12;
        const vertices = [];
        const indices = [];

        // Create arch profile
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI;
            const px = Math.cos(angle) * halfW;
            const py = h + Math.sin(angle) * h * 0.4;
            vertices.push(px, Math.max(0, py), -halfD);
            vertices.push(px, Math.max(0, py), halfD);
        }

        for (let i = 0; i < segments; i++) {
            const a = i * 2, b = a + 1, c = a + 2, dd = a + 3;
            indices.push(a, b, c, b, dd, c);
        }

        geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geo.setIndex(indices);
        geo.computeVertexNormals();

        const mat = new THREE.MeshLambertMaterial({ color: 0x445566, side: THREE.DoubleSide });
        const hangar = new THREE.Mesh(geo, mat);
        hangar.position.set(x, y, z);
        hangar.castShadow = true;
        this.scene.add(hangar);
        this.objects.push(hangar);

        this.collidables.push({ x: x - w / 2, z: z - d / 2, width: w, depth: d, type: 'hangar' });
        this.enemySpawnPoints.push({ x: x + 20, z }, { x: x - 20, z }, { x, z: z + 15 });
        this.lootPoints.push({ x, z, y: 1 });
    }

    _createRadarTower(x, y, z) {
        const group = new THREE.Group();
        group.position.set(x, y, z);

        // Legs
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2;
            const legGeo = new THREE.BoxGeometry(0.4, 20, 0.4);
            const leg = new THREE.Mesh(legGeo, new THREE.MeshLambertMaterial({ color: 0x777777 }));
            leg.position.set(Math.cos(angle) * 4, 10, Math.sin(angle) * 4);
            leg.rotation.z = Math.sin(angle) * 0.2;
            leg.castShadow = true;
            group.add(leg);
        }

        // Platform
        const platformGeo = new THREE.BoxGeometry(8, 0.5, 8);
        const platform = new THREE.Mesh(platformGeo, new THREE.MeshLambertMaterial({ color: 0x666666 }));
        platform.position.y = 20;
        group.add(platform);

        // Dish
        const dishGeo = new THREE.SphereGeometry(3, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
        const dish = new THREE.Mesh(dishGeo, new THREE.MeshLambertMaterial({ color: 0x888888, side: THREE.DoubleSide }));
        dish.position.y = 22;
        dish.rotation.x = -Math.PI / 4;
        this.radarDish = dish;
        group.add(dish);

        this.scene.add(group);
        this.objects.push(group);
        this.collidables.push({ x: x - 5, z: z - 5, width: 10, depth: 10, type: 'tower' });
    }

    _createBunker(x, y, z) {
        const group = new THREE.Group();
        group.position.set(x, y, z);

        // Main structure (half-buried)
        const mainGeo = new THREE.BoxGeometry(14, 5, 10);
        const main = new THREE.Mesh(mainGeo, new THREE.MeshLambertMaterial({ color: 0x444433 }));
        main.position.y = 1;
        main.castShadow = true;
        group.add(main);

        // Dirt mound over top
        const moundGeo = new THREE.SphereGeometry(8, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
        const mound = new THREE.Mesh(moundGeo, new THREE.MeshLambertMaterial({ color: 0x445533 }));
        mound.position.y = 2.5;
        mound.scale.set(1, 0.5, 0.8);
        group.add(mound);

        // Entrance
        const doorGeo = new THREE.BoxGeometry(2, 3, 2);
        const door = new THREE.Mesh(doorGeo, new THREE.MeshLambertMaterial({ color: 0x333322 }));
        door.position.set(0, 1, 5.5);
        group.add(door);

        this.scene.add(group);
        this.objects.push(group);
        this.collidables.push({ x: x - 7, z: z - 5, width: 14, depth: 10, type: 'bunker' });
        this.lootPoints.push({ x, z: z + 2 }, { x, z: z - 2 });
        this.enemySpawnPoints.push({ x: x + 10, z }, { x: x - 10, z });
    }

    _createSkiLodge(x, y, z) {
        const group = new THREE.Group();
        group.position.set(x, y, z);

        // Main lodge building
        const mainGeo = new THREE.BoxGeometry(20, 8, 15);
        const main = new THREE.Mesh(mainGeo, new THREE.MeshLambertMaterial({ color: 0x774433 }));
        main.position.y = 4;
        main.castShadow = true;
        group.add(main);

        // Steep roof
        const roofGeo = new THREE.ConeGeometry(14, 6, 4);
        const roof = new THREE.Mesh(roofGeo, new THREE.MeshLambertMaterial({ color: 0xddddee }));
        roof.position.y = 11;
        roof.rotation.y = Math.PI / 4;
        group.add(roof);

        // Chimney
        const chimneyGeo = new THREE.BoxGeometry(1.5, 4, 1.5);
        const chimney = new THREE.Mesh(chimneyGeo, new THREE.MeshLambertMaterial({ color: 0x555555 }));
        chimney.position.set(5, 12, 2);
        group.add(chimney);

        this.scene.add(group);
        this.objects.push(group);
        this.collidables.push({ x: x - 10, z: z - 7.5, width: 20, depth: 15, type: 'lodge' });
        this.lootPoints.push({ x, z: z + 8 }, { x: x + 10, z });
    }

    _createFrozenLake(x, y, z) {
        const geo = new THREE.CircleGeometry(40, 32);
        const mat = new THREE.MeshPhongMaterial({
            color: 0x88ccee, transparent: true, opacity: 0.85,
            shininess: 100, specular: 0xffffff
        });
        const lake = new THREE.Mesh(geo, mat);
        lake.rotation.x = -Math.PI / 2;
        lake.position.set(x, y + 0.1, z);
        lake.receiveShadow = true;
        this.scene.add(lake);
        this.objects.push(lake);
    }

    _createIceCave(x, z) {
        const group = new THREE.Group();
        group.position.set(x, 0, z);

        // Entrance arch
        const archGeo = new THREE.TorusGeometry(5, 1.5, 8, 12, Math.PI);
        const mat = new THREE.MeshPhongMaterial({ color: 0x88bbdd, shininess: 80 });
        const arch = new THREE.Mesh(archGeo, mat);
        arch.position.y = 5;
        arch.rotation.x = Math.PI;
        group.add(arch);

        // Dark interior hint
        const interiorGeo = new THREE.BoxGeometry(8, 6, 12);
        const interiorMat = new THREE.MeshBasicMaterial({ color: 0x112233 });
        const interior = new THREE.Mesh(interiorGeo, interiorMat);
        interior.position.set(0, 3, -5);
        group.add(interior);

        this.scene.add(group);
        this.objects.push(group);
        this.lootPoints.push({ x, z });
    }

    _createLavaRiver() {
        // Simple glowing plane river
        const riverGeo = new THREE.PlaneGeometry(8, 200);
        const riverMat = new THREE.MeshBasicMaterial({ color: 0xff4400 });
        const river = new THREE.Mesh(riverGeo, riverMat);
        river.rotation.x = -Math.PI / 2;
        river.position.set(-20, 0.2, 0);
        this.scene.add(river);
        this.objects.push(river);

        // Point lights for glow effect
        for (let i = 0; i < 10; i++) {
            const light = new THREE.PointLight(0xff4400, 1, 20);
            light.position.set(-20, 1, -100 + i * 20);
            this.scene.add(light);
            this.objects.push(light);
        }
    }

    _createGeyser(x, z) {
        const group = new THREE.Group();
        group.position.set(x, 0, z);

        const baseGeo = new THREE.CylinderGeometry(1.5, 2, 0.5, 8);
        const mat = new THREE.MeshLambertMaterial({ color: 0x554433 });
        const base = new THREE.Mesh(baseGeo, mat);
        group.add(base);

        // Steam column
        const steamGeo = new THREE.CylinderGeometry(0.5, 0.5, 6, 6);
        const steamMat = new THREE.MeshBasicMaterial({ color: 0xcccccc, transparent: true, opacity: 0.4 });
        const steam = new THREE.Mesh(steamGeo, steamMat);
        steam.position.y = 3.5;
        steam.userData.animSteam = true;
        group.add(steam);

        this.scene.add(group);
        this.objects.push(group);
    }

    _createRuin(x, z) {
        const group = new THREE.Group();
        group.position.set(x, 0, z);

        // Broken pillars
        const pillarCount = Utils.randomInt(3, 7);
        for (let i = 0; i < pillarCount; i++) {
            const angle = (i / pillarCount) * Math.PI * 2;
            const radius = Utils.randomInRange(5, 12);
            const height = Utils.randomInRange(2, 8);
            const pillarGeo = new THREE.CylinderGeometry(0.6, 0.8, height, 8);
            const mat = new THREE.MeshLambertMaterial({ color: 0x998877 });
            const pillar = new THREE.Mesh(pillarGeo, mat);
            pillar.position.set(
                Math.cos(angle) * radius,
                height / 2,
                Math.sin(angle) * radius
            );
            pillar.rotation.z = Utils.randomInRange(-0.3, 0.3);
            pillar.rotation.x = Utils.randomInRange(-0.2, 0.2);
            pillar.castShadow = true;
            group.add(pillar);
        }

        this.scene.add(group);
        this.objects.push(group);
        this.lootPoints.push({ x, z });
        this.enemySpawnPoints.push({ x: x + 10, z }, { x: x - 8, z: z + 8 });
    }

    _createMetroEntrance(x, z) {
        const group = new THREE.Group();
        group.position.set(x, 0, z);

        const railingGeo = new THREE.BoxGeometry(12, 3, 0.3);
        const mat = new THREE.MeshLambertMaterial({ color: 0x446688 });
        const rail = new THREE.Mesh(railingGeo, mat);
        rail.position.set(0, 1.5, 0);
        group.add(rail);

        // Stairs going down
        for (let i = 0; i < 6; i++) {
            const stepGeo = new THREE.BoxGeometry(8, 0.4, 1.5);
            const step = new THREE.Mesh(stepGeo, mat);
            step.position.set(0, -i * 0.5, i * 1.5 + 1);
            group.add(step);
        }

        const sign = new THREE.Mesh(
            new THREE.BoxGeometry(4, 1.5, 0.1),
            new THREE.MeshBasicMaterial({ color: 0x004488 })
        );
        sign.position.set(0, 3, 0);
        group.add(sign);

        this.scene.add(group);
        this.objects.push(group);
        this.interactables.push({ x, z, type: 'metro_entrance', prompt: 'Enter Underground Metro', radius: 5 });
    }

    _createDebrisPile(x, z) {
        const group = new THREE.Group();
        group.position.set(x, 0, z);

        const count = Utils.randomInt(3, 8);
        const mat = new THREE.MeshLambertMaterial({ color: 0x665544 });

        for (let i = 0; i < count; i++) {
            const geo = new THREE.BoxGeometry(
                Utils.randomInRange(0.5, 2),
                Utils.randomInRange(0.3, 1.5),
                Utils.randomInRange(0.5, 2)
            );
            const piece = new THREE.Mesh(geo, mat);
            piece.position.set(
                Utils.randomInRange(-2, 2),
                Utils.randomInRange(0, 1),
                Utils.randomInRange(-2, 2)
            );
            piece.rotation.set(
                Utils.randomInRange(-0.5, 0.5),
                Utils.randomInRange(-3, 3),
                Utils.randomInRange(-0.5, 0.5)
            );
            piece.castShadow = true;
            piece.receiveShadow = true;
            group.add(piece);
        }

        this.scene.add(group);
        this.objects.push(group);
        this.collidables.push({
            x: x - 3, z: z - 3, width: 6, depth: 6, type: 'debris', cover: true
        });
    }

    _createCoverBarrier(x, z) {
        const types = ['sandbag', 'concrete', 'vehicle_wreck'];
        const type = Utils.randomElement(types);

        const w = Utils.randomInRange(2, 5), h = Utils.randomInRange(0.8, 1.5), d = Utils.randomInRange(0.6, 1);
        const geo = new THREE.BoxGeometry(w, h, d);
        const colors = { sandbag: 0x886644, concrete: 0x666666, vehicle_wreck: 0x444422 };
        const mat = new THREE.MeshLambertMaterial({ color: colors[type] });
        const barrier = new THREE.Mesh(geo, mat);
        barrier.position.set(x, h / 2, z);
        barrier.rotation.y = Math.random() * Math.PI;
        barrier.castShadow = true;
        barrier.receiveShadow = true;

        this.scene.add(barrier);
        this.objects.push(barrier);
        this.collidables.push({ x: x - w / 2, z: z - d / 2, width: w, depth: d, type: 'barrier', cover: true });
    }

    _createSandDune(x, z) {
        const geo = new THREE.SphereGeometry(Utils.randomInRange(5, 15), 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
        const mat = new THREE.MeshLambertMaterial({ color: 0x8b6914 });
        const dune = new THREE.Mesh(geo, mat);
        dune.position.set(x, -1, z);
        dune.scale.set(1, Utils.randomInRange(0.3, 0.7), Utils.randomInRange(0.8, 1.2));
        dune.receiveShadow = true;
        this.scene.add(dune);
        this.objects.push(dune);
    }

    _createTreetopPlatform(x, z) {
        const height = Utils.randomInRange(10, 18);
        const group = new THREE.Group();
        group.position.set(x, 0, z);

        // Support pole
        const poleGeo = new THREE.CylinderGeometry(0.3, 0.4, height);
        const poleMat = new THREE.MeshLambertMaterial({ color: 0x554433 });
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.y = height / 2;
        group.add(pole);

        // Platform
        const platGeo = new THREE.BoxGeometry(6, 0.4, 6);
        const platMat = new THREE.MeshLambertMaterial({ color: 0x443322 });
        const plat = new THREE.Mesh(platGeo, platMat);
        plat.position.y = height;
        plat.castShadow = true;
        plat.receiveShadow = true;
        group.add(plat);

        // Railings
        const railMat = new THREE.MeshLambertMaterial({ color: 0x332211 });
        for (let i = 0; i < 4; i++) {
            const railGeo = new THREE.BoxGeometry(6, 1, 0.1);
            const rail = new THREE.Mesh(railGeo, railMat);
            const angle = (i / 4) * Math.PI * 2;
            rail.position.set(Math.cos(angle) * 2.9, height + 0.7, Math.sin(angle) * 2.9);
            rail.rotation.y = angle + Math.PI / 2;
            group.add(rail);
        }

        this.scene.add(group);
        this.objects.push(group);
        this.lootPoints.push({ x, z, y: height });
        this.enemySpawnPoints.push({ x: x + 1, z: z + 1, y: height });
    }

    _generateRoads() {
        // Simple flat road planes
        const roadMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });

        // Grid roads
        for (let i = -3; i <= 3; i++) {
            const x = i * 62;
            const roadH = new THREE.Mesh(new THREE.PlaneGeometry(8, 400), roadMat);
            roadH.rotation.x = -Math.PI / 2;
            roadH.position.set(x, 0.05, 0);
            roadH.receiveShadow = true;
            this.scene.add(roadH);
            this.objects.push(roadH);

            const roadV = new THREE.Mesh(new THREE.PlaneGeometry(400, 8), roadMat);
            roadV.rotation.x = -Math.PI / 2;
            roadV.position.set(0, 0.05, x);
            roadV.receiveShadow = true;
            this.scene.add(roadV);
            this.objects.push(roadV);
        }
    }

    _generateEnvironmentDetails(zone) {
        // Street lights / lamp posts
        const lampMat = new THREE.MeshBasicMaterial({ color: 0xffffaa });

        for (let i = 0; i < 30; i++) {
            const lx = Utils.randomInRange(-150, 150);
            const lz = Utils.randomInRange(-150, 150);

            const postGeo = new THREE.CylinderGeometry(0.1, 0.15, 8);
            const postMat = new THREE.MeshLambertMaterial({ color: 0x666666 });
            const post = new THREE.Mesh(postGeo, postMat);
            post.position.set(lx, 4, lz);
            this.scene.add(post);
            this.objects.push(post);

            // Lamp glow
            const lamp = new THREE.PointLight(0xffffaa, 0.8, 25);
            lamp.position.set(lx, 8, lz);
            this.scene.add(lamp);
            this.objects.push(lamp);
        }

        // Supply crates (loot)
        for (let i = 0; i < 20; i++) {
            const cx = Utils.randomInRange(-150, 150);
            const cz = Utils.randomInRange(-150, 150);
            this._createLootCrate(cx, cz);
        }
    }

    _createLootCrate(x, z) {
        const geo = new THREE.BoxGeometry(1.2, 1.2, 1.2);
        const rarity = Utils.randomRarity();
        const colors = { common: 0x887755, rare: 0x2244aa, epic: 0x6622aa, legendary: 0xaa8800 };
        const mat = new THREE.MeshLambertMaterial({ color: colors[rarity] || 0x887755 });
        const crate = new THREE.Mesh(geo, mat);
        crate.position.set(x, 0.6, z);
        crate.rotation.y = Math.random() * Math.PI;
        crate.castShadow = true;
        crate.name = 'loot_crate';

        // Emissive for rare+ items
        if (rarity !== 'common') {
            const light = new THREE.PointLight(colors[rarity], 0.5, 5);
            light.position.set(x, 1, z);
            this.scene.add(light);
            this.objects.push(light);
        }

        this.scene.add(crate);
        this.objects.push(crate);
        this.interactables.push({
            x, z, type: 'loot_crate', prompt: `Open ${rarity.toUpperCase()} Crate`,
            rarity, radius: 2.5, mesh: crate
        });
    }

    // ==================== UPDATE ====================
    update(dt, time) {
        // Animate radar dish
        if (this.radarDish) {
            this.radarDish.rotation.y += dt * 0.5;
        }

        // Animate steam geysers
        this.scene.children.forEach(obj => {
            if (obj.userData && obj.userData.animSteam) {
                obj.scale.y = 1 + Math.sin(time * 2) * 0.3;
                obj.material.opacity = 0.3 + Math.sin(time * 1.5) * 0.2;
            }
        });
    }

    _distributeInBlock(count, blockSize) {
        const positions = [];
        const margin = 5;
        for (let i = 0; i < count; i++) {
            positions.push({
                x: Utils.randomInRange(-blockSize / 2 + margin, blockSize / 2 - margin),
                z: Utils.randomInRange(-blockSize / 2 + margin, blockSize / 2 - margin)
            });
        }
        return positions;
    }

    getPlayerSpawn() {
        return this.spawnPoints[0] || { x: 0, z: 0 };
    }

    getEnemySpawnPoints() {
        return this.enemySpawnPoints;
    }

    getLootPoints() {
        return this.lootPoints;
    }

    getInteractables() {
        return this.interactables;
    }

    // Alias for game.js
    generate() {
        this.generateZone(this._initZoneId || 'city');
    }

    getPlayerSpawn() {
        return this.spawnPoints[0] || { x: 0, y: 0, z: 0 };
    }

    getEnemySpawnPoints() {
        return this.enemySpawnPoints.length > 0 ? this.enemySpawnPoints : [
            { x: 50, z: 50 }, { x: -50, z: 50 }, { x: 50, z: -50 },
            { x: -50, z: -50 }, { x: 80, z: 0 }, { x: -80, z: 0 }
        ];
    }

    getLootPoints() {
        return this.lootPoints;
    }

    getCollidables() {
        return this.collidables;
    }

    checkCollision(x, z, radius = 0.5) {
        for (const col of this.collidables) {
            if (
                x + radius > col.x &&
                x - radius < col.x + col.width &&
                z + radius > col.z &&
                z - radius < col.z + col.depth
            ) {
                return col;
            }
        }
        return null;
    }

    getNearestInteractable(x, z) {
        let nearest = null;
        let minDist = Infinity;
        for (const obj of this.interactables) {
            const dist = Utils.distance2D(x, z, obj.x, obj.z);
            if (dist < obj.radius && dist < minDist) {
                nearest = obj;
                minDist = dist;
            }
        }
        return nearest;
    }

    getTerrainHeight(x, z) {
        // Simple flat terrain for now (could add height noise later)
        return 0;
    }
}
