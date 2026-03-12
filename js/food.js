/* ========================================
   食物系统模块
   ======================================== */

class FoodManager {
    constructor() {
        this.foods = [];
        this.animTime = 0;
    }

    // 食物类型定义
    static TYPES = {
        normal: {
            emoji: '🍎',
            points: 10,
            growth: 1,
            color: '#ff3344',
            glow: '#ff6666',
            chance: 0.6,
            name: '苹果'
        },
        golden: {
            emoji: '⭐',
            points: 30,
            growth: 2,
            color: '#ffaa00',
            glow: '#ffcc44',
            chance: 0.15,
            name: '金星'
        },
        speed: {
            emoji: '⚡',
            points: 15,
            growth: 1,
            color: '#00f0ff',
            glow: '#66ffff',
            chance: 0.1,
            effect: 'speed',
            name: '闪电'
        },
        mega: {
            emoji: '💎',
            points: 50,
            growth: 3,
            color: '#aa44ff',
            glow: '#cc88ff',
            chance: 0.08,
            name: '钻石'
        },
        ghost: {
            emoji: '👻',
            points: 20,
            growth: 1,
            color: '#88aacc',
            glow: '#aaccee',
            chance: 0.07,
            effect: 'ghost',
            name: '幽灵'
        }
    };

    // 生成食物
    spawn(cols, rows, occupiedSet, count = 1) {
        const types = Object.keys(FoodManager.TYPES);
        
        for (let i = 0; i < count; i++) {
            let pos;
            let attempts = 0;
            do {
                pos = {
                    x: Utils.randInt(1, cols - 2),
                    y: Utils.randInt(1, rows - 2)
                };
                attempts++;
            } while (occupiedSet.has(`${pos.x},${pos.y}`) && attempts < 100);

            if (attempts >= 100) continue;

            // 随机类型
            const roll = Math.random();
            let cumulative = 0;
            let selectedType = 'normal';
            for (const [type, config] of Object.entries(FoodManager.TYPES)) {
                cumulative += config.chance;
                if (roll < cumulative) {
                    selectedType = type;
                    break;
                }
            }

            const food = {
                x: pos.x,
                y: pos.y,
                type: selectedType,
                ...FoodManager.TYPES[selectedType],
                spawnTime: Date.now(),
                pulsePhase: Math.random() * Math.PI * 2
            };

            this.foods.push(food);
            occupiedSet.add(`${pos.x},${pos.y}`);
        }
    }

    // 移除食物
    remove(index) {
        this.foods.splice(index, 1);
    }

    // 查找位置上的食物
    getAt(x, y) {
        for (let i = 0; i < this.foods.length; i++) {
            if (this.foods[i].x === x && this.foods[i].y === y) {
                return { food: this.foods[i], index: i };
            }
        }
        return null;
    }

    // 找最近的食物
    findNearest(pos) {
        let nearest = null;
        let minDist = Infinity;
        for (const food of this.foods) {
            const d = Utils.manhattan(pos, food);
            if (d < minDist) {
                minDist = d;
                nearest = food;
            }
        }
        return nearest;
    }

    // 找最有价值的可达食物
    findBest(pos, maxDist = 20) {
        let best = null;
        let bestScore = -Infinity;
        for (const food of this.foods) {
            const d = Utils.manhattan(pos, food);
            if (d > maxDist) continue;
            // 价值/距离 比率
            const score = food.points / (d + 1);
            if (score > bestScore) {
                bestScore = score;
                best = food;
            }
        }
        return best;
    }

    // 更新动画
    update() {
        this.animTime += 0.05;
    }

    // 获取所有食物位置集合
    getOccupiedSet() {
        const set = new Set();
        for (const f of this.foods) {
            set.add(`${f.x},${f.y}`);
        }
        return set;
    }

    clear() {
        this.foods = [];
    }
}
