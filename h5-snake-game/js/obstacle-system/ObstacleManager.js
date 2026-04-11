// 障碍物管理器
class ObstacleManager {
    constructor(game) {
        this.game = game;
        this.obstacles = new Map();
        this.obstacleTypes = new Map();
        this.activeEffects = new Set();
        this.spawnPoints = [];
        this.spawnTimer = 0;
        this.spawnInterval = 5000; // 5秒生成一个障碍物
        
        // 初始化障碍物类型
        this.initializeObstacleTypes();
        
        // 创建初始障碍物
        this.createInitialObstacles();
    }
    
    initializeObstacleTypes() {
        // 定义障碍物类型配置
        this.obstacleTypes.set('wall', {
            name: '墙',
            description: '静态障碍物，阻挡蛇的移动',
            color: '#8B4513',
            health: Infinity,
            isDestructible: false,
            collisionType: 'block',
            create: (x, y, config) => new Obstacle('wall', x, y, {
                color: config?.color || '#8B4513',
                width: config?.width || 1,
                height: config?.height || 1,
                isDestructible: false,
                collisionType: 'block'
            })
        });
        
        this.obstacleTypes.set('spike', {
            name: '尖刺',
            description: '伤害性障碍物，触碰会减少生命值',
            color: '#ff0000',
            health: 1,
            isDestructible: true,
            collisionType: 'damage',
            collisionDamage: 1,
            create: (x, y, config) => new Obstacle('spike', x, y, {
                color: config?.color || '#ff0000',
                width: config?.width || 1,
                height: config?.height || 1,
                isDestructible: true,
                collisionType: 'damage',
                collisionDamage: config?.damage || 1,
                glow: true,
                glowColor: '#ff0000',
                glowIntensity: 0.3
            })
        });
        
        this.obstacleTypes.set('moving_platform', {
            name: '移动平台',
            description: '沿着固定路径移动的平台',
            color: '#4682B4',
            health: 1,
            isDestructible: false,
            collisionType: 'block',
            create: (x, y, config) => new Obstacle('moving_platform', x, y, {
                color: config?.color || '#4682B4',
                width: config?.width || 2,
                height: config?.height || 1,
                velocity: config?.velocity || { x: 1, y: 0 },
                animation: { type: 'rotate', speed: 0.5 }
            })
        });
        
        this.obstacleTypes.set('portal', {
            name: '传送门',
            description: '将蛇传送到另一个位置',
            color: '#9400D3',
            health: 1,
            isDestructible: false,
            collisionType: 'teleport',
            create: (x, y, config) => new Obstacle('portal', x, y, {
                color: config?.color || '#9400D3',
                width: config?.width || 1,
                height: config?.height || 1,
                animation: { type: 'rotate', speed: 2 },
                glow: true,
                glowColor: '#9400D3',
                glowIntensity: 0.7,
                cooldown: 3000 // 3秒冷却
            })
        });
        
        this.obstacleTypes.set('speed_boost', {
            name: '加速区',
            description: '暂时增加蛇的移动速度',
            color: '#00FF00',
            health: 1,
            isDestructible: false,
            collisionType: 'speed_boost',
            create: (x, y, config) => new Obstacle('speed_boost', x, y, {
                color: config?.color || '#00FF00',
                width: config?.width || 1,
                height: config?.height || 1,
                animation: { type: 'pulse', speed: 2, minScale: 0.8, maxScale: 1.2 },
                glow: true,
                glowColor: '#00FF00',
                glowIntensity: 0.4
            })
        });
        
        console.log(`已初始化 ${this.obstacleTypes.size} 种障碍物类型`);
    }
    
    createInitialObstacles() {
        // 创建边界墙
        this.createBoundaryWalls();
        
        // 创建一些初始障碍物
        this.createTestObstacles();
    }
    
    createBoundaryWalls() {
        const gridWidth = this.game.gridWidth;
        const gridHeight = this.game.gridHeight;
        
        // 创建四周的墙
        // 上墙
        for (let x = 0; x < gridWidth; x++) {
            this.spawnObstacle('wall', x, 0);
        }
        
        // 下墙
        for (let x = 0; x < gridWidth; x++) {
            this.spawnObstacle('wall', x, gridHeight - 1);
        }
        
        // 左墙
        for (let y = 1; y < gridHeight - 1; y++) {
            this.spawnObstacle('wall', 0, y);
        }
        
        // 右墙
        for (let y = 1; y < gridHeight - 1; y++) {
            this.spawnObstacle('wall', gridWidth - 1, y);
        }
        
        console.log('创建了边界墙');
    }
    
    createTestObstacles() {
        const gridWidth = this.game.gridWidth;
        const gridHeight = this.game.gridHeight;
        
        // 创建一些测试障碍物
        const testObstacles = [
            // 中间的一些墙
            { type: 'wall', x: 10, y: 10, width: 3, height: 1 },
            { type: 'wall', x: 20, y: 15, width: 1, height: 3 },
            
            // 一些尖刺
            { type: 'spike', x: 15, y: 8 },
            { type: 'spike', x: 25, y: 12 },
            { type: 'spike', x: 8, y: 20 },
            
            // 移动平台
            { type: 'moving_platform', x: 5, y: 5, velocity: { x: 1, y: 0 } },
            
            // 传送门
            { type: 'portal', x: 30, y: 10 },
            
            // 加速区
            { type: 'speed_boost', x: 12, y: 25 }
        ];
        
        testObstacles.forEach(obs => {
            this.spawnObstacle(obs.type, obs.x, obs.y, {
                width: obs.width,
                height: obs.height,
                velocity: obs.velocity
            });
        });
        
        console.log(`创建了 ${testObstacles.length} 个测试障碍物`);
    }
    
    spawnObstacle(type, x, y, config = {}) {
        if (!this.obstacleTypes.has(type)) {
            console.error(`未知的障碍物类型: ${type}`);
            return null;
        }
        
        const typeConfig = this.obstacleTypes.get(type);
        const obstacle = typeConfig.create(x, y, config);
        
        // 设置游戏引用
        obstacle.setGame(this.game);
        
        // 添加到障碍物集合
        this.obstacles.set(obstacle.id, obstacle);
        
        console.log(`生成障碍物: ${type} (${obstacle.id}) 在位置 (${x}, ${y})`);
        
        return obstacle;
    }
    
    removeObstacle(id) {
        if (this.obstacles.has(id)) {
            const obstacle = this.obstacles.get(id);
            obstacle.destroy();
            this.obstacles.delete(id);
            console.log(`移除障碍物: ${id}`);
            return true;
        }
        return false;
    }
    
    clearAll() {
        const count = this.obstacles.size;
        this.obstacles.clear();
        console.log(`清除了所有障碍物 (${count} 个)`);
    }
    
    update(deltaTime) {
        // 更新所有障碍物
        this.obstacles.forEach(obstacle => {
            if (obstacle.isActive) {
                obstacle.update(deltaTime);
                
                // 检查是否需要移除（比如移出屏幕）
                if (this.shouldRemoveObstacle(obstacle)) {
                    this.removeObstacle(obstacle.id);
                }
            }
        });
        
        // 更新生成计时器
        this.updateSpawning(deltaTime);
        
        // 更新效果
        this.updateEffects(deltaTime);
    }
    
    updateSpawning(deltaTime) {
        if (this.game.gameState !== 'playing') return;
        
        this.spawnTimer += deltaTime;
        
        if (this.spawnTimer >= this.spawnInterval) {
            this.spawnTimer = 0;
            
            // 随机生成一个障碍物
            this.spawnRandomObstacle();
        }
    }
    
    spawnRandomObstacle() {
        // 随机选择一个类型
        const types = Array.from(this.obstacleTypes.keys());
        const randomType = types[Math.floor(Math.random() * types.length)];
        
        // 找到一个空闲位置
        const position = this.findEmptyPosition();
        if (!position) return;
        
        // 生成障碍物
        this.spawnObstacle(randomType, position.x, position.y);
    }
    
    findEmptyPosition() {
        const gridWidth = this.game.gridWidth;
        const gridHeight = this.game.gridHeight;
        
        // 尝试多次找到空闲位置
        for (let i = 0; i < 100; i++) {
            const x = Math.floor(Math.random() * (gridWidth - 4)) + 2;
            const y = Math.floor(Math.random() * (gridHeight - 4)) + 2;
            
            if (this.isPositionEmpty(x, y)) {
                return { x, y };
            }
        }
        
        return null;
    }
    
    isPositionEmpty(x, y) {
        // 检查是否与蛇重叠
        if (this.game.snake.segments.some(segment => 
            segment.x === x && segment.y === y
        )) {
            return false;
        }
        
        // 检查是否与食物重叠
        if (this.game.food && this.game.food.x === x && this.game.food.y === y) {
            return false;
        }
        
        // 检查是否与其他障碍物重叠
        for (const obstacle of this.obstacles.values()) {
            if (
                x >= obstacle.x &&
                x < obstacle.x + obstacle.width &&
                y >= obstacle.y &&
                y < obstacle.y + obstacle.height
            ) {
                return false;
            }
        }
        
        return true;
    }
    
    shouldRemoveObstacle(obstacle) {
        // 检查是否移出游戏区域
        const margin = 5;
        return (
            obstacle.x + obstacle.width < -margin ||
            obstacle.x > this.game.gridWidth + margin ||
            obstacle.y + obstacle.height < -margin ||
            obstacle.y > this.game.gridHeight + margin
        );
    }
    
    updateEffects(deltaTime) {
        // 更新激活的效果
        this.activeEffects.forEach(effect => {
            effect.duration -= deltaTime;
            if (effect.duration <= 0) {
                this.removeEffect(effect.id);
            }
        });
    }
    
    draw(ctx) {
        // 绘制所有障碍物
        this.obstacles.forEach(obstacle => {
            if (obstacle.isVisible) {
                obstacle.draw(ctx);
            }
        });
        
        // 绘制调试信息
        if (window.DEBUG_MODE) {
            this.drawDebugInfo(ctx);
        }
    }
    
    drawDebugInfo(ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        
        const info = [
            `障碍物数量: ${this.obstacles.size}`,
            `活跃效果: ${this.activeEffects.size}`,
            `生成计时器: ${Math.round(this.spawnTimer)}/${this.spawnInterval}`
        ];
        
        info.forEach((text, index) => {
            ctx.fillText(text, 10, 60 + index * 20);
        });
    }
    
    checkCollisions(snake) {
        if (!snake || !snake.head) return false;
        
        let collisionDetected = false;
        
        this.obstacles.forEach(obstacle => {
            if (obstacle.isCollidable && obstacle.isActive && obstacle.checkCollision(snake.head)) {
                console.log(`检测到与障碍物碰撞: ${obstacle.type} (${obstacle.id})`);
                
                // 处理碰撞
                this.handleCollision(obstacle, snake);
                collisionDetected = true;
            }
        });
        
        return collisionDetected;
    }
    
    handleCollision(obstacle, snake) {
        switch(obstacle.collisionType) {
            case 'block':
                // 阻挡型障碍物 - 游戏结束或减少生命
                console.log('撞到阻挡物！');
                this.game.handleObstacleCollision();
                break;
                
            case 'damage':
                // 伤害型障碍物
                console.log(`受到 ${obstacle.collisionDamage} 点伤害！`);
                this.game.lives -= obstacle.collisionDamage;
                this.game.updateUI();
                
                if (this.game.lives <= 0) {
                    this.game.gameOver();
                } else {
                    snake.reset();
                }
                break;
                
            case 'teleport':
                // 传送型障碍物
                if (obstacle.activate()) {
                    console.log('传送到新位置！');
                    this.teleportSnake(snake);
                }
                break;
                
            case 'speed_boost':
                // 加速型障碍物
                if (obstacle.activate()) {
                    console.log('获得速度加成！');
                    this.applySpeedBoost(snake);
                }
                break;
                
            default:
                console.log('未知碰撞类型:', obstacle.collisionType);
                this.game.handleObstacleCollision();
        }
    }
    
    teleportSnake(snake) {
        // 找到一个新的安全位置
        const newPosition = this.findEmptyPosition();
        if (newPosition) {
            // 将蛇传送到新位置
            const head = snake.head;
            const dx = newPosition.x - head.x;
            const dy = newPosition.y - head.y;
            
            // 移动整个蛇
            snake.segments.forEach(segment => {
                segment.x += dx;
                segment.y += dy;
            });
            
            console.log(`蛇被传送到 (${newPosition.x}, ${newPosition.y})`);
        }
    }
    
    applySpeedBoost(snake) {
        // 暂时增加游戏速度
        const originalSpeed = this.game.gameSpeed;
        this.game.gameSpeed = Math.max(50, originalSpeed - 50); // 增加速度
        
        // 添加效果
        this.applyEffect({
            id: 'speed_boost_' + Date.now(),
            type: 'speed_boost',
            duration: 5000, // 5秒
            onRemove: () => {
                // 恢复原速度
                this.game.gameSpeed = originalSpeed;
                console.log('速度加成结束');
            }
        });
        
        console.log(`速度提升: ${originalSpeed}ms -> ${this.game.gameSpeed}ms`);
    }
    
    applyEffect(effect) {
        this.activeEffects.add(effect);
        console.log(`应用效果: ${effect.type}`);
    }
    
    removeEffect(effectId) {
        for (const effect of this.activeEffects) {
            if (effect.id === effectId) {
                if (effect.onRemove) {
                    effect.onRemove();
                }
                this.activeEffects.delete(effect);
                console.log(`移除效果: ${effect.type}`);
                break;
            }
        }
    }
    
    checkPosition(x, y) {
        // 检查指定位置是否有障碍物
        for (const obstacle of this.obstacles.values()) {
            if (
                x >= obstacle.x &&
                x < obstacle.x + obstacle.width &&
                y >= obstacle.y &&
                y < obstacle.y + obstacle.height &&
                obstacle.isCollidable
            ) {
                return true;
            }
        }
        return false;
    }
    
    getObstacleAt(x, y) {
        // 获取指定位置的障碍物
        for (const obstacle of this.obstacles.values()) {
            if (
                x >= obstacle.x &&
                x < obstacle.x + obstacle.width &&
                y >= obstacle.y &&
                y < obstacle.y + obstacle.height
            ) {
                return obstacle;
            }
        }
        return null;
    }
    
    // 序列化/反序列化方法（用于保存/加载关卡）
    serialize() {
        const data = {
            obstacles: [],
            spawnPoints: this.spawnPoints,
            spawnInterval: this.spawnInterval
        };
        
        this.obstacles.forEach(obstacle => {
            if (obstacle.isActive) {
                data.obstacles.push({
                    type: obstacle.type,
                    x: obstacle.x,
                    y: obstacle.y,
                    width: obstacle.width,
                    height: obstacle.height,
                    color: obstacle.color,
                    velocity: obstacle.velocity,
                    rotation: obstacle.rotation,
                    health: obstacle.health,
                    isDestructible: obstacle.isDestructible,
                    collisionType: obstacle.collisionType
                });
            }
        });
        
        return data;
    }
    
    deserialize(data) {
        this.clearAll();
        
        this.spawnPoints = data.spawnPoints || [];
        this.spawnInterval = data.spawnInterval || 5000;
        
        data.obstacles.forEach(obsData => {
            this.spawnObstacle(obsData.type, obsData.x, obsData.y, {
                width: obsData.width,
                height: obsData.height,
                color: obsData.color,
                velocity: obsData.velocity,
                rotation: obsData.rotation,
                health: obsData.health,
                isDestructible: obsData.isDestructible,
                collisionType: obsData.collisionType
            });
        });
        
        console.log(`从数据加载了 ${data.obstacles.length} 个障碍物`);
    }
}