/* ========================================
   游戏入口
   ======================================== */

// 初始化
window.addEventListener('DOMContentLoaded', () => {
    console.log('🐍 极限贪吃蛇 - AI对战版 v1.1 (Mobile Ready)');
    console.log('Loading...');

    // 初始化粒子背景
    const bgCanvas = document.getElementById('particle-bg');
    Particles.initBackground(bgCanvas);

    // 创建游戏实例
    const game = new Game();

    // 创建UI管理器
    const ui = new UIManager(game);
    ui.initEvents();

    // 显示主菜单
    ui.showScreen('main-menu');

    console.log('✅ Game ready!');

    // 防止页面滚动（PC和移动端）
    window.addEventListener('keydown', (e) => {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
            e.preventDefault();
        }
    });

    // 防止移动端双击缩放和页面滚动
    document.addEventListener('touchstart', (e) => {
        if (e.touches.length > 1) {
            e.preventDefault();
        }
    }, { passive: false });

    // 防止双击缩放
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (e) => {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
            e.preventDefault();
        }
        lastTouchEnd = now;
    }, { passive: false });

    // 窗口大小变化处理（含旋转屏幕）
    let resizeTimer;
    const handleResize = () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            // 更新移动端检测
            ui.isMobile = ui._detectMobile();
            
            if (game.state === 'playing' || game.state === 'paused') {
                game.renderer.resize(game.config.cols, game.config.rows);
            }
            
            // 调整粒子背景画布
            bgCanvas.width = window.innerWidth;
            bgCanvas.height = window.innerHeight;
        }, 150);
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    // 页面失焦自动暂停
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && game.state === 'playing') {
            game.togglePause();
        }
    });
});
