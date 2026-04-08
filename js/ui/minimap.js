/* ====================================================
   WARZONE EXODUS — MINIMAP
   Canvas-based tactical minimap
   ==================================================== */

class MinimapRenderer {
    constructor() {
        this.canvas = document.getElementById('minimap');
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.scale = this.canvas.width / (C.WORLD_SIZE * 0.6);
        this.angle = 0;
        this.showEnemies = true;
    }

    update(player, enemies, npcs, world, dayNight) {
        const ctx = this.ctx;
        const W = this.canvas.width;
        const H = this.canvas.height;
        const cx = W / 2;
        const cy = H / 2;
        const viewRange = 120; // world units visible on minimap
        const miniScale = W / (viewRange * 2);

        // Clear with zone color
        ctx.fillStyle = '#111820';
        ctx.fillRect(0, 0, W, H);

        // Night tint
        if (dayNight && !dayNight.isDaytime()) {
            ctx.fillStyle = 'rgba(0,0,40,0.3)';
            ctx.fillRect(0, 0, W, H);
        }

        if (!player) return;

        const px = player.position.x;
        const pz = player.position.z;

        // Draw terrain features (roads etc) - simple grid
        ctx.strokeStyle = 'rgba(60,70,80,0.6)';
        ctx.lineWidth = 0.5;
        for (let i = -viewRange; i <= viewRange; i += 60) {
            const sx = cx + i * miniScale;
            ctx.beginPath();
            ctx.moveTo(sx, 0);
            ctx.lineTo(sx, H);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, cy + i * miniScale);
            ctx.lineTo(W, cy + i * miniScale);
            ctx.stroke();
        }

        // Draw buildings/cover as gray blocks
        if (world) {
            const cols = world.getCollidables();
            ctx.fillStyle = 'rgba(80,90,100,0.7)';
            for (const col of cols) {
                const relX = (col.x - px + col.width / 2) * miniScale + cx;
                const relZ = (col.z - pz + col.depth / 2) * miniScale + cy;
                const w = col.width * miniScale;
                const h = col.depth * miniScale;
                if (relX > -w && relX < W + w && relZ > -h && relZ < H + h) {
                    ctx.fillRect(relX - w / 2, relZ - h / 2, w, h);
                }
            }
        }

        // Draw loot (yellow dots)
        if (world) {
            ctx.fillStyle = '#ffdd00';
            const lootPts = world.getLootPoints();
            for (const pt of lootPts) {
                const relX = (pt.x - px) * miniScale + cx;
                const relZ = (pt.z - pz) * miniScale + cy;
                if (relX >= 0 && relX <= W && relZ >= 0 && relZ <= H) {
                    ctx.beginPath();
                    ctx.arc(relX, relZ, 2, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

        // Draw enemies
        for (const enemy of enemies) {
            if (!enemy.isAlive) continue;
            const relX = (enemy.position.x - px) * miniScale + cx;
            const relZ = (enemy.position.z - pz) * miniScale + cy;
            if (relX < -5 || relX > W + 5 || relZ < -5 || relZ > H + 5) continue;

            // Boss gets bigger dot
            const dotSize = enemy.isBoss ? 5 : 3;
            const col = enemy.isBoss ? '#ff4400' :
                (enemy.alertLevel > 0.5 ? '#ff2244' : '#ff6644');

            // Drone reveals enemies more clearly
            if (enemy._revealedByDrone) {
                ctx.fillStyle = '#ff0000';
                ctx.beginPath();
                ctx.arc(relX, relZ, dotSize + 2, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.fillStyle = col;
            ctx.beginPath();
            ctx.arc(relX, relZ, dotSize, 0, Math.PI * 2);
            ctx.fill();

            // Alert triangle for alerted enemies
            if (enemy.alertLevel > 0.5) {
                ctx.strokeStyle = '#ff2244';
                ctx.lineWidth = 0.8;
                ctx.beginPath();
                ctx.moveTo(relX, relZ - 7);
                ctx.lineTo(relX - 4, relZ);
                ctx.lineTo(relX + 4, relZ);
                ctx.closePath();
                ctx.stroke();
            }
        }

        // Draw NPCs (yellow)
        if (npcs) {
            for (const npc of npcs) {
                if (!npc.isAlive) continue;
                const relX = (npc.position.x - px) * miniScale + cx;
                const relZ = (npc.position.z - pz) * miniScale + cy;
                if (relX < 0 || relX > W || relZ < 0 || relZ > H) continue;

                ctx.fillStyle = '#ffdd44';
                ctx.beginPath();
                ctx.arc(relX, relZ, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Draw player (center, green arrow)
        this._drawPlayerArrow(ctx, cx, cy, player.yaw);

        // Draw compass tick marks
        this._drawCompassRing(ctx, W, H, player.yaw);

        // Minimap border (circular clip)
        ctx.strokeStyle = 'rgba(0,212,255,0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, W / 2 - 1, 0, Math.PI * 2);
        ctx.stroke();

        // Zone name under minimap (updated separately via DOM)
        const zoneEl = document.getElementById('minimap-zone');
        if (zoneEl && world) {
            const zone = C.ZONES.find(z => z.id === world.currentZone);
            zoneEl.textContent = zone ? zone.name.toUpperCase() : '';
        }

        // North indicator
        const compassEl = document.getElementById('minimap-compass');
        if (compassEl) {
            const northAngle = -player.yaw;
            compassEl.style.transform = `translateX(-50%) rotate(${Utils.radToDeg(northAngle)}deg)`;
        }
    }

    _drawPlayerArrow(ctx, cx, cy, yaw) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(yaw);

        // Arrow shape
        ctx.fillStyle = '#00ff88';
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.moveTo(0, -7);
        ctx.lineTo(-4, 5);
        ctx.lineTo(0, 2);
        ctx.lineTo(4, 5);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    _drawCompassRing(ctx, W, H, yaw) {
        const cx = W / 2, cy = H / 2;
        const radius = W / 2 - 4;

        const directions = [
            { label: 'N', angle: -Math.PI / 2 },
            { label: 'E', angle: 0 },
            { label: 'S', angle: Math.PI / 2 },
            { label: 'W', angle: Math.PI }
        ];

        directions.forEach(({ label, angle }) => {
            const adjAngle = angle + yaw;
            const x = cx + Math.cos(adjAngle) * (radius - 6);
            const y = cy + Math.sin(adjAngle) * (radius - 6);

            ctx.font = 'bold 8px Orbitron, monospace';
            ctx.fillStyle = label === 'N' ? '#ff4444' : 'rgba(255,255,255,0.5)';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, x, y);
        });
    }

    // Show ping/alert on minimap
    showPing(worldX, worldZ, player, color = '#ff0000') {
        // Will be visible for a few frames via a timer
        this._pings = this._pings || [];
        this._pings.push({ x: worldX, z: worldZ, color, timer: 3, maxTimer: 3 });
        setTimeout(() => this._pings?.shift(), 3000);
    }
}
