/* ========================================
   工具函数模块
   ======================================== */

const Utils = {
    // 方向常量
    DIR: {
        UP: { x: 0, y: -1 },
        DOWN: { x: 0, y: 1 },
        LEFT: { x: -1, y: 0 },
        RIGHT: { x: 1, y: 0 }
    },

    // 方向列表
    DIRECTIONS: [
        { x: 0, y: -1 },  // UP
        { x: 0, y: 1 },   // DOWN
        { x: -1, y: 0 },  // LEFT
        { x: 1, y: 0 }    // RIGHT
    ],

    // 随机整数
    randInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    // 随机颜色
    randColor() {
        const colors = [
            '#ff3366', '#33ff66', '#3366ff', '#ff6633',
            '#66ff33', '#6633ff', '#ff33ff', '#33ffff',
            '#ffff33', '#ff6699', '#99ff66', '#6699ff'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    },

    // 曼哈顿距离
    manhattan(a, b) {
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    },

    // 欧几里得距离
    euclidean(a, b) {
        return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
    },

    // 位置相同
    samePos(a, b) {
        return a.x === b.x && a.y === b.y;
    },

    // 反方向
    oppositeDir(dir) {
        return { x: -dir.x, y: -dir.y };
    },

    // 是否反方向
    isOpposite(d1, d2) {
        return d1.x === -d2.x && d1.y === -d2.y;
    },

    // 线性插值
    lerp(a, b, t) {
        return a + (b - a) * t;
    },

    // 颜色加亮
    lightenColor(hex, percent) {
        const num = parseInt(hex.replace('#', ''), 16);
        const r = Math.min(255, (num >> 16) + Math.round(255 * percent / 100));
        const g = Math.min(255, ((num >> 8) & 0x00FF) + Math.round(255 * percent / 100));
        const b = Math.min(255, (num & 0x0000FF) + Math.round(255 * percent / 100));
        return `rgb(${r},${g},${b})`;
    },

    // 颜色变暗
    darkenColor(hex, percent) {
        const num = parseInt(hex.replace('#', ''), 16);
        const r = Math.max(0, (num >> 16) - Math.round(255 * percent / 100));
        const g = Math.max(0, ((num >> 8) & 0x00FF) - Math.round(255 * percent / 100));
        const b = Math.max(0, (num & 0x0000FF) - Math.round(255 * percent / 100));
        return `rgb(${r},${g},${b})`;
    },

    // hex转rgba
    hexToRgba(hex, alpha) {
        const num = parseInt(hex.replace('#', ''), 16);
        const r = (num >> 16) & 255;
        const g = (num >> 8) & 255;
        const b = num & 255;
        return `rgba(${r},${g},${b},${alpha})`;
    },

    // 格式化时间
    formatTime(seconds) {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    },

    // Clamp
    clamp(val, min, max) {
        return Math.max(min, Math.min(max, val));
    },

    // 打乱数组
    shuffle(arr) {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    },

    // A* 寻路
    astar(start, goal, grid, cols, rows, obstacles) {
        const key = (p) => `${p.x},${p.y}`;
        const openSet = [start];
        const cameFrom = {};
        const gScore = {};
        const fScore = {};

        gScore[key(start)] = 0;
        fScore[key(start)] = this.manhattan(start, goal);

        const closedSet = new Set();

        while (openSet.length > 0) {
            // 找fScore最小的
            let minIdx = 0;
            for (let i = 1; i < openSet.length; i++) {
                if ((fScore[key(openSet[i])] || Infinity) < (fScore[key(openSet[minIdx])] || Infinity)) {
                    minIdx = i;
                }
            }
            const current = openSet[minIdx];

            if (this.samePos(current, goal)) {
                // 重建路径
                const path = [];
                let c = current;
                while (cameFrom[key(c)]) {
                    path.unshift(c);
                    c = cameFrom[key(c)];
                }
                return path;
            }

            openSet.splice(minIdx, 1);
            closedSet.add(key(current));

            for (const dir of this.DIRECTIONS) {
                const neighbor = { x: current.x + dir.x, y: current.y + dir.y };
                
                // 边界检查
                if (neighbor.x < 0 || neighbor.x >= cols || neighbor.y < 0 || neighbor.y >= rows) continue;
                
                // 障碍检查
                if (obstacles && obstacles.has(key(neighbor))) continue;
                
                if (closedSet.has(key(neighbor))) continue;

                const tentG = (gScore[key(current)] || 0) + 1;

                if (!openSet.find(p => this.samePos(p, neighbor))) {
                    openSet.push(neighbor);
                } else if (tentG >= (gScore[key(neighbor)] || Infinity)) {
                    continue;
                }

                cameFrom[key(neighbor)] = current;
                gScore[key(neighbor)] = tentG;
                fScore[key(neighbor)] = tentG + this.manhattan(neighbor, goal);
            }

            // 性能保护：限制搜索节点数
            if (closedSet.size > 500) return null;
        }

        return null; // 无路径
    },

    // BFS 洪水填充 - 计算可达区域大小
    floodFill(start, cols, rows, obstacles) {
        const key = (p) => `${p.x},${p.y}`;
        const visited = new Set();
        const queue = [start];
        visited.add(key(start));

        while (queue.length > 0) {
            const current = queue.shift();
            for (const dir of this.DIRECTIONS) {
                const next = { x: current.x + dir.x, y: current.y + dir.y };
                if (next.x < 0 || next.x >= cols || next.y < 0 || next.y >= rows) continue;
                const k = key(next);
                if (visited.has(k)) continue;
                if (obstacles && obstacles.has(k)) continue;
                visited.add(k);
                queue.push(next);
            }
            // 性能保护
            if (visited.size > 800) break;
        }

        return visited.size;
    }
};
