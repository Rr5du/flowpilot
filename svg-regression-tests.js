/**
 * SVG解析回归测试套件
 * 
 * 使用方法：
 * 1. 打开浏览器访问 http://localhost:3000
 * 2. 打开控制台（F12）
 * 3. 复制粘贴此文件内容并运行
 * 4. 查看测试结果
 */

(async function runSVGRegressionTests() {
    console.log('🧪 开始SVG解析回归测试...\n');
    
    let passedTests = 0;
    let failedTests = 0;
    const failures = [];

    function assert(condition, testName, message) {
        if (condition) {
            console.log(`✅ ${testName}`);
            passedTests++;
        } else {
            console.error(`❌ ${testName}: ${message}`);
            failedTests++;
            failures.push({ testName, message });
        }
    }

    // 获取SVG Editor Context（需要根据实际实现调整）
    function getSVGContext() {
        // 尝试从React DevTools获取
        // 或者直接访问全局变量（如果有的话）
        return window.__SVG_EDITOR_CONTEXT__ || null;
    }

    // ===== 测试 1: 简单SVG（无group）=====
    console.log('\n📝 测试 1: 简单SVG（无group）');
    const test1SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
        <rect x="0" y="0" width="50" height="50" fill="red"/>
        <circle cx="75" cy="75" r="20" fill="blue"/>
        <text x="50" y="50">Test</text>
    </svg>`;
    
    // 注意：这里需要调用实际的loadSvgMarkup函数
    // 如果没有全局函数，需要通过React Context调用
    console.log('提示：请手动导入此SVG并检查：');
    console.log('- 应该有3个元素（rect, circle, text）');
    console.log('- rect应该是红色');
    console.log('- circle应该是蓝色');
    console.log('SVG内容：', test1SVG);

    // ===== 测试 2: 带单层group的SVG =====
    console.log('\n📝 测试 2: 带单层group的SVG');
    const test2SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
        <g fill="green">
            <rect x="0" y="0" width="50" height="50"/>
            <circle cx="75" cy="75" r="20"/>
        </g>
    </svg>`;
    
    console.log('提示：请手动导入此SVG并检查：');
    console.log('- 应该有2个元素（rect, circle）');
    console.log('- 两个元素都应该是绿色（继承自group）');
    console.log('- 不应该有group元素本身');
    console.log('SVG内容：', test2SVG);

    // ===== 测试 3: fill="none" 保留 =====
    console.log('\n📝 测试 3: fill="none" 应该被保留');
    const test3SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
        <g fill="red">
            <rect x="0" y="0" width="50" height="50" fill="none" stroke="black" stroke-width="2"/>
        </g>
    </svg>`;
    
    console.log('提示：请手动导入此SVG并检查：');
    console.log('- rect应该没有填充（透明）');
    console.log('- rect应该有黑色边框');
    console.log('- fill="none" 不应该被group的fill="red"覆盖');
    console.log('SVG内容：', test3SVG);

    // ===== 测试 4: 嵌套group与transform =====
    console.log('\n📝 测试 4: 嵌套group的transform合并');
    const test4SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
        <g transform="translate(10, 20)">
            <g transform="scale(2)">
                <rect x="0" y="0" width="10" height="10" fill="purple"/>
            </g>
        </g>
    </svg>`;
    
    console.log('提示：请手动导入此SVG并检查：');
    console.log('- 应该有1个rect元素');
    console.log('- rect应该被放大2倍');
    console.log('- rect应该在(10, 20)位置（translate）');
    console.log('SVG内容：', test4SVG);

    // ===== 测试 5: Gradient应用 =====
    console.log('\n📝 测试 5: Gradient正确应用');
    const test5SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100">
        <defs>
            <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style="stop-color:rgb(255,255,0);stop-opacity:1" />
                <stop offset="100%" style="stop-color:rgb(255,0,0);stop-opacity:1" />
            </linearGradient>
        </defs>
        <rect x="10" y="10" width="180" height="80" fill="url(#grad1)"/>
    </svg>`;
    
    console.log('提示：请手动导入此SVG并检查：');
    console.log('- rect应该显示黄色到红色的渐变');
    console.log('- 不应该是纯色');
    console.log('SVG内容：', test5SVG);

    // ===== 测试 6: 图1的完整SVG =====
    console.log('\n📝 测试 6: 图1的完整三层架构SVG');
    const test6SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
        <defs>
            <linearGradient id="headerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style="stop-color:#4A90E2;stop-opacity:1"/>
                <stop offset="100%" style="stop-color:#5BA0F2;stop-opacity:1"/>
            </linearGradient>
        </defs>
        <rect x="24" y="24" width="752" height="40" rx="8" fill="url(#headerGrad)"/>
        <text x="400" y="48" font-size="18" font-weight="bold" text-anchor="middle" fill="white">三层架构组件图</text>
    </svg>`;
    
    console.log('提示：请手动导入此SVG并检查：');
    console.log('- Header应该显示蓝色渐变（不是纯色）');
    console.log('- 标题文字应该居中显示');
    console.log('SVG内容已简化，完整版见原始文件');

    // ===== 测试 7: 用户手绘SVG =====
    console.log('\n📝 测试 7: 用户手绘功能');
    console.log('手动测试步骤：');
    console.log('1. 选择矩形工具，绘制一个矩形');
    console.log('2. 选择圆形工具，绘制一个圆形');
    console.log('3. 选择线条工具，绘制一条线');
    console.log('4. 选择文本工具，添加文本');
    console.log('5. 点击"导出 SVG"按钮');
    console.log('6. 点击"清空"按钮');
    console.log('7. 重新导入刚才导出的SVG');
    console.log('8. 验证所有元素都正确显示');

    // ===== 测试 8: 元素编辑功能 =====
    console.log('\n📝 测试 8: 元素编辑功能');
    console.log('手动测试步骤：');
    console.log('1. 导入任意SVG');
    console.log('2. 选中一个元素');
    console.log('3. 拖动移动元素');
    console.log('4. 调整大小');
    console.log('5. 修改颜色');
    console.log('6. 复制元素（Cmd/Ctrl+D）');
    console.log('7. 删除元素（Backspace）');
    console.log('8. 撤销（Cmd/Ctrl+Z）');
    console.log('9. 重做（Cmd/Ctrl+Shift+Z）');
    console.log('10. 验证所有操作正常工作');

    // ===== 输出测试总结 =====
    console.log('\n' + '='.repeat(50));
    console.log('📊 测试结果总结');
    console.log('='.repeat(50));
    console.log(`✅ 通过: ${passedTests}`);
    console.log(`❌ 失败: ${failedTests}`);
    
    if (failures.length > 0) {
        console.log('\n失败的测试：');
        failures.forEach(({ testName, message }) => {
            console.log(`  - ${testName}: ${message}`);
        });
    }

    console.log('\n💡 提示：');
    console.log('由于需要与React组件交互，大部分测试需要手动执行。');
    console.log('请按照上面的提示，将测试SVG导入编辑器并验证结果。');
    console.log('\n建议的测试顺序：');
    console.log('1. 测试1（最简单）→ 测试2（单层group）→ 测试3（fill=none）');
    console.log('2. 测试4（嵌套group）→ 测试5（gradient）');
    console.log('3. 测试6（完整SVG）→ 测试7（手绘）→ 测试8（编辑）');

    return {
        passed: passedTests,
        failed: failedTests,
        failures
    };
})();

/**
 * 辅助函数：快速导入测试SVG
 * 
 * 使用方法：
 * testImport(1) // 导入测试1的SVG
 */
window.testImport = function(testNumber) {
    const tests = {
        1: `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
            <rect x="0" y="0" width="50" height="50" fill="red"/>
            <circle cx="75" cy="75" r="20" fill="blue"/>
            <text x="50" y="50">Test</text>
        </svg>`,
        
        2: `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
            <g fill="green">
                <rect x="0" y="0" width="50" height="50"/>
                <circle cx="75" cy="75" r="20"/>
            </g>
        </svg>`,
        
        3: `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
            <g fill="red">
                <rect x="0" y="0" width="50" height="50" fill="none" stroke="black" stroke-width="2"/>
            </g>
        </svg>`,
        
        4: `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
            <g transform="translate(10, 20)">
                <g transform="scale(2)">
                    <rect x="0" y="0" width="10" height="10" fill="purple"/>
                </g>
            </g>
        </svg>`,
        
        5: `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100">
            <defs>
                <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style="stop-color:rgb(255,255,0);stop-opacity:1" />
                    <stop offset="100%" style="stop-color:rgb(255,0,0);stop-opacity:1" />
                </linearGradient>
            </defs>
            <rect x="10" y="10" width="180" height="80" fill="url(#grad1)"/>
        </svg>`
    };

    const svg = tests[testNumber];
    if (!svg) {
        console.error(`测试 ${testNumber} 不存在`);
        return;
    }

    console.log(`导入测试 ${testNumber} 的SVG...`);
    console.log('请将以下SVG复制到剪贴板，然后使用"导入 SVG"功能：');
    console.log(svg);
    
    // 尝试复制到剪贴板
    navigator.clipboard.writeText(svg).then(() => {
        console.log('✅ SVG已复制到剪贴板！');
        console.log('现在点击"导入 SVG"按钮并粘贴即可。');
    }).catch(err => {
        console.warn('无法自动复制到剪贴板，请手动复制上面的SVG内容。');
    });
};

console.log('\n💡 使用 testImport(数字) 快速导入测试SVG');
console.log('例如: testImport(1) 导入测试1');
