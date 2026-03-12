/* ========================================
   游戏入口
   ======================================== */

// 初始化
window.addEventListener('DOMContentLoaded', () => {
    console.log('🐍 极限贪吃蛇 - AI对战版 v1.0');
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

    // 防止页面滚动
    window.addEventListener('keydown', (e) => {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
            e.preventDefault();
        }
    });

    // 窗口大小变化处理
    window.addEventListener('resize', () => {
        if (game.state === 'playing' || game.state === 'paused') {
            game.renderer.resize(game.config.cols, game.config.rows);
        }
    });

    // 页面失焦自动暂停
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && game.state === 'playing') {
            game.togglePause();
        }
    });
});
