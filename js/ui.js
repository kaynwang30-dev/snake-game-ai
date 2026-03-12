/* ========================================
   UI管理器
   ======================================== */

class UIManager {
    constructor(game) {
        this.game = game;
        this.currentScreen = 'main-menu';
        this.isMobile = this._detectMobile();
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchStartTime = 0;
    }

    // 检测移动端
    _detectMobile() {
        return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
            || (window.innerWidth <= 768 && 'ontouchstart' in window);
    }

    // 显示屏幕
    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        const screen = document.getElementById(screenId);
        if (screen) {
            screen.classList.add('active');
            this.currentScreen = screenId;
        }
    }

    // 初始化UI事件
    initEvents() {
        // ==========================================
        // 主菜单按钮
        // ==========================================
        document.getElementById('btn-solo').addEventListener('click', () => {
            this._startGame('solo');
        });

        document.getElementById('btn-vs-ai').addEventListener('click', () => {
            this._startGame('vs-ai');
        });

        document.getElementById('btn-ai-battle').addEventListener('click', () => {
            this._startGame('ai-battle');
        });

        document.getElementById('btn-settings').addEventListener('click', () => {
            this.showScreen('settings-screen');
        });

        // ==========================================
        // 设置界面
        // ==========================================
        document.getElementById('btn-save-settings').addEventListener('click', () => {
            this._saveSettings();
            this.showScreen('main-menu');
        });

        document.getElementById('btn-back-menu').addEventListener('click', () => {
            this.showScreen('main-menu');
        });

        // 滑块实时显示
        this._bindRange('setting-speed', 'speed-value');
        this._bindRange('setting-ai-count', 'ai-count-value');
        this._bindRange('setting-food-count', 'food-count-value');

        // ==========================================
        // 游戏内按钮
        // ==========================================
        document.getElementById('btn-pause').addEventListener('click', () => {
            this.game.togglePause();
        });

        document.getElementById('btn-quit').addEventListener('click', () => {
            this._quitGame();
        });

        document.getElementById('btn-resume').addEventListener('click', () => {
            this.game.togglePause();
        });

        document.getElementById('btn-restart').addEventListener('click', () => {
            this._restartGame();
        });

        document.getElementById('btn-to-menu').addEventListener('click', () => {
            this._quitGame();
        });

        // ==========================================
        // 游戏结束按钮
        // ==========================================
        document.getElementById('btn-play-again').addEventListener('click', () => {
            this._restartGame();
        });

        document.getElementById('btn-gameover-menu').addEventListener('click', () => {
            this.game.destroy();
            this.showScreen('main-menu');
        });

        // ==========================================
        // 键盘事件
        // ==========================================
        document.addEventListener('keydown', (e) => {
            this._handleKeyDown(e);
        });

        // ==========================================
        // 移动端触摸控制
        // ==========================================
        this._initMobileControls();

        // ==========================================
        // 游戏回调
        // ==========================================
        this.game.onGameOver = (data) => {
            this._showGameOver(data);
        };

        this.game.onScoreUpdate = (snake) => {
            if (snake.isPlayer) {
                const el = document.getElementById('player-score');
                if (el) {
                    el.style.transform = 'scale(1.3)';
                    el.style.color = '#ffaa00';
                    setTimeout(() => {
                        el.style.transform = 'scale(1)';
                        el.style.color = '';
                    }, 200);
                }
            }
        };
    }

    // ==========================================
    // 移动端触摸控制
    // ==========================================
    _initMobileControls() {
        // 虚拟方向键
        const dpadBtns = document.querySelectorAll('.dpad-btn[data-dir]');
        dpadBtns.forEach(btn => {
            // 触摸开始
            const handleStart = (e) => {
                e.preventDefault();
                btn.classList.add('active');
                this._handleDpadInput(btn.dataset.dir);
            };
            // 触摸结束
            const handleEnd = (e) => {
                e.preventDefault();
                btn.classList.remove('active');
            };

            btn.addEventListener('touchstart', handleStart, { passive: false });
            btn.addEventListener('touchend', handleEnd, { passive: false });
            btn.addEventListener('touchcancel', handleEnd, { passive: false });
            // 也支持鼠标（调试用）
            btn.addEventListener('mousedown', handleStart);
            btn.addEventListener('mouseup', handleEnd);
            btn.addEventListener('mouseleave', handleEnd);
        });

        // 移动端暂停键
        const mobilePause = document.getElementById('mobile-pause');
        if (mobilePause) {
            mobilePause.addEventListener('click', () => {
                if (this.game.state === 'playing' || this.game.state === 'paused') {
                    this.game.togglePause();
                }
            });
        }

        // 画布区域滑动手势
        const canvasWrapper = document.getElementById('game-canvas-wrapper');
        
        canvasWrapper.addEventListener('touchstart', (e) => {
            if (this.game.state !== 'playing') return;
            const touch = e.touches[0];
            this.touchStartX = touch.clientX;
            this.touchStartY = touch.clientY;
            this.touchStartTime = Date.now();
        }, { passive: true });

        canvasWrapper.addEventListener('touchend', (e) => {
            if (this.game.state !== 'playing') return;
            const touch = e.changedTouches[0];
            const dx = touch.clientX - this.touchStartX;
            const dy = touch.clientY - this.touchStartY;
            const dt = Date.now() - this.touchStartTime;
            
            // 最小滑动距离和最大时间限制
            const minDist = 20;
            const maxTime = 500;
            
            if (dt > maxTime) return;
            
            const absDx = Math.abs(dx);
            const absDy = Math.abs(dy);
            
            if (Math.max(absDx, absDy) < minDist) return;
            
            if (absDx > absDy) {
                // 水平滑动
                this._handleDpadInput(dx > 0 ? 'right' : 'left');
            } else {
                // 垂直滑动
                this._handleDpadInput(dy > 0 ? 'down' : 'up');
            }
        }, { passive: true });

        // 阻止画布区域默认的触摸行为（防止滚动）
        canvasWrapper.addEventListener('touchmove', (e) => {
            if (this.currentScreen === 'game-screen') {
                e.preventDefault();
            }
        }, { passive: false });
    }

    // 处理方向键输入
    _handleDpadInput(dir) {
        if (!this.game.playerSnake || !this.game.playerSnake.alive) return;
        if (this.game.state !== 'playing') return;

        switch (dir) {
            case 'up':
                this.game.handleInput('ArrowUp');
                break;
            case 'down':
                this.game.handleInput('ArrowDown');
                break;
            case 'left':
                this.game.handleInput('ArrowLeft');
                break;
            case 'right':
                this.game.handleInput('ArrowRight');
                break;
        }
    }

    // 显示/隐藏移动端控制器
    _showMobileControls(show) {
        const controls = document.getElementById('mobile-controls');
        if (!controls) return;
        if (show && this.isMobile) {
            controls.classList.remove('hidden');
        } else {
            controls.classList.add('hidden');
        }
    }

    // 绑定range实时显示
    _bindRange(inputId, displayId) {
        const input = document.getElementById(inputId);
        const display = document.getElementById(displayId);
        if (input && display) {
            input.addEventListener('input', () => {
                display.textContent = input.value;
            });
        }
    }

    // 保存设置
    _saveSettings() {
        const mapSize = document.getElementById('setting-map-size').value;
        const speed = parseInt(document.getElementById('setting-speed').value);
        const aiCount = parseInt(document.getElementById('setting-ai-count').value);
        const foodCount = parseInt(document.getElementById('setting-food-count').value);
        const obstacles = document.getElementById('setting-obstacles').value;
        const sound = document.getElementById('setting-sound').checked;
        const particles = document.getElementById('setting-particles').checked;

        this.game.setConfig({ speed, aiCount, foodCount, obstacles, particles, sound });
        this.game._applyMapSize(mapSize);

        // 移动端自动缩小地图
        if (this.isMobile && mapSize !== 'small') {
            this.game._applyMapSize('small');
        }
        
        Sound.enabled = sound;
        Particles.enabled = particles;
    }

    // 开始游戏
    _startGame(mode) {
        // 重新检测移动端（可能旋转屏幕后尺寸变化）
        this.isMobile = this._detectMobile();

        this._saveSettings();
        Sound.init();
        
        this.showScreen('game-screen');
        
        // 显示/隐藏UI元素
        const aiPanel = document.getElementById('ai-status-panel');
        const leaderboard = document.getElementById('leaderboard-sidebar');
        const playerInfo = document.getElementById('hud-player-info');

        if (mode === 'solo') {
            aiPanel.classList.add('hidden');
            leaderboard.classList.add('hidden');
            playerInfo.style.display = '';
            this._showMobileControls(true);
        } else if (mode === 'vs-ai') {
            aiPanel.classList.remove('hidden');
            leaderboard.classList.remove('hidden');
            playerInfo.style.display = '';
            this._showMobileControls(true);
        } else if (mode === 'ai-battle') {
            aiPanel.classList.remove('hidden');
            leaderboard.classList.remove('hidden');
            playerInfo.style.display = 'none';
            this._showMobileControls(false); // AI混战不需要方向键
        }

        document.getElementById('game-overlay').classList.add('hidden');
        document.getElementById('game-status').textContent = '准备就绪';

        this.game.init(mode);
        this._lastMode = mode;
    }

    // 重启游戏
    _restartGame() {
        this.game.destroy();
        document.getElementById('game-overlay').classList.add('hidden');
        
        if (this.currentScreen === 'gameover-screen') {
            this.showScreen('game-screen');
        }
        
        const mode = this._lastMode || 'solo';
        // 重新显示移动端控制器
        if (mode !== 'ai-battle') {
            this._showMobileControls(true);
        }
        
        this.game.init(mode);
    }

    // 退出游戏
    _quitGame() {
        this.game.destroy();
        this._showMobileControls(false);
        document.getElementById('game-overlay').classList.add('hidden');
        this.showScreen('main-menu');
    }

    // 键盘处理
    _handleKeyDown(e) {
        // 游戏中的输入
        if (this.currentScreen === 'game-screen') {
            // 方向键
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 
                 'w', 'W', 'a', 'A', 's', 'S', 'd', 'D'].includes(e.key)) {
                e.preventDefault();
                this.game.handleInput(e.key);
            }

            // 暂停
            if (e.key === 'Escape' || e.key === ' ') {
                e.preventDefault();
                if (this.game.state === 'playing' || this.game.state === 'paused') {
                    this.game.togglePause();
                }
            }
        }

        // 设置界面返回
        if (this.currentScreen === 'settings-screen' && e.key === 'Escape') {
            this.showScreen('main-menu');
        }

        // 游戏结束界面
        if (this.currentScreen === 'gameover-screen') {
            if (e.key === 'Enter' || e.key === ' ') {
                this._restartGame();
            }
            if (e.key === 'Escape') {
                this.game.destroy();
                this.showScreen('main-menu');
            }
        }
    }

    // 显示游戏结束界面
    _showGameOver(data) {
        const { title, rankings, playerSnake, gameTime, mode } = data;

        // 隐藏移动端控制器
        this._showMobileControls(false);

        document.getElementById('gameover-title').textContent = title;
        document.getElementById('final-time').textContent = Utils.formatTime(gameTime);

        if (playerSnake) {
            const rank = rankings.findIndex(s => s.isPlayer) + 1;
            document.getElementById('final-rank').textContent = `#${rank}`;
            document.getElementById('final-score').textContent = playerSnake.score;
            document.getElementById('final-length').textContent = playerSnake.maxLength;
            document.getElementById('final-food').textContent = playerSnake.foodEaten;
            document.getElementById('final-kills').textContent = playerSnake.kills;
        } else {
            document.getElementById('final-rank').textContent = '-';
            document.getElementById('final-score').textContent = '-';
            document.getElementById('final-length').textContent = '-';
            document.getElementById('final-food').textContent = '-';
            document.getElementById('final-kills').textContent = '-';
        }

        // 渲染排行榜
        let lbHtml = '<div style="text-align:center;margin-bottom:12px;font-family:Orbitron;color:#ffaa00;font-size:16px;">🏆 最终排名</div>';
        rankings.forEach((snake, idx) => {
            const isWinner = idx === 0 ? 'winner' : '';
            const isP = snake.isPlayer ? 'is-player' : '';
            lbHtml += `
                <div class="final-lb-item ${isWinner} ${isP}">
                    <span class="final-lb-rank">#${idx + 1}</span>
                    <span class="final-lb-color" style="background:${snake.color}"></span>
                    <span class="final-lb-name">${snake.name}</span>
                    <span class="final-lb-score">${snake.score}分 | 长度${snake.maxLength}</span>
                </div>
            `;
        });
        document.getElementById('final-leaderboard').innerHTML = lbHtml;

        // 延迟显示，等死亡动画播放完
        setTimeout(() => {
            this.showScreen('gameover-screen');
        }, 1500);
    }
}
