// 障碍物基础类
class Obstacle {
    constructor(type, x, y, config = {}) {
        // 基础属性
        this.id = this.generateId();
        this.type = type;
        this.x = x;
        this.y = y;
        this.width = config.width || 1;
        this.height = config.height || 1;
        this.rotation = config.rotation || 0;
        this.scale = config.scale || 1;
        this.opacity = config.opacity || 1;
        
        // 动态属性
        this.velocity = config.velocity || { x: 0, y: 0 };
        this.angularVelocity = config.angularVelocity || 0;
        this.path = config.path || null; // 移动路径
        this.pathIndex = 0;
        this.pathProgress = 0;
        
        // 互动属性
        this.cooldown = config.cooldown || 0;
        this.lastActivated = 0;
        this.effect = config.effect || null;
        this.activationRange = config.activationRange || 1;
        
        // 智能属性
        this.aiState = config.aiState || 'idle';
        this.target = config.target || null;
        this.behaviorTree = config.behaviorTree || null;
        
        // 视觉属性
        this.color = config.color || '#ff0000';
        this.pattern = config.pattern || 'solid';
        this.texture = config.texture || null;
        this.animation = config.animation || null;
        this.glow = config.glow || false;
        this.glowColor = config.glowColor || '#ff0000';
        this.glowIntensity = config.glowIntensity || 0.5;
        
        // 游戏属性
        this.health = config.health || 1;
        this.damage = config.damage || 1;
        this.isDestructible = config.isDestructible || false;
        this.scoreValue = config.scoreValue || 0;
        this.isActive = config.isActive !== undefined ? config.isActive : true;
        
        // 碰撞属性
        this.collisionType = config.collisionType || 'block'; // block, damage, teleport, etc.
        this.collisionDamage = config.collisionDamage || 1;
        
        // 状态
        this.isVisible = true;
        this.isCollidable = true;
        this.age = 0; // 障碍物存在时间
    }
    
    generateId() {
        return 'obstacle_' + Math.random().toString(36).substr(2, 9);
    }
    
    update(deltaTime) {
        this.age += deltaTime;
        
        // 更新位置
        this.x += this.velocity.x * deltaTime / 1000;
        this.y += this.velocity.y * deltaTime / 1000;
        
        // 更新旋转
        this.rotation += this.angularVelocity * deltaTime / 1000;
        
        // 路径跟随
        if (this.path && this.path.length > 0) {
            this.followPath(deltaTime);
        }
        
        // 更新动画
        if (this.animation) {
            this.updateAnimation(deltaTime);
        }
        
        // 更新冷却
        if (this.cooldown > 0 && this.lastActivated > 0) {
            this.lastActivated -= deltaTime;
            if (this.lastActivated < 0) this.lastActivated = 0;
        }
        
        // 更新AI状态
        if (this.behaviorTree) {
            this.updateAI(deltaTime);
        }
    }
    
    followPath(deltaTime) {
        if (this.pathIndex >= this.path.length) {
            this.pathIndex = 0;
            this.pathProgress = 0;
        }
        
        const currentPoint = this.path[this.pathIndex];
        const nextPoint = this.path[(this.pathIndex + 1) % this.path.length];
        
        // 计算到下一个点的距离
        const dx = nextPoint.x - currentPoint.x;
        const dy = nextPoint.y - currentPoint.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // 移动速度（假设每秒移动1个单位）
        const speed = 1;
        const moveDistance = speed * deltaTime / 1000;
        
        this.pathProgress += moveDistance / distance;
        
        if (this.pathProgress >= 1) {
            this.pathProgress = 0;
            this.pathIndex = (this.pathIndex + 1) % this.path.length;
        } else {
            // 线性插值
            this.x = currentPoint.x + dx * this.pathProgress;
            this.y = currentPoint.y + dy * this.pathProgress;
        }
    }
    
    updateAnimation(deltaTime) {
        // 简单的动画更新逻辑
        if (this.animation.type === 'pulse') {
            const pulseSpeed = this.animation.speed || 1;
            const minScale = this.animation.minScale || 0.8;
            const maxScale = this.animation.maxScale || 1.2;
            
            const pulseValue = Math.sin(this.age * pulseSpeed * 0.001);
            this.scale = minScale + (maxScale - minScale) * (pulseValue + 1) / 2;
        }
        
        if (this.animation.type === 'rotate') {
            const rotateSpeed = this.animation.speed || 1;
            this.rotation += rotateSpeed * deltaTime / 1000;
        }
        
        if (this.animation.type === 'colorCycle') {
            const cycleSpeed = this.animation.speed || 1;
            const colors = this.animation.colors || ['#ff0000', '#00ff00', '#0000ff'];
            
            const colorIndex = Math.floor(this.age * cycleSpeed * 0.001) % colors.length;
            this.color = colors[colorIndex];
        }
    }
    
    updateAI(deltaTime) {
        // 简单的AI行为树更新
        // 这里可以扩展为完整的行为树系统
        switch(this.aiState) {
            case 'idle':
                // 空闲状态，可能随机移动或等待
                if (Math.random() < 0.01) {
                    this.aiState = 'patrol';
                }
                break;
                
            case 'patrol':
                // 巡逻状态
                if (!this.path || this.path.length === 0) {
                    // 如果没有路径，创建简单的巡逻路径
                    this.createPatrolPath();
                }
                break;
                
            case 'chase':
                // 追逐目标
                if (this.target) {
                    this.chaseTarget();
                }
                break;
                
            case 'attack':
                // 攻击状态
                this.performAttack();
                break;
        }
    }
    
    createPatrolPath() {
        // 创建简单的矩形巡逻路径
        const patrolRadius = 5;
        this.path = [
            { x: this.x - patrolRadius, y: this.y - patrolRadius },
            { x: this.x + patrolRadius, y: this.y - patrolRadius },
            { x: this.x + patrolRadius, y: this.y + patrolRadius },
            { x: this.x - patrolRadius, y: this.y + patrolRadius }
        ];
    }
    
    chaseTarget() {
        if (!this.target) return;
        
        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            const speed = 2; // 追逐速度
            this.velocity.x = (dx / distance) * speed;
            this.velocity.y = (dy / distance) * speed;
        }
    }
    
    performAttack() {
        // 简单的攻击行为
        console.log(`障碍物 ${this.id} 发动攻击！`);
        // 这里可以添加攻击逻辑，比如发射子弹等
    }
    
    draw(ctx) {
        if (!this.isVisible) return;
        
        ctx.save();
        
        // 应用变换
        const centerX = this.x * this.game.gridSize + (this.width * this.game.gridSize) / 2;
        const centerY = this.y * this.game.gridSize + (this.height * this.game.gridSize) / 2;
        
        ctx.translate(centerX, centerY);
        ctx.rotate(this.rotation * Math.PI / 180);
        ctx.scale(this.scale, this.scale);
        ctx.globalAlpha = this.opacity;
        
        // 绘制发光效果
        if (this.glow) {
            this.drawGlowEffect(ctx);
        }
        
        // 根据类型绘制障碍物
        switch(this.type) {
            case 'wall':
                this.drawWall(ctx);
                break;
            case 'spike':
                this.drawSpike(ctx);
                break;
            case 'moving_platform':
                this.drawMovingPlatform(ctx);
                break;
            case 'portal':
                this.drawPortal(ctx);
                break;
            default:
                this.drawDefault(ctx);
        }
        
        // 绘制调试信息（开发时使用）
        if (window.DEBUG_MODE) {
            this.drawDebugInfo(ctx);
        }
        
        ctx.restore();
    }
    
    drawGlowEffect(ctx) {
        const glowRadius = Math.max(this.width, this.height) * this.game.gridSize * 1.5;
        
        // 创建发光渐变
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, glowRadius);
        gradient.addColorStop(0, this.glowColor);
        gradient.addColorStop(0.3, this.glowColor.replace(')', `, ${this.glowIntensity})`).replace('rgb', 'rgba'));
        gradient.addColorStop(1, this.glowColor.replace(')', ', 0)').replace('rgb', 'rgba'));
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
        ctx.fill();
    }
    
    drawWall(ctx) {
        const width = this.width * this.game.gridSize;
        const height = this.height * this.game.gridSize;
        const halfWidth = width / 2;
        const halfHeight = height / 2;
        
        // 绘制墙的主体
        ctx.fillStyle = this.color;
        ctx.fillRect(-halfWidth, -halfHeight, width, height);
        
        // 添加纹理效果
        ctx.fillStyle = this.adjustColor(this.color, -30);
        for (let i = 0; i < this.width; i++) {
            for (let j = 0; j < this.height; j++) {
                const brickWidth = this.game.gridSize;
                const brickHeight = this.game.gridSize;
                const brickX = -halfWidth + i * brickWidth;
                const brickY = -halfHeight + j * brickHeight;
                
                ctx.strokeStyle = this.adjustColor(this.color, -50);
                ctx.lineWidth = 1;
                ctx.strokeRect(brickX, brickY, brickWidth, brickHeight);
                
                // 添加砖块内部的阴影
                ctx.fillStyle = this.adjustColor(this.color, (i + j) % 2 === 0 ? -20 : 20);
                ctx.fillRect(brickX + 1, brickY + 1, brickWidth - 2, brickHeight - 2);
            }
        }
    }
    
    drawSpike(ctx) {
        const radius = Math.min(this.width, this.height) * this.game.gridSize / 2;
        
        // 绘制尖刺
        ctx.fillStyle = this.color;
        ctx.beginPath();
        
        const spikes = 8; // 尖刺数量
        for (let i = 0; i < spikes; i++) {
            const angle = (i * 2 * Math.PI) / spikes;
            const spikeLength = radius * 1.5;
            
            // 尖刺点
            const x1 = Math.cos(angle) * radius;
            const y1 = Math.sin(angle) * radius;
            const x2 = Math.cos(angle) * spikeLength;
            const y2 = Math.sin(angle) * spikeLength;
            
            // 下一个尖刺点
            const nextAngle = ((i + 1) * 2 * Math.PI) / spikes;
            const x3 = Math.cos(nextAngle) * radius;
            const y3 = Math.sin(nextAngle) * radius;
            
            if (i === 0) {
                ctx.moveTo(x1, y1);
            }
            
            ctx.lineTo(x2, y2);
            ctx.lineTo(x3, y3);
        }
        
        ctx.closePath();
        ctx.fill();
        
        // 添加内部高光
        ctx.fillStyle = this.adjustColor(this.color, 50);
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.7, 0, Math.PI * 2);
        ctx.fill();
    }
    
    drawMovingPlatform(ctx) {
        const width = this.width * this.game.gridSize;
        const height = this.height * this.game.gridSize;
        const halfWidth = width / 2;
        const halfHeight = height / 2;
        
        // 绘制平台主体
        ctx.fillStyle = this.color;
        ctx.fillRect(-halfWidth, -halfHeight, width, height);
        
        // 添加机械纹理
        ctx.strokeStyle = this.adjustColor(this.color, -50);
        ctx.lineWidth = 2;
        
        // 绘制平台边缘
        ctx.strokeRect(-halfWidth, -halfHeight, width, height);
        
        // 绘制内部网格
        const gridSize = this.game.gridSize / 2;
        ctx.beginPath();
        for (let x = -halfWidth + gridSize; x < halfWidth; x += gridSize) {
            ctx.moveTo(x, -halfHeight);
            ctx.lineTo(x, halfHeight);
        }
        for (let y = -halfHeight + gridSize; y < halfHeight; y += gridSize) {
            ctx.moveTo(-halfWidth, y);
            ctx.lineTo(halfWidth, y);
        }
        ctx.stroke();
        
        // 添加运动指示器
        if (this.velocity.x !== 0 || this.velocity.y !== 0) {
            ctx.fillStyle = '#ffff00';
            const arrowSize = Math.min(width, height) / 4;
            
            // 计算速度方向
            const angle = Math.atan2(this.velocity.y, this.velocity.x);
            
            ctx.save();
            ctx.rotate(angle);
            ctx.beginPath();
            ctx.moveTo(arrowSize, 0);
            ctx.lineTo(-arrowSize/2, arrowSize/2);
            ctx.lineTo(-arrowSize/2, -arrowSize/2);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
    }
    
    drawPortal(ctx) {
        const radius = Math.min(this.width, this.height) * this.game.gridSize / 2;
        
        // 绘制漩涡效果
        const rings = 5;
        for (let i = 0; i < rings; i++) {
            const ringRadius = radius * (i + 1) / rings;
            const ringColor = this.adjustColor(this.color, i * 20);
            
            ctx.strokeStyle = ringColor;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // 绘制中心漩涡
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.3, 0, Math.PI * 2);
        ctx.fill();
        
        // 添加旋转动画效果
        if (this.animation && this.animation.type === 'rotate') {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            const spinAngle = this.age * 0.01;
            ctx.arc(0, 0, radius * 0.8, spinAngle, spinAngle + Math.PI);
            ctx.stroke();
        }
    }
    
    drawDefault(ctx) {
        const width = this.width * this.game.gridSize;
        const height = this.height * this.game.gridSize;
        const halfWidth = width / 2;
        const halfHeight = height / 2;
        
        // 绘制默认矩形障碍物
        ctx.fillStyle = this.color;
        ctx.fillRect(-halfWidth, -halfHeight, width, height);
        
        // 添加边框
        ctx.strokeStyle = this.adjustColor(this.color, -50);
        ctx.lineWidth = 2;
        ctx.strokeRect(-halfWidth, -halfHeight, width, height);
        
        // 添加类型标识
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.type.charAt(0).toUpperCase(), 0, 0);
    }
    
    drawDebugInfo(ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        
        const debugInfo = [
            `ID: ${this.id.substr(0, 8)}`,
            `Type: ${this.type}`,
            `Pos: (${Math.round(this.x)}, ${Math.round(this.y)})`,
            `Vel: (${this.velocity.x.toFixed(2)}, ${this.velocity.y.toFixed(2)})`,
            `Health: ${this.health}`,
            `State: ${this.aiState}`
        ];
        
        const offsetY = -this.height * this.game.gridSize / 2 - 60;
        debugInfo.forEach((info, index) => {
            ctx.fillText(info, -this.width * this.game.gridSize / 2, offsetY + index * 12);
        });
    }
    
    checkCollision(snakeHead) {
        if (!this.isCollidable || !this.isActive) return false;
        
        // 简单的AABB碰撞检测
        const headX = snakeHead.x;
        const headY = snakeHead.y;
        
        return (
            headX >= this.x &&
            headX < this.x + this.width &&
            headY >= this.y &&
            headY < this.y + this.height
        );
    }
    
    activate() {
        if (this.cooldown > 0 && this.lastActivated > 0) {
            return false; // 还在冷却中
        }
        
        this.lastActivated = this.cooldown;
        
        // 根据障碍物类型执行不同的激活效果
        switch(this.type) {
            case 'portal':
                return this.activatePortal();
            case 'speed_boost':
                return this.activateSpeedBoost();
            case 'damage_zone':
                return this.activateDamageZone();
            default:
                return true;
        }
    }
    
    activatePortal() {
        console.log(`传送门 ${this.id} 被激活！`);
        // 这里可以添加传送逻辑
        return true;
    }
    
    activateSpeedBoost() {
        console.log(`加速区 ${this.id} 被激活！`);
        // 这里可以添加加速逻辑
        return true;
    }
    
    activateDamageZone() {
        console.log(`伤害区 ${this.id} 被激活！`);
        // 这里可以添加伤害逻辑
        return true;
    }
    
    takeDamage(amount) {
        if (!this.isDestructible) return false;
        
        this.health -= amount;
        if (this.health <= 0) {
            this.destroy();
            return true;
        }
        return false;
    }
    
    destroy() {
        this.isVisible = false;
        this.isCollidable = false;
        this.isActive = false;
        
        console.log(`障碍物 ${this.id} 被摧毁！`);
        
        // 这里可以添加销毁动画或效果
        if (this.onDestroy) {
            this.onDestroy();
        }
    }
    
    adjustColor(color, amount) {
        // 简单的颜色调整函数
        let usePound = false;
        
        if (color[0] === "#") {
            color = color.slice(1);
            usePound = true;
        }
        
        const num = parseInt(color, 16);
        let r = (num >> 16) + amount;
        let g = ((num >> 8) & 0x00FF) + amount;
        let b = (num & 0x0000FF) + amount;
        
        r = Math.min(Math.max(0, r), 255);
        g = Math.min(Math.max(0, g), 255);
        b = Math.min(Math.max(0, b), 255);
        
        return (usePound ? "#" : "") + (b | (g << 8) | (r << 16)).toString(16).padStart(6, '0');
    }
    
    // 设置游戏引用（在ObstacleManager中调用）
    setGame(game) {
        this.game = game;
    }
}