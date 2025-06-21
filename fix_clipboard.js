// 文本导出助手 - 剪贴板修复脚本
// 在浏览器控制台中运行此脚本来测试和修复剪贴板问题

(function() {
    'use strict';
    
    console.log('🔧 文本导出助手 - 剪贴板修复脚本已启动');
    
    // 测试剪贴板API
    async function testClipboardAPI() {
        console.log('📋 测试剪贴板API...');
        
        try {
            if (navigator.clipboard && navigator.clipboard.readText) {
                console.log('✅ 现代剪贴板API可用');
                
                // 尝试读取剪贴板
                const text = await navigator.clipboard.readText();
                if (text && text.trim()) {
                    console.log('✅ 成功读取剪贴板内容:', text.substring(0, 50) + '...');
                    return { success: true, method: 'modern', text: text };
                } else {
                    console.log('⚠️ 剪贴板为空或只包含空白字符');
                    return { success: false, method: 'modern', error: '剪贴板为空' };
                }
            } else {
                console.log('❌ 现代剪贴板API不可用');
                return { success: false, method: 'modern', error: 'API不可用' };
            }
        } catch (err) {
            console.log('❌ 现代剪贴板API错误:', err);
            return { success: false, method: 'modern', error: err.message };
        }
    }
    
    // 测试execCommand方法
    function testExecCommand() {
        console.log('📋 测试execCommand方法...');
        
        try {
            const textArea = document.createElement('textarea');
            textArea.style.position = 'fixed';
            textArea.style.left = '-9999px';
            textArea.style.top = '-9999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            if (document.execCommand('paste')) {
                const text = textArea.value;
                document.body.removeChild(textArea);
                
                if (text && text.trim()) {
                    console.log('✅ execCommand成功读取剪贴板:', text.substring(0, 50) + '...');
                    return { success: true, method: 'execCommand', text: text };
                } else {
                    console.log('⚠️ execCommand读取的剪贴板为空');
                    return { success: false, method: 'execCommand', error: '剪贴板为空' };
                }
            } else {
                document.body.removeChild(textArea);
                console.log('❌ execCommand失败');
                return { success: false, method: 'execCommand', error: 'execCommand返回false' };
            }
        } catch (err) {
            console.log('❌ execCommand错误:', err);
            return { success: false, method: 'execCommand', error: err.message };
        }
    }
    
    // 测试Chrome扩展存储
    async function testChromeStorage() {
        console.log('📋 测试Chrome扩展存储...');
        
        try {
            if (typeof chrome !== 'undefined' && chrome.storage) {
                const result = await chrome.storage.local.get(['lastCopiedText', 'lastCopyTime']);
                if (result.lastCopiedText) {
                    console.log('✅ 从存储读取到文本:', result.lastCopiedText.substring(0, 50) + '...');
                    return { success: true, method: 'storage', text: result.lastCopiedText };
                } else {
                    console.log('⚠️ 存储中没有文本');
                    return { success: false, method: 'storage', error: '存储为空' };
                }
            } else {
                console.log('❌ Chrome扩展API不可用');
                return { success: false, method: 'storage', error: 'Chrome API不可用' };
            }
        } catch (err) {
            console.log('❌ 存储读取错误:', err);
            return { success: false, method: 'storage', error: err.message };
        }
    }
    
    // 测试选中文本
    function testSelectedText() {
        console.log('📋 测试选中文本...');
        
        try {
            const selection = window.getSelection();
            const selectedText = selection.toString().trim();
            
            if (selectedText) {
                console.log('✅ 检测到选中文本:', selectedText.substring(0, 50) + '...');
                return { success: true, method: 'selection', text: selectedText };
            } else {
                console.log('⚠️ 没有选中的文本');
                return { success: false, method: 'selection', error: '没有选中文本' };
            }
        } catch (err) {
            console.log('❌ 选中文本检测错误:', err);
            return { success: false, method: 'selection', error: err.message };
        }
    }
    
    // 运行所有测试
    async function runAllTests() {
        console.log('🚀 开始运行所有剪贴板测试...\n');
        
        const results = {
            clipboardAPI: await testClipboardAPI(),
            execCommand: testExecCommand(),
            storage: await testChromeStorage(),
            selection: testSelectedText()
        };
        
        console.log('\n📊 测试结果汇总:');
        console.log('================');
        
        let hasSuccess = false;
        for (const [method, result] of Object.entries(results)) {
            const status = result.success ? '✅' : '❌';
            console.log(`${status} ${method}: ${result.success ? '成功' : result.error}`);
            if (result.success) {
                hasSuccess = true;
                console.log(`   内容: ${result.text.substring(0, 30)}...`);
            }
        }
        
        console.log('\n🎯 诊断结果:');
        if (hasSuccess) {
            console.log('✅ 至少有一种方法可以获取文本');
            console.log('💡 建议: 插件应该能够正常工作');
        } else {
            console.log('❌ 所有方法都失败了');
            console.log('💡 建议: 请检查浏览器设置和权限');
        }
        
        return results;
    }
    
    // 修复建议
    function provideFixSuggestions(results) {
        console.log('\n🔧 修复建议:');
        console.log('============');
        
        if (!results.clipboardAPI.success) {
            console.log('1. 现代剪贴板API问题:');
            console.log('   - 确保在HTTPS网站或localhost上测试');
            console.log('   - 检查浏览器是否支持剪贴板API');
            console.log('   - 尝试在隐私模式下测试');
        }
        
        if (!results.execCommand.success) {
            console.log('2. execCommand问题:');
            console.log('   - 某些网站可能阻止execCommand');
            console.log('   - 尝试在简单的HTML页面上测试');
        }
        
        if (!results.storage.success) {
            console.log('3. Chrome扩展存储问题:');
            console.log('   - 确保插件已正确安装');
            console.log('   - 检查插件权限设置');
            console.log('   - 尝试重新加载插件');
        }
        
        if (!results.selection.success) {
            console.log('4. 选中文本问题:');
            console.log('   - 请先选择一些文本再运行测试');
            console.log('   - 某些网站可能阻止文本选择');
        }
        
        console.log('\n📋 通用解决方案:');
        console.log('- 重新安装插件');
        console.log('- 清除浏览器缓存');
        console.log('- 检查插件权限');
        console.log('- 使用手动输入功能');
    }
    
    // 创建测试按钮
    function createTestUI() {
        const testDiv = document.createElement('div');
        testDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #333;
            color: white;
            padding: 15px;
            border-radius: 8px;
            z-index: 10000;
            font-family: Arial, sans-serif;
            font-size: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        
        testDiv.innerHTML = `
            <div style="margin-bottom: 10px; font-weight: bold;">🔧 文本导出助手测试</div>
            <button onclick="window.runClipboardTests()" style="
                background: #4CAF50;
                color: white;
                border: none;
                padding: 8px 12px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 11px;
                margin-right: 5px;
            ">运行测试</button>
            <button onclick="document.body.removeChild(this.parentElement)" style="
                background: #f44336;
                color: white;
                border: none;
                padding: 8px 12px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 11px;
            ">关闭</button>
        `;
        
        document.body.appendChild(testDiv);
    }
    
    // 主函数
    async function main() {
        console.log('🎯 文本导出助手诊断工具');
        console.log('========================\n');
        
        // 创建测试UI
        createTestUI();
        
        // 将测试函数暴露到全局
        window.runClipboardTests = async function() {
            const results = await runAllTests();
            provideFixSuggestions(results);
        };
        
        console.log('💡 提示: 点击右上角的"运行测试"按钮开始诊断');
        console.log('💡 或者直接调用: runClipboardTests()');
    }
    
    // 启动
    main();
    
})(); 