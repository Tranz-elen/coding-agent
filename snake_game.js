// 游戏配置
const CONFIG = {
    GRID_SIZE: 20,
    INITIAL_SPEED: 150,
    SPEED_INCREMENT: 10,
    SCORE_PER_FOOD: 10,
    SPEED_UP_SCORE: 50,
    SOUND_ENABLED: true,
    SPECIAL_FOOD_CHANCE: 0.2, // 20% 几率生成特殊食物
    SPECIAL_FOOD_DURATION: 10000, // 特殊食物持续时间 10秒
    OBSTACLE_CHANCE: 0.1, // 10% 几率生成障碍物
    MAX_OBSTACLES: 5, // 最大障碍物数量
    POWER_UP_CHANCE: 0.15, // 15% 几率生成道具
    POWER_UP_DURATION: 8000 // 道具持续时间 8秒
};

// 难度配置
const DIFFICULTY_CONFIG = {
    easy: {
        name: '简单',
        speed: 200,
        speedIncrement: 5,
        scorePerFood: 5,
        speedUpScore: 100
    },
    normal: {
        name: '普通',
        speed: 150,
        speedIncrement: 10,
        scorePerFood: 10,
        speedUpScore: 50
    },
    hard: {
        name: '困难',
        speed: 100,
        speedIncrement: 15,
        scorePerFood: 15,
        speedUpScore: 30
    },
    expert: {
        name: '专家',
        speed: 70,
        speedIncrement: 20,
        scorePerFood: 20,
        speedUpScore: 20
    }
};

// 特殊食物类型
const FOOD_TYPES = {
    normal: {
        name: '普通食物',
        color: '#ff3838',
        highlight: '#ff7675',
        score: 10,
        effect: null
    },
    golden: {
        name: '黄金食物',
        color: '#ffd700',
        highlight: '#fffacd',
        score: 50,
        effect: 'doubleScore'
    },
    speed: {
        name: '速度食物',
        color: '#00bfff',
        highlight: '#87cefa',
        score: 20,
        effect: 'speedUp'
    },
    slow: {
        name: '减速食物',
        color: '#9370db',
        highlight: '#d8bfd8',
        score: 15,
        effect: 'slowDown'
    },
    shrink: {
        name: '缩小食物',
        color: '#32cd32',
        highlight: '#90ee90',
        score: 30,
        effect: 'shrinkSnake'
    },
    shield: {
        name: '护盾食物',
        color: '#ff9f43',
        highlight: '#ffcc8a',
        score: 25,
        effect: 'shield'
    },
    ghost: {
        name: '幽灵食物',
        color: '#a29bfe',
        highlight: '#d1cdfe',
        score: 35,
        effect: 'ghost'
    }
};

// 道具类型
const POWER_UPS = {
    magnet: {
        name: '磁铁道具',
        color: '#ff3838',
        icon: '🧲',
        effect: 'magnet',
        duration: 8000
    },
    bomb: {
        name: '炸弹道具',
        color: '#ff9f43',
        icon: '💣',
        effect: 'bomb',
        duration: 5000
    },
    freeze: {
        name: '冰冻道具',
        color: '#00bfff',
        icon: '❄️',
        effect: 'freeze',
        duration: 6000
    },
    portal: {
        name: '传送门道具',
        color: '#9b59b6',
        icon: '🌀',
        effect: 'portal',
        duration: 10000
    },
    timeStop: {
        name: '时间停止道具',
        color: '#3498db',
        icon: '⏱️',
        effect: 'timeStop',
        duration: 5000
    },
    clone: {
        name: '分身道具',
        color: '#e74c3c',
        icon: '👥',
        effect: 'clone',
        duration: 8000
    },
    scoreMultiplier: {
        name: '分数倍增道具',
        color: '#f1c40f',
        icon: '💰',
        effect: 'scoreMultiplier',
        duration: 10000
    },
    invincible: {
        name: '无敌道具',
        color: '#2ecc71',
        icon: '🛡️',
        effect: 'invincible',
        duration: 7000
    }
};

// 障碍物类型
const OBSTACLES = {
    rock: {
        name: '岩石',
        color: '#7f8c8d',
        pattern: 'solid'
    },
    spike: {
        name: '尖刺',
        color: '#e74c3c',
        pattern: 'spike'
    },
    wall: {
        name: '墙壁',
        color: '#34495e',
        pattern: 'wall'
    }
};

// 游戏主题配置
const THEMES = {
    dark: {
        name: '暗黑主题',
        background: '#1a1a2e',
        secondary: '#16213e',
        snakeHead: '#00dbde',
        snakeBody: '#4cd137',
        food: '#ff3838',
        text: '#ffffff',
        accent: '#fc00ff'
    },
    light: {
        name: '明亮主题',
        background: '#f0f2f5',
        secondary: '#ffffff',
        snakeHead: '#3498db',
        snakeBody: '#2ecc71',
        food: '#e74c3c',
        text: '#2c3e50',
        accent: '#9b59b6'
    },
    retro: {
        name: '复古主题',
        background: '#0a0a0a',
        secondary: '#1a1a1a',
        snakeHead: '#00ff00',
        snakeBody: '#00cc00',
        food: '#ff0000',
        text: '#00ff00',
        accent: '#ffff00'
    },
    ocean: {
        name: '海洋主题',
        background: '#0a192f',
        secondary: '#172a45',
        snakeHead: '#64ffda',
        snakeBody: '#00b4d8',
        food: '#ff6b6b',
        text: '#ccd6f6',
        accent: '#ffd166'
    }
};

// 游戏统计管理器
const GameStatsManager = {
    STORAGE_KEY: 'snake_game_stats',
    
    getStats: function() {
        try {
            const stats = localStorage.getItem(this.STORAGE_KEY);
            return stats ? JSON.parse(stats) : {
                totalGames: 0,
                totalScore: 0,
                maxLength: 0,
                specialFoodCount: 0,
                totalTime: 0,
                lastGameTime: 0
            };
        } catch (e) {
            console.warn('读取游戏统计失败:', e);
            return {
                totalGames: 0,
                totalScore: 0,
                maxLength: 0,
                specialFoodCount: 0,
                totalTime: 0,
                lastGameTime: 0
            };
        }
    },
    
    updateStats: function(gameData) {
        try {
            const stats = this.getStats();
            
            stats.totalGames += 1;
            stats.totalScore += gameData.score;
            stats.maxLength = Math.max(stats.maxLength, gameData.length);
            stats.specialFoodCount += gameData.specialFoodCount || 0;
            stats.totalTime += gameData.time || 0;
            stats.lastGameTime = Date.now();
            
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(stats));
            return stats;
        } catch (e) {
            console.warn('更新游戏统计失败:', e);
            return null;
        }
    },
    
    resetStats: function() {
        try {
            const defaultStats = {
                totalGames: 0,
                totalScore: 0,
                maxLength: 0,
                specialFoodCount: 0,
                totalTime: 0,
                lastGameTime: 0
            };
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(defaultStats));
            return defaultStats;
        } catch (e) {
            console.warn('重置游戏统计失败:', e);
            return null;
        }
    },
    
    getAverageScore: function() {
        const stats = this.getStats();
        return stats.totalGames > 0 ? Math.round(stats.totalScore / stats.totalGames) : 0;
    }
};

// 高分记录系统
const HighScoreManager = {
    STORAGE_KEY: 'snake_game_high_scores',
    
    getHighScores: function() {
        try {
            const scores = localStorage.getItem(this.STORAGE_KEY);
            return scores ? JSON.parse(scores) : {};
        } catch (e) {
            console.warn('读取高分记录失败:', e);
            return {};
        }
    },
    
    saveHighScore: function(difficulty, score) {
        try {
            const scores = this.getHighScores();
            const currentHigh = scores[difficulty] || 0;
            
            if (score > currentHigh) {
                scores[difficulty] = score;
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(scores));
                return true; // 新记录
            }
            return false; // 未打破记录
        } catch (e) {
            console.warn('保存高分记录失败:', e);
            return false;
        }
    },
    
    getHighScore: function(difficulty) {
        const scores = this.getHighScores();
        return scores[difficulty] || 0;
    },
    
    resetHighScores: function() {
        try {
            localStorage.removeItem(this.STORAGE_KEY);
            return true;
        } catch (e) {
            console.warn('重置高分记录失败:', e);
            return false;
        }
    }
};

// 游戏状态
let gameState = {
    snake: [
        { x: 5, y: 10 },
        { x: 4, y: 10 },
        { x: 3, y: 10 }
    ],
    food: { x: 0, y: 0, type: 'normal' },
    obstacles: [],
    powerUps: [],
    direction: 'right',
    nextDirection: 'right',
    score: 0,
    speed: CONFIG.INITIAL_SPEED,
    gameLoop: null,
    isRunning: false,
    isPaused: false,
    gameOver: false,
    currentDifficulty: 'normal',
    difficultyConfig: DIFFICULTY_CONFIG.normal,
    specialFoodTimer: null,
    specialFoodActive: false,
    gameStartTime: 0,
    gameTime: 0,
    specialFoodEaten: 0,
    currentTheme: 'dark',
    activePowerUps: new Map(),
    shieldActive: false,
    ghostActive: false,
    magnetActive: false,
    freezeActive: false,
    portalActive: false,
    timeStopActive: false,
    cloneActive: false,
    cloneSnake: null,
    cloneTimer: null,
    scoreMultiplierActive: false,
    scoreMultiplier: 1,
    invincibleActive: false
};

// 音效系统
const SoundManager = {
    sounds: {},
    enabled: CONFIG.SOUND_ENABLED,
    
    init: function() {
        if (!this.enabled) return;
        
        // 创建音频上下文
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.createSounds();
        } catch (e) {
            console.warn('音频上下文创建失败，音效将被禁用:', e);
            this.enabled = false;
        }
    },
    
    createSounds: function() {
        // 吃到食物音效
        this.sounds.eat = this.createEatSound();
        
        // 游戏结束音效
        this.sounds.gameOver = this.createGameOverSound();
        
        // 移动音效
        this.sounds.move = this.createMoveSound();
        
        // 开始游戏音效
        this.sounds.start = this.createStartSound();
        
        // 暂停音效
        this.sounds.pause = this.createPauseSound();
    },
    
    createEatSound: function() {
        return {
            play: () => this.playTone(523.25, 0.1, 'sine', 0.3) // C5
        };
    },
    
    createGameOverSound: function() {
        return {
            play: () => {
                this.playTone(261.63, 0.3, 'sine', 0.5); // C4
                setTimeout(() => this.playTone(196.00, 0.5, 'sine', 0.5), 300); // G3
            }
        };
    },
    
    createMoveSound: function() {
        return {
            play: () => this.playTone(100, 0.05, 'square', 0.1)
        };
    },
    
    createStartSound: function() {
        return {
            play: () => {
                this.playTone(659.25, 0.1, 'sine', 0.3); // E5
                setTimeout(() => this.playTone(783.99, 0.1, 'sine', 0.3), 100); // G5
                setTimeout(() => this.playTone(1046.50, 0.2, 'sine', 0.3), 200); // C6
            }
        };
    },
    
    createPauseSound: function() {
        return {
            play: () => this.playTone(392.00, 0.2, 'sine', 0.3) // G4
        };
    },
    
    playTone: function(frequency, duration, type = 'sine', volume = 0.5) {
        if (!this.enabled || !this.audioContext) return;
        
        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.value = frequency;
            oscillator.type = type;
            
            gainNode.gain.value = volume;
            gainNode.gain.exponentialRampToValueAtTime(
                0.001,
                this.audioContext.currentTime + duration
            );
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + duration);
        } catch (e) {
            console.warn('播放音效失败:', e);
        }
    },
    
    play: function(soundName) {
        if (!this.enabled || !this.sounds[soundName]) return;
        this.sounds[soundName].play();
    },
    
    toggle: function() {
        this.enabled = !this.enabled;
        return this.enabled;
    }
};

// DOM元素
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const speedElement = document.getElementById('speed');
const lengthElement = document.getElementById('length');
const difficultyElement = document.getElementById('difficulty');
const highScoreElement = document.getElementById('high-score');
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const resetBtn = document.getElementById('reset-btn');
const soundBtn = document.getElementById('sound-btn');
const resetHighscoreBtn = document.getElementById('reset-highscore-btn');
const resetStatsBtn = document.getElementById('reset-stats-btn');
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const difficultySelect = document.getElementById('difficulty-select');
const gameOverlay = document.getElementById('game-overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayText = document.getElementById('overlay-text');
const keys = document.querySelectorAll('.key');

// 统计元素
const totalGamesElement = document.getElementById('total-games');
const totalScoreElement = document.getElementById('total-score');
const averageScoreElement = document.getElementById('average-score');
const maxLengthElement = document.getElementById('max-length');
const specialFoodCountElement = document.getElementById('special-food-count');
const totalTimeElement = document.getElementById('total-time');

// 切换音效
function toggleSound() {
    const enabled = SoundManager.toggle();
    if (enabled) {
        soundBtn.innerHTML = '<i class="fas fa-volume-up"></i> 音效';
        soundBtn.classList.remove('muted');
        soundBtn.title = '点击关闭音效';
        // 播放测试音效
        SoundManager.play('start');
    } else {
        soundBtn.innerHTML = '<i class="fas fa-volume-mute"></i> 静音';
        soundBtn.classList.add('muted');
        soundBtn.title = '点击开启音效';
    }
    
    // 保存音效设置到本地存储
    try {
        localStorage.setItem('snake_game_sound_enabled', enabled);
    } catch (e) {
        console.warn('保存音效设置失败:', e);
    }
}

// 加载音效设置
function loadSoundSettings() {
    try {
        const savedSetting = localStorage.getItem('snake_game_sound_enabled');
        if (savedSetting !== null) {
            const enabled = savedSetting === 'true';
            SoundManager.enabled = enabled;
            
            if (!enabled) {
                soundBtn.innerHTML = '<i class="fas fa-volume-mute"></i> 静音';
                soundBtn.classList.add('muted');
                soundBtn.title = '点击开启音效';
            } else {
                soundBtn.innerHTML = '<i class="fas fa-volume-up"></i> 音效';
                soundBtn.classList.remove('muted');
                soundBtn.title = '点击关闭音效';
            }
        }
    } catch (e) {
        console.warn('加载音效设置失败:', e);
    }
}

// 初始化游戏
function initGame() {
    // 清除特殊食物计时器
    if (gameState.specialFoodTimer) {
        clearTimeout(gameState.specialFoodTimer);
        gameState.specialFoodTimer = null;
    }
    
    // 清除所有活动道具计时器
    gameState.activePowerUps.forEach((timer, powerUpId) => {
        clearTimeout(timer);
    });
    
    // 重置游戏状态
    gameState = {
        snake: [
            { x: 5, y: 10 },
            { x: 4, y: 10 },
            { x: 3, y: 10 }
        ],
        food: { x: 0, y: 0, type: 'normal' },
        obstacles: [],
        powerUps: [],
        direction: 'right',
        nextDirection: 'right',
        score: 0,
        speed: gameState.difficultyConfig.speed,
        gameLoop: null,
        isRunning: false,
        isPaused: false,
        gameOver: false,
        currentDifficulty: gameState.currentDifficulty,
        difficultyConfig: gameState.difficultyConfig,
        specialFoodTimer: null,
        specialFoodActive: false,
        gameStartTime: 0,
        gameTime: 0,
        specialFoodEaten: 0,
        currentTheme: gameState.currentTheme,
        activePowerUps: new Map(),
        shieldActive: false,
        ghostActive: false,
        magnetActive: false,
        freezeActive: false,
        portalActive: false
    };
    
    // 生成第一个食物
    generateFood();
    
    // 生成初始障碍物
    generateInitialObstacles();
    
    // 更新UI
    updateUI();
    
    // 显示开始界面
    showOverlay('贪吃蛇游戏', '点击"开始游戏"按钮开始');
    
    // 绘制初始状态
    draw();
}

// 生成食物
function generateFood() {
    const gridWidth = canvas.width / CONFIG.GRID_SIZE;
    const gridHeight = canvas.height / CONFIG.GRID_SIZE;
    
    let foodPosition;
    let validPosition = false;
    let attempts = 0;
    const maxAttempts = 100;
    
    // 确保食物不会生成在蛇身上、障碍物上或道具上
    while (!validPosition && attempts < maxAttempts) {
        foodPosition = {
            x: Math.floor(Math.random() * gridWidth),
            y: Math.floor(Math.random() * gridHeight)
        };
        
        validPosition = true;
        
        // 检查是否在蛇身上
        for (const segment of gameState.snake) {
            if (segment.x === foodPosition.x && segment.y === foodPosition.y) {
                validPosition = false;
                break;
            }
        }
        
        // 检查是否在障碍物上
        if (validPosition) {
            for (const obstacle of gameState.obstacles) {
                if (obstacle.x === foodPosition.x && obstacle.y === foodPosition.y) {
                    validPosition = false;
                    break;
                }
            }
        }
        
        // 检查是否在道具上
        if (validPosition) {
            for (const powerUp of gameState.powerUps) {
                if (powerUp.x === foodPosition.x && powerUp.y === foodPosition.y) {
                    validPosition = false;
                    break;
                }
            }
        }
        
        attempts++;
    }
    
    // 确定食物类型
    let foodType = 'normal';
    if (Math.random() < CONFIG.SPECIAL_FOOD_CHANCE) {
        const specialTypes = ['golden', 'speed', 'slow', 'shrink', 'shield', 'ghost'];
        foodType = specialTypes[Math.floor(Math.random() * specialTypes.length)];
        gameState.specialFoodActive = true;
        
        // 设置特殊食物过期计时器
        if (gameState.specialFoodTimer) {
            clearTimeout(gameState.specialFoodTimer);
        }
        gameState.specialFoodTimer = setTimeout(() => {
            if (gameState.food.type === foodType) {
                generateFood(); // 重新生成食物
            }
        }, CONFIG.SPECIAL_FOOD_DURATION);
    }
    
    gameState.food = {
        x: foodPosition.x,
        y: foodPosition.y,
        type: foodType
    };
}

// 生成初始障碍物
function generateInitialObstacles() {
    const gridWidth = canvas.width / CONFIG.GRID_SIZE;
    const gridHeight = canvas.height / CONFIG.GRID_SIZE;
    
    // 根据难度生成不同数量的障碍物
    let obstacleCount = 0;
    switch (gameState.currentDifficulty) {
        case 'easy':
            obstacleCount = 2;
            break;
        case 'normal':
            obstacleCount = 3;
            break;
        case 'hard':
            obstacleCount = 4;
            break;
        case 'expert':
            obstacleCount = 5;
            break;
    }
    
    for (let i = 0; i < obstacleCount; i++) {
        generateObstacle();
    }
}

// 生成障碍物
function generateObstacle() {
    if (gameState.obstacles.length >= CONFIG.MAX_OBSTACLES) return;
    
    const gridWidth = canvas.width / CONFIG.GRID_SIZE;
    const gridHeight = canvas.height / CONFIG.GRID_SIZE;
    
    let obstaclePosition;
    let validPosition = false;
    let attempts = 0;
    const maxAttempts = 50;
    
    // 确保障碍物不会生成在蛇身上、食物上或道具上
    while (!validPosition && attempts < maxAttempts) {
        obstaclePosition = {
            x: Math.floor(Math.random() * gridWidth),
            y: Math.floor(Math.random() * gridHeight)
        };
        
        validPosition = true;
        
        // 检查是否在蛇身上
        for (const segment of gameState.snake) {
            if (segment.x === obstaclePosition.x && segment.y === obstaclePosition.y) {
                validPosition = false;
                break;
            }
        }
        
        // 检查是否在食物上
        if (validPosition) {
            if (gameState.food.x === obstaclePosition.x && gameState.food.y === obstaclePosition.y) {
                validPosition = false;
            }
        }
        
        // 检查是否在道具上
        if (validPosition) {
            for (const powerUp of gameState.powerUps) {
                if (powerUp.x === obstaclePosition.x && powerUp.y === obstaclePosition.y) {
                    validPosition = false;
                    break;
                }
            }
        }
        
        // 检查是否在其他障碍物上
        if (validPosition) {
            for (const obstacle of gameState.obstacles) {
                if (obstacle.x === obstaclePosition.x && obstacle.y === obstaclePosition.y) {
                    validPosition = false;
                    break;
                }
            }
        }
        
        // 确保障碍物不在起始位置附近
        if (validPosition) {
            const startX = 5, startY = 10;
            const distance = Math.sqrt(
                Math.pow(obstaclePosition.x - startX, 2) + 
                Math.pow(obstaclePosition.y - startY, 2)
            );
            if (distance < 4) {
                validPosition = false;
            }
        }
        
        attempts++;
    }
    
    if (validPosition) {
        const obstacleTypes = Object.keys(OBSTACLES);
        const type = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
        
        gameState.obstacles.push({
            x: obstaclePosition.x,
            y: obstaclePosition.y,
            type: type
        });
    }
}

// 生成道具
function generatePowerUp() {
    if (Math.random() > CONFIG.POWER_UP_CHANCE) return;
    
    const gridWidth = canvas.width / CONFIG.GRID_SIZE;
    const gridHeight = canvas.height / CONFIG.GRID_SIZE;
    
    let powerUpPosition;
    let validPosition = false;
    let attempts = 0;
    const maxAttempts = 50;
    
    // 确保道具不会生成在蛇身上、食物上或障碍物上
    while (!validPosition && attempts < maxAttempts) {
        powerUpPosition = {
            x: Math.floor(Math.random() * gridWidth),
            y: Math.floor(Math.random() * gridHeight)
        };
        
        validPosition = true;
        
        // 检查是否在蛇身上
        for (const segment of gameState.snake) {
            if (segment.x === powerUpPosition.x && segment.y === powerUpPosition.y) {
                validPosition = false;
                break;
            }
        }
        
        // 检查是否在食物上
        if (validPosition) {
            if (gameState.food.x === powerUpPosition.x && gameState.food.y === powerUpPosition.y) {
                validPosition = false;
            }
        }
        
        // 检查是否在障碍物上
        if (validPosition) {
            for (const obstacle of gameState.obstacles) {
                if (obstacle.x === powerUpPosition.x && obstacle.y === powerUpPosition.y) {
                    validPosition = false;
                    break;
                }
            }
        }
        
        // 检查是否在其他道具上
        if (validPosition) {
            for (const powerUp of gameState.powerUps) {
                if (powerUp.x === powerUpPosition.x && powerUp.y === powerUpPosition.y) {
                    validPosition = false;
                    break;
                }
            }
        }
        
        attempts++;
    }
    
    if (validPosition) {
        const powerUpTypes = Object.keys(POWER_UPS);
        const type = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
        const powerUpId = Date.now() + Math.random();
        
        gameState.powerUps.push({
            id: powerUpId,
            x: powerUpPosition.x,
            y: powerUpPosition.y,
            type: type,
            createdAt: Date.now()
        });
        
        // 设置道具过期计时器
        const timer = setTimeout(() => {
            removePowerUp(powerUpId);
        }, POWER_UPS[type].duration);
        
        gameState.activePowerUps.set(powerUpId, timer);
    }
}

// 移除道具
function removePowerUp(powerUpId) {
    gameState.powerUps = gameState.powerUps.filter(powerUp => powerUp.id !== powerUpId);
    gameState.activePowerUps.delete(powerUpId);
}

// 绘制游戏
function draw() {
    // console.log('draw() called, canvas size:', canvas.width, 'x', canvas.height);
    console.log('gameState.snake:', gameState.snake);
    
    const time = Date.now() / 1000;
    
    // 动态背景颜色
    const bgPulse = Math.sin(time * 0.5) * 0.05 + 0.95;
    ctx.fillStyle = `rgba(15, 21, 37, ${bgPulse})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 绘制星空背景
    drawStarfield();
    
    // 绘制网格
    drawGrid();
    
    // 绘制障碍物
    // drawObstacles(); // 暂时注释掉，函数未定义
    
    // 绘制道具
    // drawPowerUps(); // 暂时注释掉，函数未定义
    
    // 绘制蛇
    drawSnake();
    
    // 绘制食物
    drawFood();
    
    // 绘制状态效果
    // drawStatusEffects(); // 暂时注释掉，函数未定义
}

// 绘制星空背景
function drawStarfield() {
    const time = Date.now() / 1000;
    
    // 创建一些星星
    if (!window.starfield) {
        window.starfield = [];
        for (let i = 0; i < 50; i++) {
            window.starfield.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: Math.random() * 2 + 0.5,
                speed: Math.random() * 0.5 + 0.1,
                brightness: Math.random() * 0.5 + 0.5
            });
        }
    }
    
    // 绘制星星
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    window.starfield.forEach(star => {
        // 星星闪烁
        const twinkle = Math.sin(time * star.speed * 2) * 0.3 + 0.7;
        ctx.globalAlpha = star.brightness * twinkle;
        
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
        
        // 缓慢移动星星
        star.x += star.speed * 0.1;
        if (star.x > canvas.width) {
            star.x = 0;
            star.y = Math.random() * canvas.height;
        }
    });
    ctx.globalAlpha = 1.0;
}

// 绘制网格
function drawGrid() {
    const time = Date.now() / 2000;
    
    // 动态网格颜色
    const gridAlpha = 0.05 + Math.sin(time) * 0.02;
    ctx.strokeStyle = `rgba(255, 255, 255, ${gridAlpha})`;
    ctx.lineWidth = 1;
    
    // 垂直线
    for (let x = 0; x <= canvas.width; x += CONFIG.GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    
    // 水平线
    for (let y = 0; y <= canvas.height; y += CONFIG.GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
    
    // 网格交叉点效果
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    for (let x = 0; x <= canvas.width; x += CONFIG.GRID_SIZE) {
        for (let y = 0; y <= canvas.height; y += CONFIG.GRID_SIZE) {
            const pulse = Math.sin(time * 2 + x * 0.01 + y * 0.01) * 0.5 + 0.5;
            ctx.globalAlpha = pulse * 0.1;
            ctx.beginPath();
            ctx.arc(x, y, 1, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    ctx.globalAlpha = 1.0;
}

// 绘制蛇
function drawSnake() {
    // console.log('drawSnake() called, snake length:', gameState.snake.length);
    
    const time = Date.now() / 1000;
    
    gameState.snake.forEach((segment, index) => {
        // console.log(`Segment ${index}: x=${segment.x}, y=${segment.y}`);
        const x = segment.x * CONFIG.GRID_SIZE;
        const y = segment.y * CONFIG.GRID_SIZE;
        const size = CONFIG.GRID_SIZE;
        
        // 蛇头
        if (index === 0) {
            // 蛇头呼吸动画
            const pulse = Math.sin(time * 3) * 0.1 + 0.9;
            const headSize = size * pulse;
            const offset = (size - headSize) / 2;
            
            ctx.fillStyle = '#00dbde'; // 默认蛇头颜色
            ctx.fillRect(
                x + offset,
                y + offset,
                headSize,
                headSize
            );
            
            // 蛇头眼睛
            ctx.fillStyle = '#ffffff';
            const eyeSize = size / 5;
            const eyeOffset = size / 3;
            
            // 根据方向绘制眼睛
            if (gameState.direction === 'right') {
                ctx.fillRect(
                    x + size - eyeOffset,
                    y + eyeOffset,
                    eyeSize,
                    eyeSize
                );
                ctx.fillRect(
                    x + size - eyeOffset,
                    y + size - eyeOffset - eyeSize,
                    eyeSize,
                    eyeSize
                );
            } else if (gameState.direction === 'left') {
                ctx.fillRect(
                    x + eyeOffset - eyeSize,
                    y + eyeOffset,
                    eyeSize,
                    eyeSize
                );
                ctx.fillRect(
                    x + eyeOffset - eyeSize,
                    y + size - eyeOffset - eyeSize,
                    eyeSize,
                    eyeSize
                );
            } else if (gameState.direction === 'up') {
                ctx.fillRect(
                    x + eyeOffset,
                    y + eyeOffset - eyeSize,
                    eyeSize,
                    eyeSize
                );
                ctx.fillRect(
                    x + size - eyeOffset - eyeSize,
                    y + eyeOffset - eyeSize,
                    eyeSize,
                    eyeSize
                );
            } else if (gameState.direction === 'down') {
                ctx.fillRect(
                    x + eyeOffset,
                    y + size - eyeOffset,
                    eyeSize,
                    eyeSize
                );
                ctx.fillRect(
                    x + size - eyeOffset - eyeSize,
                    y + size - eyeOffset,
                    eyeSize,
                    eyeSize
                );
            }
            
            // 蛇头光泽效果
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.beginPath();
            ctx.ellipse(
                x + size * 0.3,
                y + size * 0.3,
                size * 0.15,
                size * 0.1,
                0,
                0,
                Math.PI * 2
            );
            ctx.fill();
        } else {
            // 蛇身波浪动画
            const waveOffset = Math.sin(time * 5 + index * 0.5) * 2;
            
            // 蛇身主体
            ctx.fillStyle = '#4cd137'; // 默认蛇身颜色
            ctx.fillRect(
                x + waveOffset,
                y + waveOffset,
                size - waveOffset * 2,
                size - waveOffset * 2
            );
            
            // 蛇身内部细节
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.fillRect(
                x + 2 + waveOffset,
                y + 2 + waveOffset,
                size - 4 - waveOffset * 2,
                size - 4 - waveOffset * 2
            );
            
            // 蛇身鳞片效果
            if (index % 2 === 0) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                ctx.beginPath();
                ctx.arc(
                    x + size / 2 + waveOffset,
                    y + size / 2 + waveOffset,
                    size / 4,
                    0,
                    Math.PI * 2
                );
                ctx.fill();
            }
        }
    });
    
    // 绘制分身蛇（如果存在）
    if (gameState.cloneActive && gameState.cloneSnake) {
        drawCloneSnake();
    }
}

// 绘制分身蛇
function drawCloneSnake() {
    // console.log('drawCloneSnake() called, clone snake length:', gameState.cloneSnake.length);
    
    const time = Date.now() / 1000;
    
    gameState.cloneSnake.forEach((segment, index) => {
        // console.log(`Clone segment ${index}: x=${segment.x}, y=${segment.y}`);
        const x = segment.x * CONFIG.GRID_SIZE;
        const y = segment.y * CONFIG.GRID_SIZE;
        const size = CONFIG.GRID_SIZE;
        
        // 分身蛇头
        if (index === 0) {
            // 分身蛇头呼吸动画
            const pulse = Math.sin(time * 3) * 0.1 + 0.9;
            const headSize = size * pulse;
            const offset = (size - headSize) / 2;
            
            ctx.fillStyle = '#e74c3c'; // 分身蛇头颜色
            ctx.fillRect(
                x + offset,
                y + offset,
                headSize,
                headSize
            );
            
            // 分身蛇头眼睛
            ctx.fillStyle = '#ffffff';
            const eyeSize = size / 5;
            const eyeOffset = size / 3;
            
            // 根据方向绘制眼睛
            if (gameState.direction === 'right') {
                ctx.fillRect(
                    x + size - eyeOffset,
                    y + eyeOffset,
                    eyeSize,
                    eyeSize
                );
                ctx.fillRect(
                    x + size - eyeOffset,
                    y + size - eyeOffset - eyeSize,
                    eyeSize,
                    eyeSize
                );
            } else if (gameState.direction === 'left') {
                ctx.fillRect(
                    x + eyeOffset - eyeSize,
                    y + eyeOffset,
                    eyeSize,
                    eyeSize
                );
                ctx.fillRect(
                    x + eyeOffset - eyeSize,
                    y + size - eyeOffset - eyeSize,
                    eyeSize,
                    eyeSize
                );
            } else if (gameState.direction === 'up') {
                ctx.fillRect(
                    x + eyeOffset,
                    y + eyeOffset - eyeSize,
                    eyeSize,
                    eyeSize
                );
                ctx.fillRect(
                    x + size - eyeOffset - eyeSize,
                    y + eyeOffset - eyeSize,
                    eyeSize,
                    eyeSize
                );
            } else if (gameState.direction === 'down') {
                ctx.fillRect(
                    x + eyeOffset,
                    y + size - eyeOffset,
                    eyeSize,
                    eyeSize
                );
                ctx.fillRect(
                    x + size - eyeOffset - eyeSize,
                    y + size - eyeOffset,
                    eyeSize,
                    eyeSize
                );
            }
            
            // 分身蛇头光泽效果
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.beginPath();
            ctx.ellipse(
                x + size * 0.3,
                y + size * 0.3,
                size * 0.15,
                size * 0.1,
                0,
                0,
                Math.PI * 2
            );
            ctx.fill();
        } else {
            // 分身蛇身波浪动画
            const waveOffset = Math.sin(time * 5 + index * 0.5) * 2;
            
            // 分身蛇身主体
            ctx.fillStyle = '#ff7979'; // 分身蛇身颜色
            ctx.fillRect(
                x + waveOffset,
                y + waveOffset,
                size - waveOffset * 2,
                size - waveOffset * 2
            );
            
            // 分身蛇身内部细节
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.fillRect(
                x + 2 + waveOffset,
                y + 2 + waveOffset,
                size - 4 - waveOffset * 2,
                size - 4 - waveOffset * 2
            );
            
            // 分身蛇身鳞片效果
            if (index % 2 === 0) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                ctx.beginPath();
                ctx.arc(
                    x + size / 2 + waveOffset,
                    y + size / 2 + waveOffset,
                    size / 4,
                    0,
                    Math.PI * 2
                );
                ctx.fill();
            }
        }
    });
}

// 绘制食物
function drawFood() {
    const foodType = gameState.food.type;
    const foodConfig = FOOD_TYPES[foodType];
    
    // 绘制食物主体
    ctx.fillStyle = foodConfig.color;
    ctx.beginPath();
    ctx.arc(
        gameState.food.x * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2,
        gameState.food.y * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2,
        CONFIG.GRID_SIZE / 2 - 2,
        0,
        Math.PI * 2
    );
    ctx.fill();
    
    // 绘制食物高光
    ctx.fillStyle = foodConfig.highlight;
    ctx.beginPath();
    ctx.arc(
        gameState.food.x * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 3,
        gameState.food.y * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 3,
        CONFIG.GRID_SIZE / 6,
        0,
        Math.PI * 2
    );
    ctx.fill();
    
    // 如果是特殊食物，绘制闪烁效果
    if (foodType !== 'normal') {
        const time = Date.now() / 500;
        const pulse = Math.sin(time) * 0.3 + 0.7;
        
        ctx.strokeStyle = foodConfig.highlight;
        ctx.lineWidth = 2;
        ctx.globalAlpha = pulse;
        ctx.beginPath();
        ctx.arc(
            gameState.food.x * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2,
            gameState.food.y * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2,
            CONFIG.GRID_SIZE / 2 + 2,
            0,
            Math.PI * 2
        );
        ctx.stroke();
        ctx.globalAlpha = 1.0;
    }
}

// 更新游戏状态
function update() {
    // 更新方向
    gameState.direction = gameState.nextDirection;
    
    // 获取蛇头
    const head = { ...gameState.snake[0] };
    
    // 根据方向移动蛇头
    switch (gameState.direction) {
        case 'up':
            head.y -= 1;
            break;
        case 'down':
            head.y += 1;
            break;
        case 'left':
            head.x -= 1;
            break;
        case 'right':
            head.x += 1;
            break;
    }
    
    // 播放移动音效
    SoundManager.play('move');
    
    // 检查碰撞
    const collisionType = checkCollision(head);
    if (collisionType) {
        gameOver(collisionType);
        return;
    }
    
    // 添加新的蛇头
    gameState.snake.unshift(head);
    
    // 检查是否吃到食物
    if (head.x === gameState.food.x && head.y === gameState.food.y) {
        // 播放吃到食物音效
        SoundManager.play('eat');
        
        // 获取食物类型
        const foodType = gameState.food.type;
        const foodConfig = FOOD_TYPES[foodType];
        
        // 基础分数
        let scoreToAdd = gameState.difficultyConfig.scorePerFood;
        
        // 应用特殊食物效果
        if (foodType !== 'normal') {
            scoreToAdd = foodConfig.score;
            applyFoodEffect(foodConfig.effect);
            
            // 统计特殊食物
            gameState.specialFoodEaten++;
            
            // 清除特殊食物计时器
            if (gameState.specialFoodTimer) {
                clearTimeout(gameState.specialFoodTimer);
                gameState.specialFoodTimer = null;
            }
            gameState.specialFoodActive = false;
        }
        
        // 增加分数（应用分数倍增效果）
        const finalScore = scoreToAdd * gameState.scoreMultiplier;
        gameState.score += finalScore;
        
        // 根据难度配置增加速度
        if (gameState.score % gameState.difficultyConfig.speedUpScore === 0) {
            gameState.speed = Math.max(30, gameState.speed - gameState.difficultyConfig.speedIncrement);
        }
        
        // 生成新食物
        generateFood();
    } else {
        // 如果没有吃到食物，移除蛇尾
        gameState.snake.pop();
    }
    
    // 检查是否吃到道具
    checkPowerUpCollision();
    
    // 检查磁铁效果
    if (gameState.magnetActive) {
        applyMagnetEffect();
    }
    
    // 随机生成道具
    if (Math.random() < 0.01) { // 1% 的概率每帧生成道具
        generatePowerUp();
    }
    
    // 更新UI
    updateUI();
}

// 检查碰撞，返回碰撞类型或false
function checkCollision(head) {
    const gridWidth = canvas.width / CONFIG.GRID_SIZE;
    const gridHeight = canvas.height / CONFIG.GRID_SIZE;
    
    // 检查墙壁碰撞（幽灵模式下可以穿墙）
    if (!gameState.ghostActive) {
        if (head.x < 0) {
            return 'wall_left';
        }
        if (head.x >= gridWidth) {
            return 'wall_right';
        }
        if (head.y < 0) {
            return 'wall_top';
        }
        if (head.y >= gridHeight) {
            return 'wall_bottom';
        }
    } else {
        // 幽灵模式：穿墙处理
        if (head.x < 0) head.x = gridWidth - 1;
        if (head.x >= gridWidth) head.x = 0;
        if (head.y < 0) head.y = gridHeight - 1;
        if (head.y >= gridHeight) head.y = 0;
    }
    
    // 检查自身碰撞（护盾模式或无敌模式下可以穿过自己）
    if (!gameState.shieldActive && !gameState.invincibleActive) {
        for (let i = 1; i < gameState.snake.length; i++) {
            if (head.x === gameState.snake[i].x && head.y === gameState.snake[i].y) {
                return 'self';
            }
        }
    }
    
    // 检查分身蛇碰撞（如果分身蛇存在，护盾模式或无敌模式下可以穿过分身蛇）
    if (gameState.cloneActive && gameState.cloneSnake && !gameState.shieldActive && !gameState.invincibleActive) {
        for (let i = 0; i < gameState.cloneSnake.length; i++) {
            if (head.x === gameState.cloneSnake[i].x && head.y === gameState.cloneSnake[i].y) {
                // console.log('Collision with clone snake at:', head.x, head.y);
                return 'clone';
            }
        }
    }
    
    // 检查障碍物碰撞（幽灵模式或无敌模式下可以穿过障碍物）
    if (!gameState.ghostActive && !gameState.invincibleActive) {
        for (const obstacle of gameState.obstacles) {
            if (head.x === obstacle.x && head.y === obstacle.y) {
                return 'obstacle';
            }
        }
    }
    
    return false;
}

// 分身蛇移动
function moveCloneSnake() {
    if (!gameState.cloneActive || !gameState.cloneSnake || gameState.cloneSnake.length === 0) {
        return;
    }
    
    // 获取分身蛇头
    const cloneHead = { ...gameState.cloneSnake[0] };
    
    // 分身蛇随机移动（有一定概率跟随主蛇方向）
    const followChance = 0.3; // 30% 概率跟随主蛇方向
    let direction;
    
    if (Math.random() < followChance && gameState.snake.length > 0) {
        // 跟随主蛇方向
        direction = gameState.direction;
    } else {
        // 随机选择方向
        const directions = ['up', 'down', 'left', 'right'];
        direction = directions[Math.floor(Math.random() * directions.length)];
    }
    
    // 根据方向移动分身蛇头
    switch (direction) {
        case 'up':
            cloneHead.y -= 1;
            break;
        case 'down':
            cloneHead.y += 1;
            break;
        case 'left':
            cloneHead.x -= 1;
            break;
        case 'right':
            cloneHead.x += 1;
            break;
    }
    
    // 分身蛇穿墙处理
    const gridWidth = canvas.width / CONFIG.GRID_SIZE;
    const gridHeight = canvas.height / CONFIG.GRID_SIZE;
    
    if (cloneHead.x < 0) cloneHead.x = gridWidth - 1;
    if (cloneHead.x >= gridWidth) cloneHead.x = 0;
    if (cloneHead.y < 0) cloneHead.y = gridHeight - 1;
    if (cloneHead.y >= gridHeight) cloneHead.y = 0;
    
    // 添加新的分身蛇头
    gameState.cloneSnake.unshift(cloneHead);
    
    // 分身蛇不会吃食物，所以总是移除蛇尾
    gameState.cloneSnake.pop();
}

// 游戏结束
function gameOver(collisionType = 'unknown') {
    gameState.isRunning = false;
    gameState.gameOver = true;
    
    if (gameState.gameLoop) {
        clearInterval(gameState.gameLoop);
        gameState.gameLoop = null;
    }
    
    // 清除分身蛇定时器
    if (gameState.cloneTimer) {
        clearInterval(gameState.cloneTimer);
        gameState.cloneTimer = null;
    }
    
    // 计算游戏时间
    gameState.gameTime = Math.floor((Date.now() - gameState.gameStartTime) / 1000);
    
    // 播放游戏结束音效
    SoundManager.play('gameOver');
    
    // 保存高分记录
    const isNewRecord = HighScoreManager.saveHighScore(gameState.currentDifficulty, gameState.score);
    const highScore = HighScoreManager.getHighScore(gameState.currentDifficulty);
    
    // 更新游戏统计
    const gameData = {
        score: gameState.score,
        length: gameState.snake.length,
        specialFoodCount: gameState.specialFoodEaten,
        time: gameState.gameTime
    };
    GameStatsManager.updateStats(gameData);
    
    // 更新统计显示
    updateStatsDisplay();
    
    // 根据碰撞类型生成死亡原因消息
    let deathReason = '';
    switch (collisionType) {
        case 'wall_left':
            deathReason = '撞到了左边墙壁';
            break;
        case 'wall_right':
            deathReason = '撞到了右边墙壁';
            break;
        case 'wall_top':
            deathReason = '撞到了顶部墙壁';
            break;
        case 'wall_bottom':
            deathReason = '撞到了底部墙壁';
            break;
        case 'self':
            deathReason = '撞到了自己的身体';
            break;
        case 'clone':
            deathReason = '撞到了分身蛇';
            break;
        case 'obstacle':
            deathReason = '撞到了障碍物';
            break;
        default:
            deathReason = '未知原因';
    }
    
    let message = `死亡原因: ${deathReason}<br>最终得分: ${gameState.score}<br>蛇的长度: ${gameState.snake.length}<br>游戏时间: ${gameState.gameTime}秒<br>特殊食物: ${gameState.specialFoodEaten}个<br>当前难度最高分: ${highScore}`;
    
    if (isNewRecord) {
        message += `<br><span style="color: #ffd700; font-weight: bold;">🎉 恭喜！创造了新的最高分记录！</span>`;
    }
    
    showOverlay('游戏结束', message);
}

// 开始游戏
function startGame() {
    if (gameState.gameOver) {
        initGame();
    }
    
    gameState.isRunning = true;
    gameState.isPaused = false;
    gameState.gameStartTime = Date.now();
    
    hideOverlay();
    
    if (gameState.gameLoop) {
        clearInterval(gameState.gameLoop);
    }
    
    gameState.gameLoop = setInterval(() => {
        update();
        draw();
    }, gameState.speed);
}

// 暂停游戏
function pauseGame() {
    if (!gameState.isRunning || gameState.gameOver) return;
    
    if (gameState.isPaused) {
        // 恢复游戏
        gameState.isPaused = false;
        pauseBtn.innerHTML = '<i class="fas fa-pause"></i> 暂停';
        
        gameState.gameLoop = setInterval(() => {
            update();
            draw();
        }, gameState.speed);
    } else {
        // 暂停游戏
        gameState.isPaused = true;
        pauseBtn.innerHTML = '<i class="fas fa-play"></i> 继续';
        
        if (gameState.gameLoop) {
            clearInterval(gameState.gameLoop);
            gameState.gameLoop = null;
        }
        
        showOverlay('游戏暂停', '点击"继续"按钮恢复游戏');
    }
}

// 重置游戏
function resetGame() {
    if (gameState.gameLoop) {
        clearInterval(gameState.gameLoop);
        gameState.gameLoop = null;
    }
    
    initGame();
}

// 更新UI
function updateUI() {
    scoreElement.textContent = gameState.score;
    speedElement.textContent = Math.round(1000 / gameState.speed);
    lengthElement.textContent = gameState.snake.length;
    difficultyElement.textContent = gameState.difficultyConfig.name;
    
    // 更新最高分显示
    const highScore = HighScoreManager.getHighScore(gameState.currentDifficulty);
    highScoreElement.textContent = highScore;
}

// 更新统计显示
function updateStatsDisplay() {
    const stats = GameStatsManager.getStats();
    const averageScore = GameStatsManager.getAverageScore();
    
    totalGamesElement.textContent = stats.totalGames;
    totalScoreElement.textContent = stats.totalScore;
    averageScoreElement.textContent = averageScore;
    maxLengthElement.textContent = stats.maxLength;
    specialFoodCountElement.textContent = stats.specialFoodCount;
    totalTimeElement.textContent = `${stats.totalTime}s`;
}

// 显示覆盖层
function showOverlay(title, text) {
    overlayTitle.textContent = title;
    overlayText.innerHTML = text;
    gameOverlay.style.display = 'flex';
}

// 隐藏覆盖层
function hideOverlay() {
    gameOverlay.style.display = 'none';
}

// 键盘控制
function handleKeyDown(event) {
    if (!gameState.isRunning || gameState.isPaused) return;
    
    // 防止默认行为
    event.preventDefault();
    
    // 更新按键高亮
    updateKeyHighlight(event.key);
    
    // 根据按键设置方向
    switch (event.key.toLowerCase()) {
        case 'arrowup':
        case 'w':
            if (gameState.direction !== 'down') {
                gameState.nextDirection = 'up';
            }
            break;
        case 'arrowdown':
        case 's':
            if (gameState.direction !== 'up') {
                gameState.nextDirection = 'down';
            }
            break;
        case 'arrowleft':
        case 'a':
            if (gameState.direction !== 'right') {
                gameState.nextDirection = 'left';
            }
            break;
        case 'arrowright':
        case 'd':
            if (gameState.direction !== 'left') {
                gameState.nextDirection = 'right';
            }
            break;
    }
}

// 更新按键高亮
function updateKeyHighlight(key) {
    // 移除所有高亮
    keys.forEach(keyElement => {
        keyElement.classList.remove('active');
    });
    
    // 根据按键添加高亮
    let keyToHighlight = '';
    switch (key.toLowerCase()) {
        case 'arrowup':
            keyToHighlight = '↑';
            break;
        case 'arrowdown':
            keyToHighlight = '↓';
            break;
        case 'arrowleft':
            keyToHighlight = '←';
            break;
        case 'arrowright':
            keyToHighlight = '→';
            break;
        case 'w':
            keyToHighlight = 'W';
            break;
        case 's':
            keyToHighlight = 'S';
            break;
        case 'a':
            keyToHighlight = 'A';
            break;
        case 'd':
            keyToHighlight = 'D';
            break;
    }
    
    // 添加高亮
    if (keyToHighlight) {
        const keyElement = document.querySelector(`.key[data-key="${keyToHighlight}"]`);
        if (keyElement) {
            keyElement.classList.add('active');
            
            // 0.2秒后移除高亮
            setTimeout(() => {
                keyElement.classList.remove('active');
            }, 200);
        }
    }
}

// 事件监听
startBtn.addEventListener('click', startGame);
pauseBtn.addEventListener('click', pauseGame);
resetBtn.addEventListener('click', resetGame);
soundBtn.addEventListener('click', toggleSound);
resetHighscoreBtn.addEventListener('click', resetHighScores);
resetStatsBtn.addEventListener('click', resetGameStats);
themeToggleBtn.addEventListener('click', toggleTheme);

// 游戏结束覆盖层点击事件 - 点击后重新开始游戏
gameOverlay.addEventListener('click', function() {
    if (gameState.gameOver) {
        resetGame();
        hideOverlay();
    }
});

// 难度选择事件
difficultySelect.addEventListener('change', function() {
    const difficulty = this.value;
    gameState.currentDifficulty = difficulty;
    gameState.difficultyConfig = DIFFICULTY_CONFIG[difficulty];
    
    // 如果游戏正在运行，重新开始游戏
    if (gameState.isRunning) {
        resetGame();
    } else {
        // 更新UI显示
        updateUI();
    }
});

// 应用食物效果
function applyFoodEffect(effect) {
    switch (effect) {
        case 'doubleScore':
            // 双倍分数效果（应用分数倍增效果）
            const doubleScore = gameState.difficultyConfig.scorePerFood * gameState.scoreMultiplier;
            gameState.score += doubleScore;
            showEffectMessage('双倍分数！');
            break;
            
        case 'speedUp':
            // 加速效果
            const speedUpAmount = Math.floor(gameState.speed * 0.3);
            gameState.speed = Math.max(30, gameState.speed - speedUpAmount);
            showEffectMessage('速度提升！');
            break;
            
        case 'slowDown':
            // 减速效果
            const slowDownAmount = Math.floor(gameState.speed * 0.2);
            gameState.speed += slowDownAmount;
            showEffectMessage('速度降低！');
            break;
            
        case 'shrinkSnake':
            // 缩小蛇身效果
            if (gameState.snake.length > 3) {
                const removeCount = Math.min(3, gameState.snake.length - 3);
                gameState.snake.splice(-removeCount);
                showEffectMessage('蛇身缩小！');
            }
            break;
            
        case 'shield':
            // 护盾效果
            gameState.shieldActive = true;
            showEffectMessage('护盾激活！');
            setTimeout(() => {
                gameState.shieldActive = false;
                showEffectMessage('护盾失效！');
            }, 10000); // 10秒护盾
            break;
            
        case 'ghost':
            // 幽灵模式效果
            gameState.ghostActive = true;
            showEffectMessage('幽灵模式！');
            setTimeout(() => {
                gameState.ghostActive = false;
                showEffectMessage('幽灵模式结束！');
            }, 8000); // 8秒幽灵模式
            break;
    }
}

// 检查道具碰撞
function checkPowerUpCollision() {
    const head = gameState.snake[0];
    
    for (let i = gameState.powerUps.length - 1; i >= 0; i--) {
        const powerUp = gameState.powerUps[i];
        
        if (head.x === powerUp.x && head.y === powerUp.y) {
            // 播放吃到道具音效
            SoundManager.play('powerup');
            
            // 应用道具效果
            applyPowerUpEffect(powerUp.type);
            
            // 移除道具
            removePowerUp(powerUp.id);
            
            // 显示消息
            showEffectMessage(`${POWER_UPS[powerUp.type].name}！`);
            
            break;
        }
    }
}

// 应用道具效果
function applyPowerUpEffect(powerUpType) {
    const powerUp = POWER_UPS[powerUpType];
    
    switch (powerUpType) {
        case 'magnet':
            // 磁铁效果
            gameState.magnetActive = true;
            setTimeout(() => {
                gameState.magnetActive = false;
                showEffectMessage('磁铁效果结束！');
            }, powerUp.duration);
            break;
            
        case 'bomb':
            // 炸弹效果：清除周围的障碍物
            const head = gameState.snake[0];
            gameState.obstacles = gameState.obstacles.filter(obstacle => {
                const distance = Math.sqrt(
                    Math.pow(obstacle.x - head.x, 2) + 
                    Math.pow(obstacle.y - head.y, 2)
                );
                return distance > 2; // 保留距离大于2的障碍物
            });
            break;
            
        case 'freeze':
            // 冰冻效果
            gameState.freezeActive = true;
            const originalSpeed = gameState.speed;
            gameState.speed = 200; // 大幅降低速度
            setTimeout(() => {
                gameState.freezeActive = false;
                gameState.speed = originalSpeed;
                showEffectMessage('冰冻效果结束！');
            }, powerUp.duration);
            break;
            
        case 'portal':
            // 传送门效果
            gameState.portalActive = true;
            // 随机传送蛇头
            const gridWidth = canvas.width / CONFIG.GRID_SIZE;
            const gridHeight = canvas.height / CONFIG.GRID_SIZE;
            
            let newX, newY;
            let validPosition = false;
            let attempts = 0;
            
            while (!validPosition && attempts < 50) {
                newX = Math.floor(Math.random() * gridWidth);
                newY = Math.floor(Math.random() * gridHeight);
                
                validPosition = true;
                
                // 检查是否在障碍物上
                for (const obstacle of gameState.obstacles) {
                    if (obstacle.x === newX && obstacle.y === newY) {
                        validPosition = false;
                        break;
                    }
                }
                
                // 检查是否在蛇身上
                for (let i = 1; i < gameState.snake.length; i++) {
                    if (gameState.snake[i].x === newX && gameState.snake[i].y === newY) {
                        validPosition = false;
                        break;
                    }
                }
                
                attempts++;
            }
            
            if (validPosition) {
                gameState.snake[0].x = newX;
                gameState.snake[0].y = newY;
            }
            
            setTimeout(() => {
                gameState.portalActive = false;
                showEffectMessage('传送门效果结束！');
            }, powerUp.duration);
            break;
            
        case 'timeStop':
            // 时间停止效果
            gameState.timeStopActive = true;
            const originalGameLoop = gameState.gameLoop;
            
            // 暂停游戏循环
            if (gameState.gameLoop) {
                clearInterval(gameState.gameLoop);
                gameState.gameLoop = null;
            }
            
            setTimeout(() => {
                gameState.timeStopActive = false;
                // 恢复游戏循环
                if (!gameState.gameLoop && !gameState.gameOver) {
                    gameState.gameLoop = setInterval(() => {
                        update();
                        draw();
                    }, gameState.speed);
                }
                showEffectMessage('时间停止结束！');
            }, powerUp.duration);
            break;
            
        case 'clone':
            // 分身效果
            gameState.cloneActive = true;
            // 创建分身蛇头（避免与主蛇重叠）
            let cloneHeadX = gameState.snake[0].x;
            let cloneHeadY = gameState.snake[0].y;
            
            // 尝试找到一个不重叠的位置
            const directions = [
                { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }
            ];
            
            for (const dir of directions) {
                const newX = gameState.snake[0].x + dir.x;
                const newY = gameState.snake[0].y + dir.y;
                
                // 检查是否与主蛇重叠
                let overlap = false;
                for (const segment of gameState.snake) {
                    if (segment.x === newX && segment.y === newY) {
                        overlap = true;
                        break;
                    }
                }
                
                if (!overlap) {
                    cloneHeadX = newX;
                    cloneHeadY = newY;
                    break;
                }
            }
            
            const cloneHead = {
                x: cloneHeadX,
                y: cloneHeadY,
                direction: gameState.direction
            };
            gameState.cloneSnake = [cloneHead];
            
            // 分身蛇移动定时器
            gameState.cloneTimer = setInterval(() => {
                if (gameState.cloneActive && gameState.cloneSnake) {
                    moveCloneSnake();
                }
            }, gameState.speed);
            
            setTimeout(() => {
                gameState.cloneActive = false;
                gameState.cloneSnake = null;
                if (gameState.cloneTimer) {
                    clearInterval(gameState.cloneTimer);
                    gameState.cloneTimer = null;
                }
                showEffectMessage('分身效果结束！');
            }, powerUp.duration);
            break;
            
        case 'scoreMultiplier':
            // 分数倍增效果
            gameState.scoreMultiplierActive = true;
            gameState.scoreMultiplier = 2; // 分数翻倍
            
            setTimeout(() => {
                gameState.scoreMultiplierActive = false;
                gameState.scoreMultiplier = 1;
                showEffectMessage('分数倍增结束！');
            }, powerUp.duration);
            break;
            
        case 'invincible':
            // 无敌效果
            gameState.invincibleActive = true;
            
            setTimeout(() => {
                gameState.invincibleActive = false;
                showEffectMessage('无敌效果结束！');
            }, powerUp.duration);
            break;
    }
}

// 应用磁铁效果
function applyMagnetEffect() {
    const head = gameState.snake[0];
    const magnetRange = 5; // 磁铁范围
    
    // 检查食物是否在磁铁范围内
    const foodDistance = Math.sqrt(
        Math.pow(gameState.food.x - head.x, 2) + 
        Math.pow(gameState.food.y - head.y, 2)
    );
    
    if (foodDistance <= magnetRange && foodDistance > 0) {
        // 将食物向蛇头方向移动
        const dx = gameState.food.x - head.x;
        const dy = gameState.food.y - head.y;
        
        if (Math.abs(dx) > Math.abs(dy)) {
            gameState.food.x -= Math.sign(dx);
        } else {
            gameState.food.y -= Math.sign(dy);
        }
    }
}

// 显示效果消息
function showEffectMessage(message) {
    const effectDiv = document.createElement('div');
    effectDiv.className = 'effect-message';
    effectDiv.textContent = message;
    effectDiv.style.cssText = `
        position: absolute;
        top: ${gameState.food.y * CONFIG.GRID_SIZE}px;
        left: ${gameState.food.x * CONFIG.GRID_SIZE}px;
        color: #ffd700;
        font-weight: bold;
        font-size: 16px;
        text-shadow: 0 0 5px #000;
        animation: floatUp 1s ease-out forwards;
        pointer-events: none;
        z-index: 100;
    `;
    
    document.querySelector('.game-area').appendChild(effectDiv);
    
    // 添加粒子效果
    createParticleEffect(gameState.food.x * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2, 
                        gameState.food.y * CONFIG.GRID_SIZE + CONFIG.GRID_SIZE / 2);
    
    // 动画结束后移除元素
    setTimeout(() => {
        effectDiv.remove();
    }, 1000);
}

// 创建粒子效果
function createParticleEffect(x, y) {
    const particleCount = 20;
    const colors = ['#ffd700', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4'];
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        const color = colors[Math.floor(Math.random() * colors.length)];
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 3 + 1;
        const size = Math.random() * 4 + 2;
        const duration = Math.random() * 0.5 + 0.5;
        
        particle.style.cssText = `
            position: absolute;
            top: ${y}px;
            left: ${x}px;
            width: ${size}px;
            height: ${size}px;
            background: ${color};
            border-radius: 50%;
            pointer-events: none;
            z-index: 99;
            animation: particleExplode ${duration}s ease-out forwards;
        `;
        
        // 设置动画关键帧
        const style = document.createElement('style');
        style.textContent = `
            @keyframes particleExplode {
                0% {
                    opacity: 1;
                    transform: translate(0, 0) scale(1);
                }
                100% {
                    opacity: 0;
                    transform: translate(${Math.cos(angle) * speed * 50}px, ${Math.sin(angle) * speed * 50}px) scale(0);
                }
            }
        `;
        document.head.appendChild(style);
        
        document.querySelector('.game-area').appendChild(particle);
        
        // 动画结束后移除粒子
        setTimeout(() => {
            particle.remove();
            style.remove();
        }, duration * 1000);
    }
}

// 重置高分记录
function resetHighScores() {
    if (confirm('确定要重置所有难度的高分记录吗？此操作不可撤销！')) {
        const success = HighScoreManager.resetHighScores();
        if (success) {
            alert('高分记录已重置！');
            updateUI();
        } else {
            alert('重置失败，请重试！');
        }
    }
}

// 重置游戏统计
function resetGameStats() {
    if (confirm('确定要重置所有游戏统计吗？此操作不可撤销！')) {
        const success = GameStatsManager.resetStats();
        if (success) {
            alert('游戏统计已重置！');
            updateStatsDisplay();
        } else {
            alert('重置失败，请重试！');
        }
    }
}

// 切换主题
function toggleTheme() {
    const themeKeys = Object.keys(THEMES);
    const currentIndex = themeKeys.indexOf(gameState.currentTheme);
    const nextIndex = (currentIndex + 1) % themeKeys.length;
    const nextTheme = themeKeys[nextIndex];
    
    gameState.currentTheme = nextTheme;
    applyTheme(nextTheme);
    
    // 保存主题设置
    try {
        localStorage.setItem('snake_game_theme', nextTheme);
    } catch (e) {
        console.warn('保存主题设置失败:', e);
    }
}

// 应用主题
function applyTheme(themeName) {
    const theme = THEMES[themeName];
    
    // 更新CSS变量
    document.documentElement.style.setProperty('--theme-bg', theme.background);
    document.documentElement.style.setProperty('--theme-secondary', theme.secondary);
    document.documentElement.style.setProperty('--theme-snake-head', theme.snakeHead);
    document.documentElement.style.setProperty('--theme-snake-body', theme.snakeBody);
    document.documentElement.style.setProperty('--theme-food', theme.food);
    document.documentElement.style.setProperty('--theme-text', theme.text);
    document.documentElement.style.setProperty('--theme-accent', theme.accent);
    
    // 更新按钮文本
    themeToggleBtn.innerHTML = `<i class="fas fa-palette"></i> ${theme.name}`;
    
    // 重新绘制游戏
    draw();
}

// 加载主题设置
function loadThemeSettings() {
    try {
        const savedTheme = localStorage.getItem('snake_game_theme');
        if (savedTheme && THEMES[savedTheme]) {
            gameState.currentTheme = savedTheme;
            applyTheme(savedTheme);
        }
    } catch (e) {
        console.warn('加载主题设置失败:', e);
    }
}

document.addEventListener('keydown', handleKeyDown);

// 触摸控制（移动设备）
let touchStartX = 0;
let touchStartY = 0;
let lastTouchTime = 0;
const TOUCH_THRESHOLD = 30; // 滑动阈值
const DOUBLE_TAP_DELAY = 300; // 双击延迟

canvas.addEventListener('touchstart', (event) => {
    event.preventDefault();
    touchStartX = event.touches[0].clientX;
    touchStartY = event.touches[0].clientY;
    
    // 检测双击
    const currentTime = Date.now();
    if (currentTime - lastTouchTime < DOUBLE_TAP_DELAY) {
        // 双击事件 - 暂停/继续游戏
        if (gameState.isRunning) {
            pauseGame();
        } else if (!gameState.gameOver) {
            startGame();
        }
    }
    lastTouchTime = currentTime;
});

canvas.addEventListener('touchmove', (event) => {
    event.preventDefault();
});

canvas.addEventListener('touchend', (event) => {
    event.preventDefault();
    
    if (!gameState.isRunning || gameState.isPaused) return;
    
    const touchEndX = event.changedTouches[0].clientX;
    const touchEndY = event.changedTouches[0].clientY;
    
    const dx = touchEndX - touchStartX;
    const dy = touchEndY - touchStartY;
    
    // 检查是否达到滑动阈值
    if (Math.abs(dx) < TOUCH_THRESHOLD && Math.abs(dy) < TOUCH_THRESHOLD) {
        return; // 滑动距离太小，忽略
    }
    
    // 确定滑动方向
    if (Math.abs(dx) > Math.abs(dy)) {
        // 水平滑动
        if (dx > 0 && gameState.direction !== 'left') {
            gameState.nextDirection = 'right';
            showTouchFeedback('right');
        } else if (dx < 0 && gameState.direction !== 'right') {
            gameState.nextDirection = 'left';
            showTouchFeedback('left');
        }
    } else {
        // 垂直滑动
        if (dy > 0 && gameState.direction !== 'up') {
            gameState.nextDirection = 'down';
            showTouchFeedback('down');
        } else if (dy < 0 && gameState.direction !== 'down') {
            gameState.nextDirection = 'up';
            showTouchFeedback('up');
        }
    }
});

// 显示触摸反馈
function showTouchFeedback(direction) {
    const canvasRect = canvas.getBoundingClientRect();
    const centerX = canvasRect.width / 2;
    const centerY = canvasRect.height / 2;
    
    const feedbackDiv = document.createElement('div');
    feedbackDiv.className = 'touch-feedback';
    
    let arrow = '';
    switch (direction) {
        case 'up': arrow = '↑'; break;
        case 'down': arrow = '↓'; break;
        case 'left': arrow = '←'; break;
        case 'right': arrow = '→'; break;
    }
    
    feedbackDiv.textContent = arrow;
    feedbackDiv.style.cssText = `
        position: absolute;
        top: ${canvasRect.top + centerY - 25}px;
        left: ${canvasRect.left + centerX - 25}px;
        width: 50px;
        height: 50px;
        background: rgba(0, 219, 222, 0.7);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        font-weight: bold;
        color: white;
        animation: touchFeedback 0.5s ease-out forwards;
        pointer-events: none;
        z-index: 50;
    `;
    
    document.body.appendChild(feedbackDiv);
    
    // 动画结束后移除元素
    setTimeout(() => {
        feedbackDiv.remove();
    }, 500);
}

// 添加触摸控制按钮（移动设备）
function addTouchControls() {
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
        const touchControls = document.createElement('div');
        touchControls.className = 'touch-controls';
        touchControls.innerHTML = `
            <div class="touch-controls-grid">
                <div class="touch-control up" data-direction="up">↑</div>
                <div class="touch-control left" data-direction="left">←</div>
                <div class="touch-control down" data-direction="down">↓</div>
                <div class="touch-control right" data-direction="right">→</div>
            </div>
        `;
        
        document.querySelector('.game-area').appendChild(touchControls);
        
        // 添加触摸控制事件
        const touchButtons = touchControls.querySelectorAll('.touch-control');
        touchButtons.forEach(button => {
            button.addEventListener('touchstart', (event) => {
                event.preventDefault();
                if (!gameState.isRunning || gameState.isPaused) return;
                
                const direction = button.dataset.direction;
                switch (direction) {
                    case 'up':
                        if (gameState.direction !== 'down') {
                            gameState.nextDirection = 'up';
                            button.classList.add('active');
                        }
                        break;
                    case 'down':
                        if (gameState.direction !== 'up') {
                            gameState.nextDirection = 'down';
                            button.classList.add('active');
                        }
                        break;
                    case 'left':
                        if (gameState.direction !== 'right') {
                            gameState.nextDirection = 'left';
                            button.classList.add('active');
                        }
                        break;
                    case 'right':
                        if (gameState.direction !== 'left') {
                            gameState.nextDirection = 'right';
                            button.classList.add('active');
                        }
                        break;
                }
                
                // 移除激活状态
                setTimeout(() => {
                    button.classList.remove('active');
                }, 200);
            });
        });
    }
}

// 加载音效设置
loadSoundSettings();

// 加载主题设置
loadThemeSettings();

// 添加触摸控制按钮
addTouchControls();

// 初始化游戏
setTimeout(() => {
    initGame();
    draw(); // 确保初始绘制
}, 100);

// 初始化统计显示
updateStatsDisplay();