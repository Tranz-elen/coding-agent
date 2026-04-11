# 障碍物系统

这是一个完整的贪吃蛇游戏障碍物系统，包含多种类型的障碍物和智能行为。

## 系统架构

### 1. Obstacle 类
障碍物基础类，包含以下功能：

#### 基础属性
- 位置、大小、旋转、缩放
- 类型标识（wall, spike, moving_platform, portal, speed_boost等）
- 视觉属性（颜色、纹理、动画、发光效果）

#### 动态行为
- 移动和旋转
- 路径跟随
- 动画系统（脉冲、旋转、颜色循环）
- AI行为树（空闲、巡逻、追逐、攻击）

#### 游戏交互
- 碰撞检测（阻挡、伤害、传送、加速等）
- 激活效果（传送、加速、伤害等）
- 生命值和可摧毁性

### 2. ObstacleManager 类
障碍物管理器，包含以下功能：

#### 障碍物管理
- 障碍物类型注册和创建
- 障碍物生成和移除
- 碰撞检测和处理
- 序列化/反序列化

#### 游戏集成
- 边界墙自动生成
- 随机障碍物生成
- 效果系统（加速、传送等）
- 与游戏主循环集成

## 障碍物类型

### 1. 墙 (Wall)
- **类型**: `wall`
- **描述**: 静态阻挡障碍物
- **颜色**: 棕色 (#8B4513)
- **碰撞**: 阻挡型，游戏结束或减少生命
- **可摧毁**: 否

### 2. 尖刺 (Spike)
- **类型**: `spike`
- **描述**: 伤害性障碍物
- **颜色**: 红色 (#ff0000)
- **碰撞**: 伤害型，减少生命值
- **可摧毁**: 是
- **特效**: 发光效果

### 3. 移动平台 (Moving Platform)
- **类型**: `moving_platform`
- **描述**: 沿着固定路径移动的平台
- **颜色**: 钢蓝色 (#4682B4)
- **碰撞**: 阻挡型
- **可摧毁**: 否
- **动画**: 旋转动画

### 4. 传送门 (Portal)
- **类型**: `portal`
- **描述**: 将蛇传送到另一个位置
- **颜色**: 深紫色 (#9400D3)
- **碰撞**: 传送型
- **可摧毁**: 否
- **特效**: 漩涡动画，发光效果
- **冷却**: 3秒

### 5. 加速区 (Speed Boost)
- **类型**: `speed_boost`
- **描述**: 暂时增加蛇的移动速度
- **颜色**: 亮绿色 (#00FF00)
- **碰撞**: 加速型
- **可摧毁**: 否
- **动画**: 脉冲动画
- **特效**: 发光效果

## 碰撞类型

### 1. 阻挡型 (Block)
- 蛇撞到后游戏结束或减少生命
- 适用于：墙、移动平台

### 2. 伤害型 (Damage)
- 蛇撞到后减少生命值
- 适用于：尖刺

### 3. 传送型 (Teleport)
- 蛇撞到后被传送到随机位置
- 适用于：传送门

### 4. 加速型 (Speed Boost)
- 蛇撞到后暂时增加移动速度
- 适用于：加速区

## 使用方法

### 1. 创建障碍物
```javascript
// 创建一面墙
const wall = obstacleManager.spawnObstacle('wall', 10, 10, {
    width: 3,
    height: 1,
    color: '#8B4513'
});

// 创建尖刺
const spike = obstacleManager.spawnObstacle('spike', 15, 8, {
    damage: 2,
    glowIntensity: 0.5
});

// 创建移动平台
const platform = obstacleManager.spawnObstacle('moving_platform', 5, 5, {
    velocity: { x: 1, y: 0 },
    width: 2,
    height: 1
});
```

### 2. 碰撞检测
```javascript
// 在游戏主循环中检查碰撞
if (obstacleManager.checkCollisions(snake)) {
    // 碰撞处理在 ObstacleManager.handleCollision 中完成
}
```

### 3. 自定义障碍物类型
```javascript
// 注册新的障碍物类型
obstacleManager.obstacleTypes.set('custom_type', {
    name: '自定义障碍物',
    description: '自定义障碍物描述',
    color: '#FFA500',
    health: 1,
    isDestructible: true,
    collisionType: 'damage',
    create: (x, y, config) => new Obstacle('custom_type', x, y, {
        color: config?.color || '#FFA500',
        width: config?.width || 1,
        height: config?.height || 1,
        animation: { type: 'pulse', speed: 1 },
        collisionDamage: config?.damage || 1
    })
});
```

## 扩展功能

### 1. 路径系统
障碍物可以沿着预定义的路径移动：
```javascript
const obstacle = new Obstacle('moving_platform', 0, 0, {
    path: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 }
    ]
});
```

### 2. AI行为树
障碍物可以拥有智能行为：
```javascript
const obstacle = new Obstacle('enemy', 0, 0, {
    aiState: 'patrol',
    target: snake.head,
    behaviorTree: customBehaviorTree
});
```

### 3. 效果系统
障碍物可以应用各种效果：
```javascript
// 应用加速效果
obstacleManager.applyEffect({
    id: 'speed_boost_' + Date.now(),
    type: 'speed_boost',
    duration: 5000,
    onRemove: () => {
        console.log('速度加成结束');
    }
});
```

## 调试模式

启用调试模式可以显示障碍物的详细信息：
```javascript
window.DEBUG_MODE = true;
```

调试信息包括：
- 障碍物ID和类型
- 位置和速度
- 生命值和状态
- 碰撞检测信息

## 性能优化

1. **空间分区**: 对于大量障碍物，可以使用四叉树或网格进行空间分区
2. **视锥剔除**: 只渲染屏幕内的障碍物
3. **对象池**: 重用障碍物对象，避免频繁创建和销毁
4. **LOD系统**: 根据距离使用不同精度的渲染

## 注意事项

1. 障碍物坐标使用网格坐标，不是像素坐标
2. 碰撞检测使用AABB（轴对齐边界框）
3. 动画和效果使用deltaTime进行时间同步
4. 确保障碍物不会生成在蛇或食物的位置上