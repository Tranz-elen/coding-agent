// test.js 文件
console.log('Hello, World!');

// 示例函数
function add(a, b) {
    return a + b;
}

// 测试函数
console.log('1 + 2 =', add(1, 2));

// 更多示例代码
const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.map(n => n * 2);
console.log('Doubled numbers:', doubled);

// 异步示例
async function fetchData() {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve('Data fetched!');
        }, 1000);
    });
}

// 主函数
async function main() {
    console.log('Starting...');
    const result = await fetchData();
    console.log(result);
    console.log('Done!');
}

// 运行主函数
main().catch(console.error);