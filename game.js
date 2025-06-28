// 游戏常量
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const TANK_SIZE = 30;
const BULLET_SIZE = 4;
const ENEMY_SIZE = 25;
const WALL_SIZE = 40;

// 游戏状态
let gameState = {
    isRunning: false,
    isPaused: false,
    score: 0,
    lives: 3,
    level: 1,
    enemies: [],
    bullets: [],
    enemyBullets: [],
    walls: [],
    powerUps: [],
    keys: {}
};

// 获取画布和上下文
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// 坦克类
class Tank {
    constructor(x, y, color, isPlayer = false) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.isPlayer = isPlayer;
        this.direction = 0; // 0: 上, 1: 右, 2: 下, 3: 左
        this.speed = isPlayer ? 3 : 1;
        this.size = isPlayer ? TANK_SIZE : ENEMY_SIZE;
        this.lastShot = 0;
        this.shotCooldown = isPlayer ? 300 : 1000;
        this.health = isPlayer ? 1 : 1;
        this.lastDirectionChange = 0;
        this.directionChangeInterval = 2000;
    }

    update() {
        if (this.isPlayer) {
            this.handlePlayerInput();
        } else {
            this.handleEnemyAI();
        }
        
        // 边界检测
        this.x = Math.max(this.size/2, Math.min(CANVAS_WIDTH - this.size/2, this.x));
        this.y = Math.max(this.size/2, Math.min(CANVAS_HEIGHT - this.size/2, this.y));
    }

    handlePlayerInput() {
        const keys = gameState.keys;
        
        if (keys['w'] || keys['W'] || keys['ArrowUp']) {
            this.direction = 0;
            this.y -= this.speed;
        }
        if (keys['s'] || keys['S'] || keys['ArrowDown']) {
            this.direction = 2;
            this.y += this.speed;
        }
        if (keys['a'] || keys['A'] || keys['ArrowLeft']) {
            this.direction = 3;
            this.x -= this.speed;
        }
        if (keys['d'] || keys['D'] || keys['ArrowRight']) {
            this.direction = 1;
            this.x += this.speed;
        }
    }

    handleEnemyAI() {
        const now = Date.now();
        
        // 随机改变方向
        if (now - this.lastDirectionChange > this.directionChangeInterval) {
            this.direction = Math.floor(Math.random() * 4);
            this.lastDirectionChange = now;
            this.directionChangeInterval = 1000 + Math.random() * 2000;
        }

        // 移动
        switch (this.direction) {
            case 0: this.y -= this.speed; break;
            case 1: this.x += this.speed; break;
            case 2: this.y += this.speed; break;
            case 3: this.x -= this.speed; break;
        }

        // 随机射击
        if (Math.random() < 0.01) {
            this.shoot();
        }
    }

    shoot() {
        const now = Date.now();
        if (now - this.lastShot > this.shotCooldown) {
            let bulletX = this.x;
            let bulletY = this.y;
            
            switch (this.direction) {
                case 0: bulletY -= this.size/2; break;
                case 1: bulletX += this.size/2; break;
                case 2: bulletY += this.size/2; break;
                case 3: bulletX -= this.size/2; break;
            }

            const bullet = new Bullet(bulletX, bulletY, this.direction, this.isPlayer);
            if (this.isPlayer) {
                gameState.bullets.push(bullet);
            } else {
                gameState.enemyBullets.push(bullet);
            }
            
            this.lastShot = now;
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate((this.direction * 90) * Math.PI / 180);
        
        // 坦克主体
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.size/2, -this.size/2, this.size, this.size);
        
        // 坦克炮管
        ctx.fillStyle = '#333';
        ctx.fillRect(-2, -this.size/2 - 8, 4, 8);
        
        // 坦克履带
        ctx.fillStyle = '#666';
        ctx.fillRect(-this.size/2 - 2, -this.size/2, 2, this.size);
        ctx.fillRect(this.size/2, -this.size/2, 2, this.size);
        
        // 如果是玩家坦克，添加特殊标记
        if (this.isPlayer) {
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(0, 0, 3, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }

    getBounds() {
        return {
            left: this.x - this.size/2,
            right: this.x + this.size/2,
            top: this.y - this.size/2,
            bottom: this.y + this.size/2
        };
    }
}

// 子弹类
class Bullet {
    constructor(x, y, direction, isPlayerBullet) {
        this.x = x;
        this.y = y;
        this.direction = direction;
        this.isPlayerBullet = isPlayerBullet;
        this.speed = 5;
        this.size = BULLET_SIZE;
        this.active = true;
    }

    update() {
        switch (this.direction) {
            case 0: this.y -= this.speed; break;
            case 1: this.x += this.speed; break;
            case 2: this.y += this.speed; break;
            case 3: this.x -= this.speed; break;
        }

        // 边界检测
        if (this.x < 0 || this.x > CANVAS_WIDTH || this.y < 0 || this.y > CANVAS_HEIGHT) {
            this.active = false;
        }
    }

    draw() {
        ctx.fillStyle = this.isPlayerBullet ? '#ff6b6b' : '#ffd700';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }

    getBounds() {
        return {
            left: this.x - this.size,
            right: this.x + this.size,
            top: this.y - this.size,
            bottom: this.y + this.size
        };
    }
}

// 墙壁类
class Wall {
    constructor(x, y, type = 'brick') {
        this.x = x;
        this.y = y;
        this.type = type;
        this.size = WALL_SIZE;
        this.health = type === 'steel' ? 3 : 1;
    }

    draw() {
        if (this.type === 'steel') {
            ctx.fillStyle = '#888';
        } else {
            ctx.fillStyle = '#8B4513';
        }
        ctx.fillRect(this.x - this.size/2, this.y - this.size/2, this.size, this.size);
        
        // 添加纹理
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1;
        ctx.strokeRect(this.x - this.size/2, this.y - this.size/2, this.size, this.size);
    }

    getBounds() {
        return {
            left: this.x - this.size/2,
            right: this.x + this.size/2,
            top: this.y - this.size/2,
            bottom: this.y + this.size/2
        };
    }
}

// 玩家坦克
let playerTank = new Tank(CANVAS_WIDTH/2, CANVAS_HEIGHT - 50, '#4ecdc4', true);

// 碰撞检测函数
function checkCollision(rect1, rect2) {
    return rect1.left < rect2.right && 
           rect1.right > rect2.left && 
           rect1.top < rect2.bottom && 
           rect1.bottom > rect2.top;
}

// 创建关卡
function createLevel() {
    gameState.walls = [];
    gameState.enemies = [];
    
    // 创建边界墙
    for (let i = 0; i < CANVAS_WIDTH; i += WALL_SIZE) {
        gameState.walls.push(new Wall(i + WALL_SIZE/2, WALL_SIZE/2, 'steel'));
        gameState.walls.push(new Wall(i + WALL_SIZE/2, CANVAS_HEIGHT - WALL_SIZE/2, 'steel'));
    }
    for (let i = 0; i < CANVAS_HEIGHT; i += WALL_SIZE) {
        gameState.walls.push(new Wall(WALL_SIZE/2, i + WALL_SIZE/2, 'steel'));
        gameState.walls.push(new Wall(CANVAS_WIDTH - WALL_SIZE/2, i + WALL_SIZE/2, 'steel'));
    }
    
    // 创建内部障碍物
    for (let i = 0; i < 10; i++) {
        const x = Math.random() * (CANVAS_WIDTH - 100) + 50;
        const y = Math.random() * (CANVAS_HEIGHT - 200) + 100;
        gameState.walls.push(new Wall(x, y, 'brick'));
    }
    
    // 创建敌人
    for (let i = 0; i < 3 + gameState.level; i++) {
        const x = Math.random() * (CANVAS_WIDTH - 100) + 50;
        const y = Math.random() * 200 + 50;
        gameState.enemies.push(new Tank(x, y, '#e74c3c', false));
    }
}

// 更新游戏状态
function updateGame() {
    if (!gameState.isRunning || gameState.isPaused) return;
    
    // 更新玩家坦克
    playerTank.update();
    
    // 更新敌人
    gameState.enemies.forEach(enemy => enemy.update());
    
    // 更新子弹
    gameState.bullets.forEach(bullet => bullet.update());
    gameState.enemyBullets.forEach(bullet => bullet.update());
    
    // 移除无效子弹
    gameState.bullets = gameState.bullets.filter(bullet => bullet.active);
    gameState.enemyBullets = gameState.enemyBullets.filter(bullet => bullet.active);
    
    // 检测子弹与坦克的碰撞
    checkBulletCollisions();
    
    // 检测坦克与墙壁的碰撞
    checkWallCollisions();
    
    // 检查游戏状态
    checkGameState();
}

// 检测子弹碰撞
function checkBulletCollisions() {
    // 玩家子弹击中敌人
    gameState.bullets.forEach((bullet, bulletIndex) => {
        gameState.enemies.forEach((enemy, enemyIndex) => {
            if (checkCollision(bullet.getBounds(), enemy.getBounds())) {
                gameState.enemies.splice(enemyIndex, 1);
                gameState.bullets.splice(bulletIndex, 1);
                gameState.score += 100;
                updateUI();
            }
        });
    });
    
    // 敌人子弹击中玩家
    gameState.enemyBullets.forEach((bullet, bulletIndex) => {
        if (checkCollision(bullet.getBounds(), playerTank.getBounds())) {
            gameState.enemyBullets.splice(bulletIndex, 1);
            gameState.lives--;
            updateUI();
            
            if (gameState.lives <= 0) {
                gameOver();
            }
        }
    });
}

// 检测墙壁碰撞
function checkWallCollisions() {
    const playerBounds = playerTank.getBounds();
    
    gameState.walls.forEach(wall => {
        if (checkCollision(playerBounds, wall.getBounds())) {
            // 简单的碰撞响应
            if (playerTank.direction === 0) playerTank.y += playerTank.speed;
            if (playerTank.direction === 2) playerTank.y -= playerTank.speed;
            if (playerTank.direction === 1) playerTank.x -= playerTank.speed;
            if (playerTank.direction === 3) playerTank.x += playerTank.speed;
        }
    });
}

// 检查游戏状态
function checkGameState() {
    if (gameState.enemies.length === 0) {
        gameState.level++;
        createLevel();
        updateUI();
    }
}

// 绘制游戏
function drawGame() {
    // 清空画布
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // 绘制墙壁
    gameState.walls.forEach(wall => wall.draw());
    
    // 绘制玩家坦克
    playerTank.draw();
    
    // 绘制敌人
    gameState.enemies.forEach(enemy => enemy.draw());
    
    // 绘制子弹
    gameState.bullets.forEach(bullet => bullet.draw());
    gameState.enemyBullets.forEach(bullet => bullet.draw());
}

// 更新UI
function updateUI() {
    document.getElementById('score').textContent = gameState.score;
    document.getElementById('lives').textContent = gameState.lives;
    document.getElementById('level').textContent = gameState.level;
}

// 游戏结束
function gameOver() {
    gameState.isRunning = false;
    document.getElementById('finalScore').textContent = gameState.score;
    document.getElementById('gameOver').classList.remove('hidden');
}

// 重新开始游戏
function restartGame() {
    gameState.score = 0;
    gameState.lives = 3;
    gameState.level = 1;
    gameState.bullets = [];
    gameState.enemyBullets = [];
    gameState.isPaused = false;
    
    playerTank = new Tank(CANVAS_WIDTH/2, CANVAS_HEIGHT - 50, '#4ecdc4', true);
    createLevel();
    updateUI();
    
    document.getElementById('gameOver').classList.add('hidden');
    document.getElementById('startBtn').disabled = false;
    document.getElementById('pauseBtn').disabled = true;
    document.getElementById('pauseBtn').textContent = '暂停';
}

// 游戏主循环
function gameLoop() {
    updateGame();
    drawGame();
    requestAnimationFrame(gameLoop);
}

// 键盘事件处理
document.addEventListener('keydown', (e) => {
    gameState.keys[e.key] = true;
    
    if (e.key === ' ' && gameState.isRunning && !gameState.isPaused) {
        playerTank.shoot();
    }
    
    if (e.key === 'r' || e.key === 'R') {
        restartGame();
    }
});

document.addEventListener('keyup', (e) => {
    gameState.keys[e.key] = false;
});

// 按钮事件处理
document.getElementById('startBtn').addEventListener('click', () => {
    if (!gameState.isRunning) {
        gameState.isRunning = true;
        gameState.isPaused = false;
        document.getElementById('startBtn').disabled = true;
        document.getElementById('pauseBtn').disabled = false;
    }
});

document.getElementById('pauseBtn').addEventListener('click', () => {
    if (gameState.isRunning) {
        gameState.isPaused = !gameState.isPaused;
        document.getElementById('pauseBtn').textContent = gameState.isPaused ? '继续' : '暂停';
    }
});

document.getElementById('restartBtn').addEventListener('click', restartGame);
document.getElementById('playAgainBtn').addEventListener('click', restartGame);

// 初始化游戏
function initGame() {
    createLevel();
    updateUI();
}

// 启动游戏
initGame();
gameLoop(); 