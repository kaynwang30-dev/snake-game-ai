/* ========================================
   蛇核心类
   ======================================== */

class Snake {
    constructor(config) {
        this.id = config.id || 'player';
        this.name = config.name || '玩家';
        this.color = config.color || '#00f0ff';
        this.isPlayer = config.isPlayer || false;
        this.isAI = config.isAI || false;
        
        // 蛇身体段
        this.segments = [];
        this.direction = { ...Utils.DIR.RIGHT };
        this.nextDirection = { ...Utils.DIR.RIGHT };
        
        // 状态
        this.alive = true;
        this.score = 0;
        this.kills = 0;
        this.foodEaten = 0;
        this.maxLength = 0;
        
        // 效果
        this.effects = {};
        this.speedMultiplier = 1;
        this.ghostMode = false;
        
        // 移动计时
        this.moveTimer = 0;
        this.moveInterval = config.moveInterval || 1;
        
        // 动画
        this.headAngle = 0;
        this.eyeBlink = 0;
        this.deathTime = 0;
        
        // 初始化位置
        this._initPosition(config.startX, config.startY, config.startDir, config.length || 3);
    }

    _initPosition(x, y, dir, length) {
        this.segments = [];
        const d = dir || Utils.DIR.RIGHT;
        this.direction = { ...d };
        this.nextDirection = { ...d };
        
        for (let i = 0; i < length; i++) {
            this.segments.push({
                x: x - d.x * i,
                y: y - d.y * i
            });
        }
        this.maxLength = length;
    }

    // 获取头部位置
    get head() {
        return this.segments[0];
    }

    // 获取长度
    get length() {
        return this.segments.length;
    }

    // 设置方向（防止180度转向）
    setDirection(dir) {
        if (!Utils.isOpposite(dir, this.direction)) {
            this.nextDirection = { ...dir };
        }
    }

    // 更新蛇
    update(cols, rows) {
        if (!this.alive) return;

        this.moveTimer++;
        
        // 更新效果
        this._updateEffects();

        // 实际移动间隔
        const interval = Math.max(1, Math.round(this.moveInterval / this.speedMultiplier));
        
        if (this.moveTimer < interval) return false;
        this.moveTimer = 0;

        // 应用方向
        this.direction = { ...this.nextDirection };

        // 计算新头部位置
        const newHead = {
            x: this.head.x + this.direction.x,
            y: this.head.y + this.direction.y
        };

        // 边界穿越
        if (newHead.x < 0) newHead.x = cols - 1;
        if (newHead.x >= cols) newHead.x = 0;
        if (newHead.y < 0) newHead.y = rows - 1;
        if (newHead.y >= rows) newHead.y = 0;

        // 插入新头部
        this.segments.unshift(newHead);
        // 移除尾巴（如果没有生长）
        this.segments.pop();

        // 更新动画
        this.headAngle = Math.atan2(this.direction.y, this.direction.x);
        this.eyeBlink = Math.max(0, this.eyeBlink - 1);
        if (Math.random() < 0.01) this.eyeBlink = 5;

        return true; // 表示实际移动了
    }

    // 生长
    grow(amount = 1) {
        for (let i = 0; i < amount; i++) {
            const tail = this.segments[this.segments.length - 1];
            this.segments.push({ ...tail });
        }
        this.maxLength = Math.max(this.maxLength, this.length);
    }

    // 添加效果
    addEffect(type, duration = 100) {
        this.effects[type] = duration;
        if (type === 'speed') this.speedMultiplier = 1.5;
        if (type === 'ghost') this.ghostMode = true;
    }

    // 更新效果
    _updateEffects() {
        for (const [type, timer] of Object.entries(this.effects)) {
            this.effects[type]--;
            if (this.effects[type] <= 0) {
                delete this.effects[type];
                if (type === 'speed') this.speedMultiplier = 1;
                if (type === 'ghost') this.ghostMode = false;
            }
        }
    }

    // 检查是否撞到自己
    checkSelfCollision() {
        if (this.ghostMode) return false;
        for (let i = 1; i < this.segments.length; i++) {
            if (Utils.samePos(this.head, this.segments[i])) {
                return true;
            }
        }
        return false;
    }

    // 检查是否撞到另一条蛇
    checkSnakeCollision(otherSnake) {
        if (!otherSnake.alive || this.ghostMode) return false;
        for (const seg of otherSnake.segments) {
            if (Utils.samePos(this.head, seg)) {
                return true;
            }
        }
        return false;
    }

    // 检查是否撞到障碍物
    checkObstacleCollision(obstacles) {
        if (this.ghostMode) return false;
        return obstacles.has(`${this.head.x},${this.head.y}`);
    }

    // 获取身体占据的位置集合
    getOccupiedSet() {
        const set = new Set();
        for (const seg of this.segments) {
            set.add(`${seg.x},${seg.y}`);
        }
        return set;
    }

    // 死亡
    die() {
        this.alive = false;
        this.deathTime = Date.now();
    }

    // 重置
    reset(x, y, dir) {
        this.alive = true;
        this.score = 0;
        this.kills = 0;
        this.foodEaten = 0;
        this.effects = {};
        this.speedMultiplier = 1;
        this.ghostMode = false;
        this.moveTimer = 0;
        this.deathTime = 0;
        this._initPosition(x, y, dir, 3);
    }
}
