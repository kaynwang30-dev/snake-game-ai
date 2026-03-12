/* ========================================
   游戏渲染器
   ======================================== */

class GameRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.cellSize = 16;
        this.animTime = 0;
        this.theme = 'cyber';
        this.camera = { x: 0, y: 0 };
    }

    // 设置画布大小
    resize(cols, rows) {
        const isMobile = window.innerWidth <= 768;
        const hudHeight = isMobile ? 44 : 60;
        // 移动端底部留出方向键空间
        const controlsHeight = isMobile ? 170 : 0;
        const padding = isMobile ? 10 : 40;
        
        const maxW = window.innerWidth - padding;
        const maxH = window.innerHeight - hudHeight - controlsHeight - (isMobile ? 10 : 80);
        
        this.cellSize = Math.floor(Math.min(maxW / cols, maxH / rows));
        this.cellSize = Math.max(6, Math.min(24, this.cellSize));
        
        this.canvas.width = cols * this.cellSize;
        this.canvas.height = rows * this.cellSize;
        
        this.cols = cols;
        this.rows = rows;
    }

    // 清屏
    clear() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // 背景
        ctx.fillStyle = '#0a0a18';
        ctx.fillRect(0, 0, w, h);

        // 网格
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.04)';
        ctx.lineWidth = 0.5;
        for (let x = 0; x <= this.cols; x++) {
            ctx.beginPath();
            ctx.moveTo(x * this.cellSize, 0);
            ctx.lineTo(x * this.cellSize, h);
            ctx.stroke();
        }
        for (let y = 0; y <= this.rows; y++) {
            ctx.beginPath();
            ctx.moveTo(0, y * this.cellSize);
            ctx.lineTo(w, y * this.cellSize);
            ctx.stroke();
        }
    }

    // 绘制障碍物
    drawObstacles(obstacles) {
        const ctx = this.ctx;
        const cs = this.cellSize;

        for (const key of obstacles) {
            const [x, y] = key.split(',').map(Number);
            
            // 渐变障碍物
            const grd = ctx.createLinearGradient(
                x * cs, y * cs, (x + 1) * cs, (y + 1) * cs
            );
            grd.addColorStop(0, '#2a2a4a');
            grd.addColorStop(1, '#1a1a3a');
            
            ctx.fillStyle = grd;
            ctx.fillRect(x * cs + 1, y * cs + 1, cs - 2, cs - 2);
            
            // 边框
            ctx.strokeStyle = 'rgba(100, 100, 160, 0.5)';
            ctx.lineWidth = 1;
            ctx.strokeRect(x * cs + 1, y * cs + 1, cs - 2, cs - 2);
            
            // 高光
            ctx.fillStyle = 'rgba(100, 100, 200, 0.1)';
            ctx.fillRect(x * cs + 2, y * cs + 2, cs / 2 - 2, 2);
        }
    }

    // 绘制食物
    drawFood(foodManager) {
        const ctx = this.ctx;
        const cs = this.cellSize;
        this.animTime += 0.03;

        for (const food of foodManager.foods) {
            const cx = food.x * cs + cs / 2;
            const cy = food.y * cs + cs / 2;
            const pulse = Math.sin(this.animTime * 3 + food.pulsePhase) * 0.15 + 0.85;
            const radius = (cs / 2 - 2) * pulse;

            // 光晕
            ctx.save();
            ctx.globalAlpha = 0.3 + Math.sin(this.animTime * 2 + food.pulsePhase) * 0.15;
            const glowGrd = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 2);
            glowGrd.addColorStop(0, food.glow);
            glowGrd.addColorStop(1, 'transparent');
            ctx.fillStyle = glowGrd;
            ctx.beginPath();
            ctx.arc(cx, cy, radius * 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // 食物本体
            ctx.save();
            ctx.font = `${cs - 4}px serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(food.emoji, cx, cy + 1);
            ctx.restore();
        }
    }

    // 绘制蛇
    drawSnake(snake, isMainPlayer = false) {
        if (!snake.alive && Date.now() - snake.deathTime > 2000) return;
        
        const ctx = this.ctx;
        const cs = this.cellSize;
        const segs = snake.segments;
        
        // 死亡闪烁效果
        if (!snake.alive) {
            const elapsed = Date.now() - snake.deathTime;
            if (Math.floor(elapsed / 100) % 2 === 0) return;
        }

        const color = snake.color;
        const ghostAlpha = snake.ghostMode ? 0.5 : 1;

        ctx.save();
        ctx.globalAlpha = ghostAlpha;

        // 绘制身体
        for (let i = segs.length - 1; i >= 0; i--) {
            const seg = segs[i];
            const x = seg.x * cs;
            const y = seg.y * cs;
            const ratio = i / segs.length;
            const segSize = cs - 2 - ratio * 2;

            if (i === 0) {
                // 头部
                this._drawHead(x, y, cs, snake, color, isMainPlayer);
            } else {
                // 身体段
                const brightness = 1 - ratio * 0.4;
                const bodyColor = Utils.hexToRgba(color, brightness);
                
                ctx.fillStyle = bodyColor;
                
                // 圆角身体
                const padding = (cs - segSize) / 2;
                ctx.beginPath();
                this._roundRect(ctx, x + padding, y + padding, segSize, segSize, 4);
                ctx.fill();
                
                // 身体花纹
                if (i % 3 === 0) {
                    ctx.fillStyle = Utils.hexToRgba(color, 0.3);
                    ctx.beginPath();
                    ctx.arc(x + cs / 2, y + cs / 2, segSize / 4, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

        // 效果指示器
        if (snake.effects.speed) {
            ctx.strokeStyle = '#00f0ff';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.strokeRect(segs[0].x * cs, segs[0].y * cs, cs, cs);
            ctx.setLineDash([]);
        }
        if (snake.effects.ghost) {
            ctx.strokeStyle = '#8888cc';
            ctx.lineWidth = 2;
            ctx.setLineDash([2, 2]);
            ctx.strokeRect(segs[0].x * cs, segs[0].y * cs, cs, cs);
            ctx.setLineDash([]);
        }

        ctx.restore();
    }

    // 绘制蛇头
    _drawHead(x, y, cs, snake, color, isMainPlayer) {
        const ctx = this.ctx;
        const cx = x + cs / 2;
        const cy = y + cs / 2;
        const headSize = cs - 1;

        // 头部光晕（主玩家更明显）
        if (isMainPlayer) {
            ctx.save();
            ctx.globalAlpha = 0.3;
            const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, cs);
            glow.addColorStop(0, color);
            glow.addColorStop(1, 'transparent');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(cx, cy, cs, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // 头部本体
        ctx.fillStyle = color;
        ctx.beginPath();
        this._roundRect(ctx, x + (cs - headSize) / 2, y + (cs - headSize) / 2, headSize, headSize, 6);
        ctx.fill();

        // 头部高光
        ctx.fillStyle = Utils.hexToRgba('#ffffff', 0.2);
        ctx.beginPath();
        ctx.arc(cx - 1, cy - 1, cs / 4, 0, Math.PI * 2);
        ctx.fill();

        // 眼睛
        const eyeOffset = cs / 5;
        const eyeSize = cs / 6;
        const dir = snake.direction;
        
        let eye1, eye2;
        if (dir.x === 1) {
            eye1 = { x: cx + eyeOffset, y: cy - eyeOffset };
            eye2 = { x: cx + eyeOffset, y: cy + eyeOffset };
        } else if (dir.x === -1) {
            eye1 = { x: cx - eyeOffset, y: cy - eyeOffset };
            eye2 = { x: cx - eyeOffset, y: cy + eyeOffset };
        } else if (dir.y === -1) {
            eye1 = { x: cx - eyeOffset, y: cy - eyeOffset };
            eye2 = { x: cx + eyeOffset, y: cy - eyeOffset };
        } else {
            eye1 = { x: cx - eyeOffset, y: cy + eyeOffset };
            eye2 = { x: cx + eyeOffset, y: cy + eyeOffset };
        }

        const blinking = snake.eyeBlink > 0;
        
        // 眼白
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(eye1.x, eye1.y, eyeSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(eye2.x, eye2.y, eyeSize, 0, Math.PI * 2);
        ctx.fill();

        if (!blinking) {
            // 瞳孔
            ctx.fillStyle = '#111111';
            ctx.beginPath();
            ctx.arc(eye1.x + dir.x * 1, eye1.y + dir.y * 1, eyeSize * 0.6, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(eye2.x + dir.x * 1, eye2.y + dir.y * 1, eyeSize * 0.6, 0, Math.PI * 2);
            ctx.fill();
        }

        // 王冠标识（如果是第一名）
        if (isMainPlayer) {
            ctx.font = `${cs / 2}px serif`;
            ctx.textAlign = 'center';
            ctx.fillText('👑', cx, y - 2);
        }
    }

    // 绘制名字标签
    drawNameTag(snake, rank) {
        if (!snake.alive) return;
        const ctx = this.ctx;
        const cs = this.cellSize;
        const head = snake.segments[0];
        const x = head.x * cs + cs / 2;
        const y = head.y * cs - 8;

        ctx.save();
        ctx.font = 'bold 10px Rajdhani, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        const text = `${snake.name} [${snake.score}]`;
        const metrics = ctx.measureText(text);
        ctx.fillRect(x - metrics.width / 2 - 3, y - 9, metrics.width + 6, 13);
        ctx.fillStyle = snake.color;
        ctx.fillText(text, x, y);
        ctx.restore();
    }

    // 绘制边界
    drawBorder() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, w, h);
        
        // 四角装饰
        const cornerSize = 15;
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.6)';
        ctx.lineWidth = 2;
        
        // 左上
        ctx.beginPath();
        ctx.moveTo(0, cornerSize);
        ctx.lineTo(0, 0);
        ctx.lineTo(cornerSize, 0);
        ctx.stroke();
        
        // 右上
        ctx.beginPath();
        ctx.moveTo(w - cornerSize, 0);
        ctx.lineTo(w, 0);
        ctx.lineTo(w, cornerSize);
        ctx.stroke();
        
        // 左下
        ctx.beginPath();
        ctx.moveTo(0, h - cornerSize);
        ctx.lineTo(0, h);
        ctx.lineTo(cornerSize, h);
        ctx.stroke();
        
        // 右下
        ctx.beginPath();
        ctx.moveTo(w - cornerSize, h);
        ctx.lineTo(w, h);
        ctx.lineTo(w, h - cornerSize);
        ctx.stroke();
    }

    // 绘制迷你地图
    drawMinimap(snakes, foods) {
        // 预留功能
    }

    // 辅助：圆角矩形
    _roundRect(ctx, x, y, w, h, r) {
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }
}
