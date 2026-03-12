/* ========================================
   AI 行为树系统
   ======================================== */

// ==========================================
// 行为树节点基类
// ==========================================
class BTNode {
    constructor(name) {
        this.name = name;
    }
    tick(context) {
        return 'failure'; // 'success', 'failure', 'running'
    }
}

// ==========================================
// 组合节点
// ==========================================

// 顺序节点：按顺序执行子节点，全部成功才成功
class Sequence extends BTNode {
    constructor(name, children) {
        super(name);
        this.children = children;
    }
    tick(context) {
        for (const child of this.children) {
            const result = child.tick(context);
            if (result !== 'success') return result;
        }
        return 'success';
    }
}

// 选择节点：按顺序尝试子节点，有一个成功就成功
class Selector extends BTNode {
    constructor(name, children) {
        super(name);
        this.children = children;
    }
    tick(context) {
        for (const child of this.children) {
            const result = child.tick(context);
            if (result !== 'failure') return result;
        }
        return 'failure';
    }
}

// ==========================================
// 装饰器节点
// ==========================================

// 取反
class Inverter extends BTNode {
    constructor(child) {
        super('Inverter');
        this.child = child;
    }
    tick(context) {
        const result = this.child.tick(context);
        if (result === 'success') return 'failure';
        if (result === 'failure') return 'success';
        return 'running';
    }
}

// 条件概率执行
class RandomChance extends BTNode {
    constructor(chance, child) {
        super('RandomChance');
        this.chance = chance;
        this.child = child;
    }
    tick(context) {
        if (Math.random() < this.chance) {
            return this.child.tick(context);
        }
        return 'failure';
    }
}

// ==========================================
// 条件节点（叶子）
// ==========================================

// 检查是否有危险
class IsDangerNearby extends BTNode {
    constructor() { super('IsDangerNearby'); }
    tick(ctx) {
        const { snake, allSnakes, obstacles, cols, rows } = ctx;
        const head = snake.head;
        
        // 检查4个方向的即时危险
        let dangerCount = 0;
        for (const dir of Utils.DIRECTIONS) {
            const next = {
                x: (head.x + dir.x + cols) % cols,
                y: (head.y + dir.y + rows) % rows
            };
            if (obstacles.has(`${next.x},${next.y}`)) {
                dangerCount++;
                continue;
            }
            // 检查是否会撞到蛇
            for (const other of allSnakes) {
                if (!other.alive) continue;
                for (let i = 0; i < other.segments.length; i++) {
                    if (other === snake && i === 0) continue;
                    if (Utils.samePos(next, other.segments[i])) {
                        dangerCount++;
                        break;
                    }
                }
            }
        }
        
        ctx.dangerLevel = dangerCount;
        return dangerCount >= 2 ? 'success' : 'failure';
    }
}

// 检查是否有食物附近
class IsFoodNearby extends BTNode {
    constructor(range = 10) {
        super('IsFoodNearby');
        this.range = range;
    }
    tick(ctx) {
        const nearest = ctx.foodManager.findNearest(ctx.snake.head);
        if (nearest && Utils.manhattan(ctx.snake.head, nearest) <= this.range) {
            ctx.targetFood = nearest;
            return 'success';
        }
        return 'failure';
    }
}

// 检查蛇是否较大（可以进攻）
class IsLargerThanEnemies extends BTNode {
    constructor() { super('IsLargerThanEnemies'); }
    tick(ctx) {
        const { snake, allSnakes } = ctx;
        let smallerEnemies = 0;
        for (const other of allSnakes) {
            if (other === snake || !other.alive) continue;
            if (snake.length > other.length + 2) {
                smallerEnemies++;
            }
        }
        ctx.smallerEnemies = smallerEnemies;
        return smallerEnemies > 0 ? 'success' : 'failure';
    }
}

// 检查蛇是否较小（需要防御）
class IsSmallerThanEnemies extends BTNode {
    constructor() { super('IsSmallerThanEnemies'); }
    tick(ctx) {
        const { snake, allSnakes } = ctx;
        for (const other of allSnakes) {
            if (other === snake || !other.alive) continue;
            if (other.length > snake.length + 3 && Utils.manhattan(snake.head, other.head) < 8) {
                ctx.threatSnake = other;
                return 'success';
            }
        }
        return 'failure';
    }
}

// 检查是否有高价值食物
class IsHighValueFoodAvailable extends BTNode {
    constructor() { super('IsHighValueFoodAvailable'); }
    tick(ctx) {
        const best = ctx.foodManager.findBest(ctx.snake.head, 15);
        if (best && best.points >= 30) {
            ctx.targetFood = best;
            return 'success';
        }
        return 'failure';
    }
}

// ==========================================
// 行为节点（叶子）
// ==========================================

// 寻路到食物
class MoveToFood extends BTNode {
    constructor() { super('MoveToFood'); }
    tick(ctx) {
        const { snake, targetFood, obstacles, cols, rows, allSnakes } = ctx;
        if (!targetFood) return 'failure';

        // 构建障碍物集
        const obs = new Set(obstacles);
        for (const other of allSnakes) {
            if (!other.alive) continue;
            for (let i = 0; i < other.segments.length; i++) {
                if (other === snake && i === 0) continue;
                obs.add(`${other.segments[i].x},${other.segments[i].y}`);
            }
        }
        // 也把自己的身体加上（除了头和尾巴最后一节，因为尾巴会移动）
        for (let i = 1; i < snake.segments.length - 1; i++) {
            obs.add(`${snake.segments[i].x},${snake.segments[i].y}`);
        }

        const path = Utils.astar(snake.head, targetFood, null, cols, rows, obs);
        if (path && path.length > 0) {
            const next = path[0];
            const dir = {
                x: next.x - snake.head.x,
                y: next.y - snake.head.y
            };
            // 处理穿越边界
            if (Math.abs(dir.x) > 1) dir.x = dir.x > 0 ? -1 : 1;
            if (Math.abs(dir.y) > 1) dir.y = dir.y > 0 ? -1 : 1;
            
            ctx.chosenDir = dir;
            ctx.behavior = '寻食';
            return 'success';
        }
        return 'failure';
    }
}

// 追击小蛇
class ChaseSmallSnake extends BTNode {
    constructor() { super('ChaseSmallSnake'); }
    tick(ctx) {
        const { snake, allSnakes, obstacles, cols, rows } = ctx;
        
        let target = null;
        let minDist = Infinity;
        for (const other of allSnakes) {
            if (other === snake || !other.alive) continue;
            if (snake.length > other.length + 2) {
                const d = Utils.manhattan(snake.head, other.head);
                if (d < minDist && d < 12) {
                    minDist = d;
                    target = other;
                }
            }
        }

        if (!target) return 'failure';

        const obs = new Set(obstacles);
        for (const other of allSnakes) {
            if (!other.alive) continue;
            for (let i = 0; i < other.segments.length; i++) {
                if (other === snake && i === 0) continue;
                if (other === target && i === 0) continue; // 不把目标头当障碍
                obs.add(`${other.segments[i].x},${other.segments[i].y}`);
            }
        }

        const path = Utils.astar(snake.head, target.head, null, cols, rows, obs);
        if (path && path.length > 0) {
            const next = path[0];
            const dir = {
                x: next.x - snake.head.x,
                y: next.y - snake.head.y
            };
            if (Math.abs(dir.x) > 1) dir.x = dir.x > 0 ? -1 : 1;
            if (Math.abs(dir.y) > 1) dir.y = dir.y > 0 ? -1 : 1;
            
            ctx.chosenDir = dir;
            ctx.behavior = '追击';
            return 'success';
        }
        return 'failure';
    }
}

// 逃离危险
class FleeFromDanger extends BTNode {
    constructor() { super('FleeFromDanger'); }
    tick(ctx) {
        const { snake, allSnakes, obstacles, cols, rows } = ctx;
        const head = snake.head;
        
        // 找所有威胁方向，选择最安全的方向
        const options = [];
        for (const dir of Utils.DIRECTIONS) {
            if (Utils.isOpposite(dir, snake.direction)) continue;
            
            const next = {
                x: (head.x + dir.x + cols) % cols,
                y: (head.y + dir.y + rows) % rows
            };

            // 检查安全性
            let safe = true;
            if (obstacles.has(`${next.x},${next.y}`)) safe = false;
            
            for (const other of allSnakes) {
                if (!other.alive) continue;
                for (let i = 0; i < other.segments.length; i++) {
                    if (other === snake && i === 0) continue;
                    if (Utils.samePos(next, other.segments[i])) {
                        safe = false;
                        break;
                    }
                }
                if (!safe) break;
            }

            if (safe) {
                // 计算该方向的可达空间
                const obs = new Set(obstacles);
                for (const other of allSnakes) {
                    if (!other.alive) continue;
                    for (const seg of other.segments) {
                        obs.add(`${seg.x},${seg.y}`);
                    }
                }
                const space = Utils.floodFill(next, cols, rows, obs);
                options.push({ dir, space, pos: next });
            }
        }

        if (options.length === 0) return 'failure';

        // 选择空间最大的方向
        options.sort((a, b) => b.space - a.space);
        ctx.chosenDir = options[0].dir;
        ctx.behavior = '逃跑';
        return 'success';
    }
}

// 安全漫游
class Wander extends BTNode {
    constructor() { super('Wander'); }
    tick(ctx) {
        const { snake, allSnakes, obstacles, cols, rows } = ctx;
        const head = snake.head;
        
        const options = [];
        for (const dir of Utils.DIRECTIONS) {
            if (Utils.isOpposite(dir, snake.direction)) continue;
            
            const next = {
                x: (head.x + dir.x + cols) % cols,
                y: (head.y + dir.y + rows) % rows
            };

            let safe = true;
            if (obstacles.has(`${next.x},${next.y}`)) safe = false;
            
            for (const other of allSnakes) {
                if (!other.alive) continue;
                for (let i = 0; i < other.segments.length; i++) {
                    if (other === snake && i === 0) continue;
                    if (Utils.samePos(next, other.segments[i])) {
                        safe = false;
                        break;
                    }
                }
                if (!safe) break;
            }

            if (safe) {
                // 优先直行
                const isStraight = dir.x === snake.direction.x && dir.y === snake.direction.y;
                options.push({ dir, priority: isStraight ? 2 : 1 });
            }
        }

        if (options.length === 0) return 'failure';

        // 带概率选择
        options.sort((a, b) => b.priority - a.priority);
        const idx = Math.random() < 0.7 ? 0 : Utils.randInt(0, options.length - 1);
        ctx.chosenDir = options[idx].dir;
        ctx.behavior = '漫游';
        return 'success';
    }
}

// 紧急避险（最后手段）
class EmergencyAvoid extends BTNode {
    constructor() { super('EmergencyAvoid'); }
    tick(ctx) {
        const { snake, allSnakes, obstacles, cols, rows } = ctx;
        const head = snake.head;

        for (const dir of Utils.shuffle(Utils.DIRECTIONS)) {
            const next = {
                x: (head.x + dir.x + cols) % cols,
                y: (head.y + dir.y + rows) % rows
            };

            let safe = true;
            if (obstacles.has(`${next.x},${next.y}`)) safe = false;
            
            if (safe) {
                for (const other of allSnakes) {
                    if (!other.alive) continue;
                    for (let i = 0; i < other.segments.length; i++) {
                        if (other === snake && i === 0) continue;
                        if (Utils.samePos(next, other.segments[i])) {
                            safe = false;
                            break;
                        }
                    }
                    if (!safe) break;
                }
            }

            if (safe) {
                ctx.chosenDir = dir;
                ctx.behavior = '避险';
                return 'success';
            }
        }

        // 无路可逃
        ctx.chosenDir = snake.direction;
        ctx.behavior = '绝路';
        return 'success';
    }
}

// 拦截切割
class Intercept extends BTNode {
    constructor() { super('Intercept'); }
    tick(ctx) {
        const { snake, allSnakes, obstacles, cols, rows } = ctx;
        
        // 找最近的敌蛇，尝试切到它前面
        let target = null;
        let minDist = Infinity;
        for (const other of allSnakes) {
            if (other === snake || !other.alive) continue;
            const d = Utils.manhattan(snake.head, other.head);
            if (d < minDist && d < 10 && snake.length >= other.length) {
                minDist = d;
                target = other;
            }
        }

        if (!target) return 'failure';

        // 预测目标的下一步位置
        const predictPos = {
            x: (target.head.x + target.direction.x * 3 + cols) % cols,
            y: (target.head.y + target.direction.y * 3 + rows) % rows
        };

        const obs = new Set(obstacles);
        for (const other of allSnakes) {
            if (!other.alive || other === snake) continue;
            for (const seg of other.segments) {
                obs.add(`${seg.x},${seg.y}`);
            }
        }
        for (let i = 1; i < snake.segments.length; i++) {
            obs.add(`${snake.segments[i].x},${snake.segments[i].y}`);
        }

        const path = Utils.astar(snake.head, predictPos, null, cols, rows, obs);
        if (path && path.length > 0 && path.length < minDist + 3) {
            const next = path[0];
            const dir = {
                x: next.x - snake.head.x,
                y: next.y - snake.head.y
            };
            if (Math.abs(dir.x) > 1) dir.x = dir.x > 0 ? -1 : 1;
            if (Math.abs(dir.y) > 1) dir.y = dir.y > 0 ? -1 : 1;
            
            ctx.chosenDir = dir;
            ctx.behavior = '拦截';
            return 'success';
        }
        return 'failure';
    }
}

// ==========================================
// AI性格预设 - 行为树构建
// ==========================================

class AIBehaviorTreeFactory {
    // 贪婪型 - 优先觅食
    static createGreedy() {
        return new Selector('GreedyRoot', [
            // 最高优先级：危险时逃跑
            new Sequence('DangerEscape', [
                new IsDangerNearby(),
                new FleeFromDanger()
            ]),
            // 高价值食物
            new Sequence('HighValueFood', [
                new IsHighValueFoodAvailable(),
                new MoveToFood()
            ]),
            // 普通觅食
            new Sequence('NormalFood', [
                new IsFoodNearby(30),
                new MoveToFood()
            ]),
            // 默认漫游
            new Wander(),
            new EmergencyAvoid()
        ]);
    }

    // 猎手型 - 优先攻击
    static createHunter() {
        return new Selector('HunterRoot', [
            // 危险逃离
            new Sequence('DangerEscape', [
                new IsDangerNearby(),
                new FleeFromDanger()
            ]),
            // 如果比对手大，追击
            new Sequence('HuntSmall', [
                new IsLargerThanEnemies(),
                new ChaseSmallSnake()
            ]),
            // 拦截
            new RandomChance(0.4, new Intercept()),
            // 觅食
            new Sequence('FeedWhenSmall', [
                new IsFoodNearby(20),
                new MoveToFood()
            ]),
            new Wander(),
            new EmergencyAvoid()
        ]);
    }

    // 防御型 - 优先安全
    static createDefensive() {
        return new Selector('DefensiveRoot', [
            // 任何危险立即逃跑
            new Sequence('DangerEscape', [
                new IsDangerNearby(),
                new FleeFromDanger()
            ]),
            // 如果附近有大蛇，逃离
            new Sequence('FleeFromBig', [
                new IsSmallerThanEnemies(),
                new FleeFromDanger()
            ]),
            // 安全时觅食
            new Sequence('SafeFood', [
                new IsFoodNearby(15),
                new MoveToFood()
            ]),
            new Wander(),
            new EmergencyAvoid()
        ]);
    }

    // 策略型 - 综合决策
    static createStrategist() {
        return new Selector('StrategistRoot', [
            // 危险逃离
            new Sequence('DangerEscape', [
                new IsDangerNearby(),
                new FleeFromDanger()
            ]),
            // 大蛇时进攻
            new Sequence('AttackWhenLarge', [
                new IsLargerThanEnemies(),
                new RandomChance(0.6, new Selector('AttackChoice', [
                    new ChaseSmallSnake(),
                    new Intercept()
                ]))
            ]),
            // 小蛇时防御觅食
            new Sequence('DefendWhenSmall', [
                new IsSmallerThanEnemies(),
                new FleeFromDanger()
            ]),
            // 高价值食物
            new Sequence('HighValueFood', [
                new IsHighValueFoodAvailable(),
                new MoveToFood()
            ]),
            // 普通觅食
            new Sequence('NormalFood', [
                new IsFoodNearby(25),
                new MoveToFood()
            ]),
            new Wander(),
            new EmergencyAvoid()
        ]);
    }

    // 疯狂型 - 不可预测
    static createCrazy() {
        return new Selector('CrazyRoot', [
            // 危险逃离（但概率较低）
            new RandomChance(0.7, new Sequence('MaybeFlee', [
                new IsDangerNearby(),
                new FleeFromDanger()
            ])),
            // 随机攻击
            new RandomChance(0.5, new ChaseSmallSnake()),
            // 随机拦截
            new RandomChance(0.3, new Intercept()),
            // 觅食
            new RandomChance(0.6, new Sequence('RandomFood', [
                new IsFoodNearby(30),
                new MoveToFood()
            ])),
            new Wander(),
            new EmergencyAvoid()
        ]);
    }

    // 按名称创建
    static create(personality) {
        switch (personality) {
            case 'greedy': return { tree: this.createGreedy(), label: '贪婪', emoji: '🍕' };
            case 'hunter': return { tree: this.createHunter(), label: '猎手', emoji: '🗡️' };
            case 'defensive': return { tree: this.createDefensive(), label: '防御', emoji: '🛡️' };
            case 'strategist': return { tree: this.createStrategist(), label: '策略', emoji: '🧠' };
            case 'crazy': return { tree: this.createCrazy(), label: '疯狂', emoji: '🤪' };
            default: return { tree: this.createGreedy(), label: '贪婪', emoji: '🍕' };
        }
    }

    static PERSONALITIES = ['greedy', 'hunter', 'defensive', 'strategist', 'crazy'];
}
