/* ========================================
   AI蛇控制器
   ======================================== */

class AISnake {
    constructor(snake, personality) {
        this.snake = snake;
        this.personality = personality;
        const bt = AIBehaviorTreeFactory.create(personality);
        this.behaviorTree = bt.tree;
        this.label = bt.label;
        this.emoji = bt.emoji;
        this.currentBehavior = '待机';
        this.thinkTimer = 0;
        this.thinkInterval = 1; // 每次移动都思考
    }

    // AI决策
    think(gameState) {
        if (!this.snake.alive) return;

        this.thinkTimer++;
        if (this.thinkTimer < this.thinkInterval) return;
        this.thinkTimer = 0;

        // 构建行为树上下文
        const context = {
            snake: this.snake,
            allSnakes: gameState.allSnakes,
            foodManager: gameState.foodManager,
            obstacles: gameState.obstacles,
            cols: gameState.cols,
            rows: gameState.rows,
            chosenDir: null,
            behavior: '思考',
            targetFood: null,
            dangerLevel: 0,
            threatSnake: null,
            smallerEnemies: 0
        };

        // 执行行为树
        this.behaviorTree.tick(context);

        // 应用决策
        if (context.chosenDir) {
            this.snake.setDirection(context.chosenDir);
        }
        this.currentBehavior = context.behavior || '待机';
    }

    // 获取状态信息
    getStatusInfo() {
        return {
            name: this.snake.name,
            color: this.snake.color,
            score: this.snake.score,
            length: this.snake.length,
            alive: this.snake.alive,
            personality: this.label,
            emoji: this.emoji,
            behavior: this.currentBehavior
        };
    }
}

// AI蛇名称池
const AI_NAMES = [
    'Alpha', 'Beta', 'Gamma', 'Delta', 'Omega',
    'Nova', 'Blaze', 'Storm', 'Shadow', 'Viper',
    'Cobra', 'Python', 'Mamba', 'Hydra', 'Phoenix'
];

// AI蛇颜色池
const AI_COLORS = [
    '#ff3366', '#33ff66', '#6633ff', '#ff6633',
    '#66ff33', '#ff33ff', '#33ffff', '#ffff33',
    '#ff6699', '#99ff66', '#6699ff', '#ff9933'
];
