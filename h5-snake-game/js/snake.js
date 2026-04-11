// 贪吃蛇类
class Snake {
    constructor(game) {
        this.game = game;
        this.gridSize = game.gridSize;
        
        // 蛇的初始位置和方向
        this.direction = 'right';
        this.nextDirection = 'right';
        
        // 蛇身段
        this.segments = [];
        this.initializeSnake();
        
        // 蛇的视觉属性
        this.headColor = '#00ff00';
        this.bodyColor = '#00cc00';
        this.tailColor = '#009900';
        this.eyeColor = '#ffffff';
        this.pupilColor = '#000000';
    }
    
    initializeSnake() {
        // 初始蛇身：3个段
        const startX = Math.floor(this.game.gridWidth / 4);
        const startY = Math.floor(this.game.gridHeight / 2);
        
        this.segments = [
            { x: startX, y: startY },     // 头
            { x: startX - 1, y: startY }, // 身体
            { x: startX - 2, y: startY }  // 尾巴
        ];
    }
    
    get head() {
        return this.segments[0];
    }
    
    get tail() {
        return this.segments[this.segments.length - 1];
    }
    
    update() {
        // 更新方向
        this.direction = this.nextDirection;
        
        // 保存旧的头位置
        const oldHead = { ...this.head };
        
        // 根据方向移动头
        switch(this.direction) {
            case 'up':
                this.head.y--;
                break;
            case 'down':
                this.head.y++;
                break;
            case 'left':
                this.head.x--;
                break;
            case 'right':
                this.head.x++;
                break;
        }
        
        // 移动身体：每个段移动到前一个段的位置
        for (let i = this.segments.length - 1; i > 0; i--) {
            this.segments[i].x = this.segments[i - 1].x;
            this.segments[i].y = this.segments[i - 1].y;
        }
        
        // 更新头的位置（已经在上面的switch中更新了）
        this.segments[0] = this.head;
    }
    
    grow() {
        // 在尾巴位置添加新段
        const newSegment = { ...this.tail };
        this.segments.push(newSegment);
        
        // 每吃5个食物增加速度
        if (this.segments.length % 5 === 0 && this.game.gameSpeed > 50) {
            this.game.gameSpeed -= 10;
            console.log(`速度增加！当前速度: ${this.game.gameSpeed}ms`);
        }
    }
    
    draw(ctx) {
        if (this.segments.length === 0) return;
        
        // 绘制蛇身
        for (let i = 0; i < this.segments.length; i++) {
            const segment = this.segments[i];
            const x = segment.x * this.gridSize;
            const y = segment.y * this.gridSize;
            
            // 选择颜色
            let color;
            if (i === 0) {
                color = this.headColor; // 头
            } else if (i === this.segments.length - 1) {
                color = this.tailColor; // 尾巴
            } else {
                color = this.bodyColor; // 身体
            }
            
            // 绘制蛇段
            ctx.fillStyle = color;
            ctx.fillRect(x + 1, y + 1, this.gridSize - 2, this.gridSize - 2);
            
            // 添加圆角效果
            ctx.fillStyle = this.adjustColor(color, 30); // 更亮
            ctx.beginPath();
            ctx.roundRect(x + 2, y + 2, this.gridSize - 4, this.gridSize - 4, 4);
            ctx.fill();
            
            // 添加内部阴影
            ctx.fillStyle = this.adjustColor(color, -30); // 更暗
            ctx.beginPath();
            ctx.roundRect(x + 3, y + 3, this.gridSize - 6, this.gridSize - 6, 3);
            ctx.fill();
            
            // 绘制头部特征
            if (i === 0) {
                this.drawHeadFeatures(ctx, x, y);
            }
            
            // 绘制身体连接处的圆滑效果
            if (i > 0) {
                this.drawSegmentConnection(ctx, this.segments[i-1], segment, i);
            }
        }
    }
    
    drawHeadFeatures(ctx, x, y) {
        const centerX = x + this.gridSize / 2;
        const centerY = y + this.gridSize / 2;
        const eyeRadius = this.gridSize / 6;
        const pupilRadius = eyeRadius / 2;
        
        // 根据方向计算眼睛位置
        let leftEyeX, leftEyeY, rightEyeX, rightEyeY;
        
        switch(this.direction) {
            case 'right':
                leftEyeX = centerX + this.gridSize / 4;
                leftEyeY = centerY - this.gridSize / 5;
                rightEyeX = centerX + this.gridSize / 4;
                rightEyeY = centerY + this.gridSize / 5;
                break;
            case 'left':
                leftEyeX = centerX - this.gridSize / 4;
                leftEyeY = centerY - this.gridSize / 5;
                rightEyeX = centerX - this.gridSize / 4;
                rightEyeY = centerY + this.gridSize / 5;
                break;
            case 'up':
                leftEyeX = centerX - this.gridSize / 5;
                leftEyeY = centerY - this.gridSize / 4;
                rightEyeX = centerX + this.gridSize / 5;
                rightEyeY = centerY - this.gridSize / 4;
                break;
            case 'down':
                leftEyeX = centerX - this.gridSize / 5;
                leftEyeY = centerY + this.gridSize / 4;
                rightEyeX = centerX + this.gridSize / 5;
                rightEyeY = centerY + this.gridSize / 4;
                break;
        }
        
        // 绘制眼睛
        ctx.fillStyle = this.eyeColor;
        ctx.beginPath();
        ctx.arc(leftEyeX, leftEyeY, eyeRadius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(rightEyeX, rightEyeY, eyeRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // 绘制瞳孔
        ctx.fillStyle = this.pupilColor;
        ctx.beginPath();
        ctx.arc(leftEyeX, leftEyeY, pupilRadius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(rightEyeX, rightEyeY, pupilRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // 绘制嘴巴
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 1;
        ctx.beginPath();
        
        if (this.direction === 'right' || this.direction === 'left') {
            const mouthY = centerY;
            const mouthStartX = this.direction === 'right' ? centerX + this.gridSize / 4 : centerX - this.gridSize / 4;
            const mouthEndX = this.direction === 'right' ? centerX + this.gridSize / 3 : centerX - this.gridSize / 3;
            
            ctx.moveTo(mouthStartX, mouthY);
            ctx.lineTo(mouthEndX, mouthY);
        } else {
            const mouthX = centerX;
            const mouthStartY = this.direction === 'up' ? centerY - this.gridSize / 4 : centerY + this.gridSize / 4;
            const mouthEndY = this.direction === 'up' ? centerY - this.gridSize / 3 : centerY + this.gridSize / 3;
            
            ctx.moveTo(mouthX, mouthStartY);
            ctx.lineTo(mouthX, mouthEndY);
        }
        
        ctx.stroke();
    }
    
    drawSegmentConnection(ctx, prevSegment, currentSegment, index) {
        const prevX = prevSegment.x * this.gridSize;
        const prevY = prevSegment.y * this.gridSize;
        const currX = currentSegment.x * this.gridSize;
        const currY = currentSegment.y * this.gridSize;
        
        // 计算连接方向
        const dx = currX - prevX;
        const dy = currY - prevY;
        
        // 如果是在同一直线上，绘制连接处的圆滑效果
        if (dx !== 0 && dy === 0) {
            // 水平连接
            const connectionX = dx > 0 ? prevX + this.gridSize : currX;
            const connectionY = prevY + this.gridSize / 2;
            
            ctx.fillStyle = this.adjustColor(this.bodyColor, -20);
            ctx.beginPath();
            ctx.arc(connectionX, connectionY, this.gridSize / 4, 0, Math.PI * 2);
            ctx.fill();
        } else if (dy !== 0 && dx === 0) {
            // 垂直连接
            const connectionX = prevX + this.gridSize / 2;
            const connectionY = dy > 0 ? prevY + this.gridSize : currY;
            
            ctx.fillStyle = this.adjustColor(this.bodyColor, -20);
            ctx.beginPath();
            ctx.arc(connectionX, connectionY, this.gridSize / 4, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    checkSelfCollision() {
        if (this.segments.length < 4) return false;
        
        const head = this.head;
        
        // 检查头是否与身体任何部分碰撞（跳过头部本身）
        for (let i = 1; i < this.segments.length; i++) {
            if (head.x === this.segments[i].x && head.y === this.segments[i].y) {
                return true;
            }
        }
        
        return false;
    }
    
    reset() {
        // 重置蛇到初始位置
        this.initializeSnake();
        this.direction = 'right';
        this.nextDirection = 'right';
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
}

// 为Canvas添加roundRect方法（如果不存在）
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, width, height, radius) {
        if (width < 2 * radius) radius = width / 2;
        if (height < 2 * radius) radius = height / 2;
        
        this.beginPath();
        this.moveTo(x + radius, y);
        this.arcTo(x + width, y, x + width, y + height, radius);
        this.arcTo(x + width, y + height, x, y + height, radius);
        this.arcTo(x, y + height, x, y, radius);
        this.arcTo(x, y, x + width, y, radius);
        this.closePath();
        return this;
    };
}