/* ========================================
   粒子特效系统
   ======================================== */

class ParticleSystem {
    constructor() {
        this.particles = [];
        this.bgParticles = [];
        this.enabled = true;
    }

    // 初始化背景粒子
    initBackground(canvas) {
        this.bgCanvas = canvas;
        this.bgCtx = canvas.getContext('2d');
        this._resizeBg();
        window.addEventListener('resize', () => this._resizeBg());
        this._createBgParticles();
        this._animateBg();
    }

    _resizeBg() {
        this.bgCanvas.width = window.innerWidth;
        this.bgCanvas.height = window.innerHeight;
    }

    _createBgParticles() {
        this.bgParticles = [];
        const count = Math.floor((window.innerWidth * window.innerHeight) / 15000);
        for (let i = 0; i < count; i++) {
            this.bgParticles.push({
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                size: Math.random() * 2 + 0.5,
                alpha: Math.random() * 0.5 + 0.1,
                color: Math.random() > 0.5 ? '#00f0ff' : '#ff00aa'
            });
        }
    }

    _animateBg() {
        const ctx = this.bgCtx;
        const w = this.bgCanvas.width;
        const h = this.bgCanvas.height;

        ctx.clearRect(0, 0, w, h);

        // 绘制网格线
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.03)';
        ctx.lineWidth = 1;
        const gridSize = 60;
        for (let x = 0; x < w; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
        }
        for (let y = 0; y < h; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }

        // 绘制背景粒子
        for (const p of this.bgParticles) {
            p.x += p.vx;
            p.y += p.vy;

            if (p.x < 0) p.x = w;
            if (p.x > w) p.x = 0;
            if (p.y < 0) p.y = h;
            if (p.y > h) p.y = 0;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = p.color.replace(')', `,${p.alpha})`).replace('rgb', 'rgba').replace('#', '');
            // 简化颜色处理
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        // 绘制粒子间连线
        for (let i = 0; i < this.bgParticles.length; i++) {
            for (let j = i + 1; j < this.bgParticles.length; j++) {
                const a = this.bgParticles[i];
                const b = this.bgParticles[j];
                const dist = Math.hypot(a.x - b.x, a.y - b.y);
                if (dist < 120) {
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.strokeStyle = `rgba(0, 240, 255, ${0.06 * (1 - dist / 120)})`;
                    ctx.stroke();
                }
            }
        }

        requestAnimationFrame(() => this._animateBg());
    }

    // 游戏内粒子效果
    emit(x, y, color, count = 8, options = {}) {
        if (!this.enabled) return;
        const {
            speed = 3,
            life = 30,
            sizeMin = 2,
            sizeMax = 5,
            gravity = 0,
            spread = Math.PI * 2
        } = options;

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * spread - spread / 2;
            const spd = Math.random() * speed + speed * 0.5;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd,
                size: Math.random() * (sizeMax - sizeMin) + sizeMin,
                life: life + Math.random() * 10,
                maxLife: life + Math.random() * 10,
                color,
                gravity,
                alpha: 1
            });
        }
    }

    // 爆炸效果
    explode(x, y, color, size = 15) {
        this.emit(x, y, color, size, { speed: 5, life: 40, sizeMax: 6 });
        // 光环
        this.particles.push({
            x, y, vx: 0, vy: 0,
            size: 2, maxSize: 40,
            life: 20, maxLife: 20,
            color, alpha: 0.6,
            isRing: true, gravity: 0
        });
    }

    // 吃食物效果
    eatEffect(x, y, color) {
        this.emit(x, y, color, 10, { speed: 4, life: 25, sizeMax: 4 });
        // 上升的+分数文字粒子
        this.particles.push({
            x, y: y - 5, vx: 0, vy: -1.5,
            size: 14, life: 40, maxLife: 40,
            color: '#ffaa00', alpha: 1,
            isText: true, text: '+10',
            gravity: 0
        });
    }

    // 死亡效果
    deathEffect(segments, color, cellSize) {
        for (const seg of segments) {
            const px = seg.x * cellSize + cellSize / 2;
            const py = seg.y * cellSize + cellSize / 2;
            this.emit(px, py, color, 4, { speed: 3, life: 35, sizeMax: 5 });
        }
    }

    // 更新粒子
    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life--;
            p.alpha = p.life / p.maxLife;

            if (p.isRing) {
                p.size += (p.maxSize - p.size) * 0.15;
            } else {
                p.x += p.vx;
                p.y += p.vy;
                p.vy += p.gravity;
                p.vx *= 0.97;
                p.vy *= 0.97;
                p.size *= 0.98;
            }

            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    // 绘制粒子
    draw(ctx) {
        for (const p of this.particles) {
            ctx.save();
            ctx.globalAlpha = p.alpha;

            if (p.isRing) {
                ctx.strokeStyle = p.color;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.stroke();
            } else if (p.isText) {
                ctx.fillStyle = p.color;
                ctx.font = `bold ${p.size}px Orbitron, sans-serif`;
                ctx.textAlign = 'center';
                ctx.fillText(p.text, p.x, p.y);
            } else {
                ctx.fillStyle = p.color;
                ctx.shadowBlur = 10;
                ctx.shadowColor = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        }
    }

    clear() {
        this.particles = [];
    }
}

const Particles = new ParticleSystem();
