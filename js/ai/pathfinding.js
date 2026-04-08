/* pathfinding.js - Simple grid pathfinding */

class Pathfinder {
    constructor(gridSize = 50, cellSize = 4) {
        this.gridSize = gridSize;
        this.cellSize = cellSize;
        this.grid = new Uint8Array(gridSize * gridSize); // 0=open, 1=blocked
    }

    updateObstacles(collidables) {
        this.grid.fill(0);
        const half = (this.gridSize * this.cellSize) / 2;

        for (const col of collidables) {
            const startX = Math.floor((col.x + half) / this.cellSize);
            const endX = Math.ceil((col.x + col.width + half) / this.cellSize);
            const startZ = Math.floor((col.z + half) / this.cellSize);
            const endZ = Math.ceil((col.z + col.depth + half) / this.cellSize);

            for (let x = startX; x <= endX; x++) {
                for (let z = startZ; z <= endZ; z++) {
                    if (x >= 0 && x < this.gridSize && z >= 0 && z < this.gridSize) {
                        this.grid[z * this.gridSize + x] = 1;
                    }
                }
            }
        }
    }

    findPath(from, to) {
        // Simple A* (lightweight for 50 agents)
        const half = (this.gridSize * this.cellSize) / 2;
        const toGrid = (wx, wz) => ({
            x: Math.floor((wx + half) / this.cellSize),
            z: Math.floor((wz + half) / this.cellSize)
        });
        const toWorld = (gx, gz) => ({
            x: gx * this.cellSize - half + this.cellSize / 2,
            z: gz * this.cellSize - half + this.cellSize / 2
        });

        const start = toGrid(from.x, from.z);
        const end = toGrid(to.x, to.z);

        if (!this._isValid(start.x, start.z) || !this._isValid(end.x, end.z)) {
            return [to]; // Direct path if grid invalid
        }

        // Skip pathfinding if close enough
        const dist = Utils.distance2D(from.x, from.z, to.x, to.z);
        if (dist < 20) return [to];

        const key = (x, z) => z * this.gridSize + x;
        const open = [{ ...start, g: 0, h: this._heuristic(start, end), f: 0, parent: null }];
        const closed = new Set();
        const best = {};
        best[key(start.x, start.z)] = open[0];

        let iterations = 0;
        const maxIter = 200;

        while (open.length > 0 && iterations < maxIter) {
            iterations++;
            open.sort((a, b) => a.f - b.f);
            const current = open.shift();
            const cKey = key(current.x, current.z);

            if (closed.has(cKey)) continue;
            closed.add(cKey);

            if (current.x === end.x && current.z === end.z) {
                // Reconstruct path
                const path = [];
                let node = current;
                while (node) {
                    path.unshift(toWorld(node.x, node.z));
                    node = node.parent;
                }
                return path.length > 1 ? path.slice(1) : [to];
            }

            const neighbors = [
                { x: 1, z: 0 }, { x: -1, z: 0 }, { x: 0, z: 1 }, { x: 0, z: -1 },
                { x: 1, z: 1 }, { x: -1, z: 1 }, { x: 1, z: -1 }, { x: -1, z: -1 }
            ];

            for (const n of neighbors) {
                const nx = current.x + n.x;
                const nz = current.z + n.z;
                if (!this._isValid(nx, nz) || this.grid[key(nx, nz)] === 1) continue;
                if (closed.has(key(nx, nz))) continue;

                const g = current.g + (n.x !== 0 && n.z !== 0 ? 1.414 : 1);
                const h = this._heuristic({ x: nx, z: nz }, end);
                const f = g + h;

                const existing = best[key(nx, nz)];
                if (!existing || g < existing.g) {
                    const node = { x: nx, z: nz, g, h, f, parent: current };
                    best[key(nx, nz)] = node;
                    open.push(node);
                }
            }
        }

        return [to]; // Fallback direct
    }

    _isValid(x, z) {
        return x >= 0 && x < this.gridSize && z >= 0 && z < this.gridSize;
    }

    _heuristic(a, b) {
        return Math.abs(a.x - b.x) + Math.abs(a.z - b.z);
    }
}
