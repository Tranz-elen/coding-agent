// 测试死亡原因显示
function testDeathReason() {
    const collisionTypes = ['wall_left', 'wall_right', 'wall_top', 'wall_bottom', 'self', 'clone', 'obstacle', 'unknown'];
    
    console.log('测试各种死亡原因:');
    collisionTypes.forEach(type => {
        let deathReason = '';
        switch (type) {
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
        
        console.log(`碰撞类型: ${type} -> 死亡原因: ${deathReason}`);
    });
    
    // 测试完整的消息生成
    const gameState = {
        score: 150,
        snake: { length: 12 },
        gameTime: 45,
        specialFoodEaten: 3
    };
    const highScore = 200;
    const isNewRecord = false;
    
    let deathReason = '撞到了分身蛇';
    let message = `死亡原因: ${deathReason}<br>最终得分: ${gameState.score}<br>蛇的长度: ${gameState.snake.length}<br>游戏时间: ${gameState.gameTime}秒<br>特殊食物: ${gameState.specialFoodEaten}个<br>当前难度最高分: ${highScore}`;
    
    if (isNewRecord) {
        message += `<br><span style="color: #ffd700; font-weight: bold;">🎉 恭喜！创造了新的最高分记录！</span>`;
    }
    
    console.log('\n生成的死亡消息:');
    console.log(message);
}

testDeathReason();