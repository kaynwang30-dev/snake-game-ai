/* ========================================
   游戏核心引擎
   ======================================== */

class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.renderer = new GameRenderer(this.canvas);
        this.foodManager = new FoodManager();
        
        // 游戏状态
        this.state = 'idle'; // idle, countdown, playing, paused, gameover
        this.mode = 'solo'; // solo, vs-ai, ai-battle
        
        // 配置
        this.config = {
            cols: 40,
            rows: 30,
            speed: 5,
            aiCount: 3,
            foodCount: 8,
            obstacles: 'few',
            particles: true,
            sound: true
        };

        // 游戏对象
        this.playerSnake = null;
        this.aiControllers = [];
        this.allSnakes = [];
        this.obstacles = new Set();
        
        // 计时
        this.gameTime = 0;
        this.gameTimer = null;
        this.lastUpdate = 0;
        this.animFrame = null;

        // 事件
        this.onGameOver = null;
        this.onScoreUpdate = null;
        this.onStateChange = null;
    }

    // 设置配置
    setConfig(config) {
        Object.assign(this.config, config);
    }

    // 应用地图大小
    _applyMapSize(size) {
        const isMobile = window.innerWidth <= 768;
        if (isMobile) {
            // 移动端使用更小的地图
            switch (size) {
                case 'small': this.config.cols = 20; this.config.rows = 15; break;
                case 'medium': this.config.cols = 25; this.config.rows = 18; break;
                case 'large': this.config.cols = 30; this.config.rows = 20; break;
            }
        } else {
            switch (size) {
                case 'small': this.config.cols = 30; this.config.rows = 20; break;
                case 'medium': this.config.cols = 40; this.config.rows = 30; break;
                case 'large': this.config.cols = 60; this.config.rows = 40; break;
            }
        }
    }

    // 初始化游戏
    init(mode) {
        this.mode = mode;
        this.state = 'countdown';
        this.gameTime = 0;
        
        // 清理
        this.allSnakes = [];
        this.aiControllers = [];
        this.foodManager.clear();
        Particles.clear();
        this.obstacles = new Set();

        // 设置画布
        this.renderer.resize(this.config.cols, this.config.rows);

        // 生成障碍物
        this._generateObstacles();

        // 计算移动间隔（速度1=慢，10=快）
        const baseInterval = 12 - this.config.speed;
        const moveInterval = Math.max(1, baseInterval);

        // 创建蛇
        if (mode === 'solo' || mode === 'vs-ai') {
            this._createPlayerSnake(moveInterval);
        }

        // 创建AI蛇
        const aiCount = mode === 'solo' ? 0 : this.config.aiCount;
        this._createAISnakes(aiCount, moveInterval);

        // 生成初始食物
        this._spawnInitialFood();

        // 启动倒计时
        this._startCountdown();
    }

    // 创建玩家蛇
    _createPlayerSnake(moveInterval) {
        const startX = Math.floor(this.config.cols / 4);
        const startY = Math.floor(this.config.rows / 2);
        
        this.playerSnake = new Snake({
            id: 'player',
            name: '玩家',
            color: '#00f0ff',
            isPlayer: true,
            startX,
            startY,
            startDir: Utils.DIR.RIGHT,
            moveInterval,
            length: 3
        });
        this.allSnakes.push(this.playerSnake);
    }

    // 创建AI蛇
    _createAISnakes(count, moveInterval) {
        const positions = this._getSpawnPositions(count);
        const personalities = AIBehaviorTreeFactory.PERSONALITIES;
        const usedNames = new Set();
        const usedColors = new Set();

        for (let i = 0; i < count; i++) {
            let name;
            do {
                name = AI_NAMES[Utils.randInt(0, AI_NAMES.length - 1)];
            } while (usedNames.has(name));
            usedNames.add(name);

            let color;
            do {
                color = AI_COLORS[i % AI_COLORS.length];
            } while (usedColors.has(color));
            usedColors.add(color);

            const personality = personalities[i % personalities.length];
            const dir = Utils.DIRECTIONS[Utils.randInt(0, 3)];

            const snake = new Snake({
                id: `ai_${i}`,
                name,
                color,
                isAI: true,
                startX: positions[i].x,
                startY: positions[i].y,
                startDir: dir,
                moveInterval: moveInterval + Utils.randInt(0, 1),
                length: 3
            });

            const aiCtrl = new AISnake(snake, personality);
            
            this.allSnakes.push(snake);
            this.aiControllers.push(aiCtrl);
        }
    }

    // 获取生成位置（均匀分布）
    _getSpawnPositions(count) {
        const positions = [];
        const margin = 5;
        const cx = this.config.cols / 2;
        const cy = this.config.rows / 2;
        const radius = Math.min(cx, cy) - margin;

        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i + Math.PI / 2;
            positions.push({
                x: Math.floor(cx + Math.cos(angle) * radius * 0.6),
                y: Math.floor(cy + Math.sin(angle) * radius * 0.6)
            });
        }
        return positions;
    }

    // 生成障碍物
    _generateObstacles() {
        this.obstacles = new Set();
        let count = 0;
        
        switch (this.config.obstacles) {
            case 'none': return;
            case 'few': count = Math.floor(this.config.cols * this.config.rows * 0.02); break;
            case 'many': count = Math.floor(this.config.cols * this.config.rows * 0.05); break;
        }

        // 生成随机障碍物块
        const center = { x: this.config.cols / 2, y: this.config.rows / 2 };
        let placed = 0;
        let attempts = 0;

        while (placed < count && attempts < count * 10) {
            const x = Utils.randInt(2, this.config.cols - 3);
            const y = Utils.randInt(2, this.config.rows - 3);
            
            // 不在中心区域放障碍
            if (Utils.manhattan({ x, y }, center) < 8) {
                attempts++;
                continue;
            }

            // 随机形状
            const shape = Utils.randInt(0, 3);
            const blocks = [{ x, y }];
            
            if (shape === 1) { // L形
                blocks.push({ x: x + 1, y }, { x, y: y + 1 });
            } else if (shape === 2) { // 横线
                blocks.push({ x: x + 1, y }, { x: x + 2, y });
            } else if (shape === 3) { // 竖线
                blocks.push({ x, y: y + 1 }, { x, y: y + 2 });
            }

            let valid = true;
            for (const b of blocks) {
                if (b.x < 1 || b.x >= this.config.cols - 1 || b.y < 1 || b.y >= this.config.rows - 1) {
                    valid = false;
                    break;
                }
            }

            if (valid) {
                for (const b of blocks) {
                    this.obstacles.add(`${b.x},${b.y}`);
                    placed++;
                }
            }
            attempts++;
        }
    }

    // 生成初始食物
    _spawnInitialFood() {
        const occupied = this._getAllOccupied();
        this.foodManager.spawn(this.config.cols, this.config.rows, occupied, this.config.foodCount);
    }

    // 获取所有占据的位置
    _getAllOccupied() {
        const set = new Set(this.obstacles);
        for (const snake of this.allSnakes) {
            if (!snake.alive) continue;
            for (const seg of snake.segments) {
                set.add(`${seg.x},${seg.y}`);
            }
        }
        for (const f of this.foodManager.foods) {
            set.add(`${f.x},${f.y}`);
        }
        return set;
    }

    // 倒计时
    _startCountdown() {
        let count = 3;
        const wrapper = document.getElementById('game-canvas-wrapper');
        
        const showCount = () => {
            // 移除旧的倒计时
            const old = wrapper.querySelector('.countdown-overlay');
            if (old) old.remove();

            if (count > 0) {
                const overlay = document.createElement('div');
                overlay.className = 'countdown-overlay';
                overlay.innerHTML = `<div class="countdown-number">${count}</div>`;
                wrapper.appendChild(overlay);
                Sound.play('countdown');
                count--;
                setTimeout(showCount, 1000);
            } else {
                // 显示GO
                const overlay = document.createElement('div');
                overlay.className = 'countdown-overlay';
                overlay.innerHTML = `<div class="countdown-number" style="color: #00ff88;">GO!</div>`;
                wrapper.appendChild(overlay);
                Sound.play('start');
                
                setTimeout(() => {
                    overlay.remove();
                    this._startGame();
                }, 800);
            }
        };

        // 先渲染一帧
        this._render();
        setTimeout(showCount, 500);
    }

    // 开始游戏
    _startGame() {
        this.state = 'playing';
        this.lastUpdate = performance.now();
        
        // 游戏计时器
        this.gameTimer = setInterval(() => {
            if (this.state === 'playing') {
                this.gameTime++;
                this._updateHUD();
            }
        }, 1000);

        // 游戏循环
        this._gameLoop();
    }

    // 游戏主循环
    _gameLoop() {
        if (this.state !== 'playing' && this.state !== 'paused') {
            // gameover时也需要继续渲染一小段动画
            if (this.state === 'gameover') {
                this._render();
            }
            return;
        }

        if (this.state === 'playing') {
            this._update();
        }
        
        this._render();
        this.animFrame = requestAnimationFrame(() => this._gameLoop());
    }

    // 游戏更新
    _update() {
        // AI思考
        const gameState = {
            allSnakes: this.allSnakes,
            foodManager: this.foodManager,
            obstacles: this.obstacles,
            cols: this.config.cols,
            rows: this.config.rows
        };

        for (const ai of this.aiControllers) {
            ai.think(gameState);
        }

        // 更新所有蛇
        for (const snake of this.allSnakes) {
            const moved = snake.update(this.config.cols, this.config.rows);
            if (moved) {
                this._checkCollisions(snake);
            }
        }

        // 更新食物
        this.foodManager.update();

        // 补充食物
        if (this.foodManager.foods.length < this.config.foodCount) {
            const occupied = this._getAllOccupied();
            this.foodManager.spawn(this.config.cols, this.config.rows, occupied, 1);
        }

        // 更新粒子
        Particles.update();

        // 更新HUD
        this._updateHUD();

        // 检查游戏结束
        this._checkGameEnd();
    }

    // 碰撞检测
    _checkCollisions(snake) {
        if (!snake.alive) return;

        // 检查吃食物
        const foodResult = this.foodManager.getAt(snake.head.x, snake.head.y);
        if (foodResult) {
            const { food, index } = foodResult;
            snake.score += food.points;
            snake.foodEaten++;
            snake.grow(food.growth);
            
            // 食物效果
            if (food.effect) {
                snake.addEffect(food.effect);
                Sound.play('powerup');
            } else {
                Sound.play('eat');
            }

            // 粒子效果
            const cs = this.renderer.cellSize;
            Particles.eatEffect(
                food.x * cs + cs / 2,
                food.y * cs + cs / 2,
                food.color
            );

            this.foodManager.remove(index);

            if (this.onScoreUpdate) this.onScoreUpdate(snake);
        }

        // 检查撞障碍物
        if (snake.checkObstacleCollision(this.obstacles)) {
            this._killSnake(snake, null);
            return;
        }

        // 检查自身碰撞
        if (snake.checkSelfCollision()) {
            this._killSnake(snake, null);
            return;
        }

        // 检查与其他蛇碰撞
        for (const other of this.allSnakes) {
            if (other === snake || !other.alive) continue;
            
            // 头对头碰撞
            if (Utils.samePos(snake.head, other.head)) {
                if (snake.length > other.length) {
                    this._killSnake(other, snake);
                } else if (other.length > snake.length) {
                    this._killSnake(snake, other);
                } else {
                    // 同长度两败俱伤
                    this._killSnake(snake, other);
                    this._killSnake(other, snake);
                }
                return;
            }

            // 头撞身体
            if (snake.checkSnakeCollision(other)) {
                this._killSnake(snake, other);
                return;
            }
        }
    }

    // 击杀蛇
    _killSnake(victim, killer) {
        if (!victim.alive) return;
        
        victim.die();
        Sound.play('die');

        // 粒子效果
        const cs = this.renderer.cellSize;
        Particles.deathEffect(victim.segments, victim.color, cs);

        // 击杀者加分
        if (killer && killer.alive) {
            killer.score += 50 + victim.length * 5;
            killer.kills++;
            Sound.play('kill');
            
            // 击杀粒子
            Particles.explode(
                killer.head.x * cs + cs / 2,
                killer.head.y * cs + cs / 2,
                killer.color
            );
        }

        // 死亡的蛇在原地留下一些食物
        const occupied = this._getAllOccupied();
        for (let i = 0; i < Math.min(3, Math.floor(victim.length / 3)); i++) {
            const seg = victim.segments[Math.floor(Math.random() * victim.segments.length)];
            const key = `${seg.x},${seg.y}`;
            if (!occupied.has(key) && !this.obstacles.has(key)) {
                this.foodManager.foods.push({
                    x: seg.x,
                    y: seg.y,
                    type: 'normal',
                    ...FoodManager.TYPES.normal,
                    spawnTime: Date.now(),
                    pulsePhase: Math.random() * Math.PI * 2
                });
            }
        }
    }

    // 检查游戏结束
    _checkGameEnd() {
        let ended = false;
        let title = '游戏结束';

        if (this.mode === 'solo') {
            if (this.playerSnake && !this.playerSnake.alive) {
                ended = true;
                title = '💀 游戏结束';
            }
        } else if (this.mode === 'vs-ai') {
            if (this.playerSnake && !this.playerSnake.alive) {
                ended = true;
                title = '💀 你被淘汰了';
            }
            const aliveCount = this.allSnakes.filter(s => s.alive).length;
            if (aliveCount <= 1) {
                ended = true;
                const winner = this.allSnakes.find(s => s.alive);
                if (winner && winner.isPlayer) {
                    title = '🏆 胜利！';
                } else if (winner) {
                    title = `${winner.name} 获胜！`;
                } else {
                    title = '全军覆没！';
                }
            }
        } else if (this.mode === 'ai-battle') {
            const aliveCount = this.allSnakes.filter(s => s.alive).length;
            if (aliveCount <= 1) {
                ended = true;
                const winner = this.allSnakes.find(s => s.alive);
                title = winner ? `🏆 ${winner.name} 获胜！` : '全军覆没！';
            }
        }

        if (ended) {
            this._endGame(title);
        }
    }

    // 结束游戏
    _endGame(title) {
        this.state = 'gameover';
        clearInterval(this.gameTimer);
        if (this.animFrame) {
            cancelAnimationFrame(this.animFrame);
        }

        // 排行榜
        const rankings = this._getRankings();

        if (this.onGameOver) {
            this.onGameOver({
                title,
                rankings,
                playerSnake: this.playerSnake,
                gameTime: this.gameTime,
                mode: this.mode
            });
        }
    }

    // 获取排行
    _getRankings() {
        return [...this.allSnakes].sort((a, b) => {
            if (a.alive !== b.alive) return a.alive ? -1 : 1;
            return b.score - a.score;
        });
    }

    // 渲染
    _render() {
        this.renderer.clear();
        this.renderer.drawObstacles(this.obstacles);
        this.renderer.drawFood(this.foodManager);

        // 绘制所有蛇（玩家蛇最后绘制，保证在最上层）
        const sortedSnakes = [...this.allSnakes].sort((a, b) => {
            if (a.isPlayer) return 1;
            if (b.isPlayer) return -1;
            return 0;
        });

        for (const snake of sortedSnakes) {
            this.renderer.drawSnake(snake, snake.isPlayer);
        }

        // 绘制名字标签
        for (const snake of this.allSnakes) {
            this.renderer.drawNameTag(snake);
        }

        // 绘制边界
        this.renderer.drawBorder();

        // 绘制粒子
        Particles.draw(this.renderer.ctx);
    }

    // 更新HUD
    _updateHUD() {
        const timerEl = document.getElementById('game-timer');
        if (timerEl) timerEl.textContent = Utils.formatTime(this.gameTime);

        if (this.playerSnake) {
            const scoreEl = document.getElementById('player-score');
            const lengthEl = document.getElementById('player-length');
            if (scoreEl) scoreEl.textContent = this.playerSnake.score;
            if (lengthEl) lengthEl.textContent = this.playerSnake.length;
        }

        // 更新AI状态面板
        this._updateAIPanel();
        
        // 更新排行榜
        this._updateLeaderboard();
    }

    // 更新AI面板
    _updateAIPanel() {
        const list = document.getElementById('ai-status-list');
        if (!list) return;

        let html = '';
        for (const ai of this.aiControllers) {
            const info = ai.getStatusInfo();
            const deadClass = info.alive ? '' : 'ai-dead';
            html += `
                <div class="ai-status-item ${deadClass}">
                    <div class="ai-color-dot" style="background:${info.color}"></div>
                    <span class="ai-name">${info.emoji} ${info.name}</span>
                    <span class="ai-score">${info.score}</span>
                    <span class="ai-behavior">${info.behavior}</span>
                </div>
            `;
        }
        list.innerHTML = html;
    }

    // 更新排行榜
    _updateLeaderboard() {
        const list = document.getElementById('leaderboard-list');
        if (!list) return;

        const rankings = this._getRankings();
        let html = '';
        rankings.forEach((snake, idx) => {
            const isPlayer = snake.isPlayer ? 'is-player' : '';
            const statusIcon = snake.alive ? '' : '💀';
            html += `
                <div class="lb-item ${isPlayer}">
                    <span class="lb-rank">#${idx + 1}</span>
                    <span class="lb-color" style="background:${snake.color}"></span>
                    <span class="lb-name">${statusIcon}${snake.name}</span>
                    <span class="lb-score">${snake.score}</span>
                </div>
            `;
        });
        list.innerHTML = html;
    }

    // 暂停/继续
    togglePause() {
        if (this.state === 'playing') {
            this.state = 'paused';
            if (this.animFrame) {
                cancelAnimationFrame(this.animFrame);
                this.animFrame = null;
            }
            document.getElementById('game-overlay').classList.remove('hidden');
            document.getElementById('overlay-title').textContent = '⏸️ 暂停';
            document.getElementById('overlay-message').textContent = '按 ESC 或空格键继续';
        } else if (this.state === 'paused') {
            this.state = 'playing';
            document.getElementById('game-overlay').classList.add('hidden');
            this.lastUpdate = performance.now();
            this._gameLoop();
        }
    }

    // 玩家输入
    handleInput(key) {
        if (!this.playerSnake || !this.playerSnake.alive) return;
        if (this.state !== 'playing') return;

        switch (key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                this.playerSnake.setDirection(Utils.DIR.UP);
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                this.playerSnake.setDirection(Utils.DIR.DOWN);
                break;
            case 'ArrowLeft':
            case 'a':
            case 'A':
                this.playerSnake.setDirection(Utils.DIR.LEFT);
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                this.playerSnake.setDirection(Utils.DIR.RIGHT);
                break;
        }
    }

    // 清理
    destroy() {
        this.state = 'idle';
        clearInterval(this.gameTimer);
        if (this.animFrame) {
            cancelAnimationFrame(this.animFrame);
        }
        Particles.clear();
    }
}
