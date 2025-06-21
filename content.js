// 内容脚本 - 在网页中运行，监听复制事件

(function() {
    'use strict';
    
    let lastCopiedText = '';
    let copyTimeout = null;
    
    // 监听复制事件
    document.addEventListener('copy', function(e) {
        // 防止频繁触发
        if (copyTimeout) {
            clearTimeout(copyTimeout);
        }
        
        copyTimeout = setTimeout(() => {
            // 获取复制的文本
            const selection = window.getSelection();
            const copiedText = selection.toString().trim();
            
            if (copiedText && copiedText !== lastCopiedText) {
                lastCopiedText = copiedText;
                
                // 存储到本地，供插件使用
                chrome.storage.local.set({
                    lastCopiedText: copiedText,
                    lastCopyTime: Date.now()
                });
                
                // 发送消息到后台脚本
                chrome.runtime.sendMessage({
                    action: 'copyDetected',
                    text: copiedText,
                    url: window.location.href,
                    timestamp: Date.now()
                }).catch(err => {
                    console.log('发送消息失败:', err);
                });
                
                // 可选：显示简单的通知提示
                showCopyNotification(copiedText);
            }
        }, 100);
    });
    
    // 监听Ctrl+C键盘事件作为备用
    document.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
            setTimeout(() => {
                const selection = window.getSelection();
                const selectedText = selection.toString().trim();
                if (selectedText) {
                    chrome.storage.local.set({
                        lastCopiedText: selectedText,
                        lastCopyTime: Date.now()
                    });
                }
            }, 50);
        }
        
        // Ctrl+Shift+E 或 Cmd+Shift+E 快速打开导出界面
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'E') {
            e.preventDefault();
            chrome.runtime.sendMessage({
                action: 'openExportDialog'
            });
        }
    });
    
    // 监听来自后台脚本的消息
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log('收到消息:', request);
        
        if (request.action === 'exportSelectedText') {
            const selectedText = window.getSelection().toString().trim();
            if (selectedText) {
                lastCopiedText = selectedText;
                // 存储选中的文本
                chrome.storage.local.set({
                    lastCopiedText: selectedText,
                    lastCopyTime: Date.now()
                });
                sendResponse({ success: true, text: selectedText });
            } else {
                sendResponse({ success: false, error: '没有选中的文本' });
            }
        }
        
        // 新增：获取当前选中的文本
        if (request.action === 'getSelectedText') {
            const selectedText = window.getSelection().toString().trim();
            if (selectedText) {
                console.log('返回选中的文本:', selectedText.substring(0, 50) + '...');
                sendResponse({ success: true, text: selectedText });
            } else {
                console.log('没有选中的文本');
                sendResponse({ success: false, error: '没有选中的文本' });
            }
            return true; // 保持消息通道开放
        }
        
        // 新增：获取最后复制的文本
        if (request.action === 'getLastCopiedText') {
            if (lastCopiedText) {
                console.log('返回最后复制的文本:', lastCopiedText.substring(0, 50) + '...');
                sendResponse({ success: true, text: lastCopiedText });
            } else {
                console.log('没有最后复制的文本');
                sendResponse({ success: false, error: '没有最后复制的文本' });
            }
            return true; // 保持消息通道开放
        }
    });
    
    // 显示复制通知（可选功能）
    function showCopyNotification(text) {
        // 创建一个简单的通知元素
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            max-width: 300px;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
            cursor: pointer;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.2);
        `;
        
        const textPreview = text.length > 50 ? text.substring(0, 50) + '...' : text;
        notification.innerHTML = `
            <div style="font-weight: 600; margin-bottom: 4px;">📋 文本已复制并保存</div>
            <div style="font-size: 12px; opacity: 0.9;">${textPreview}</div>
            <div style="font-size: 11px; opacity: 0.7; margin-top: 4px;">点击打开导出选项</div>
        `;
        
        // 点击通知打开插件弹窗
        notification.addEventListener('click', () => {
            chrome.runtime.sendMessage({ action: 'openExportDialog' });
            document.body.removeChild(notification);
        });
        
        document.body.appendChild(notification);
        
        // 显示动画
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // 自动隐藏
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 4000);
    }
    
    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
    
    function initialize() {
        console.log('文本导出助手内容脚本已加载');
        
        // 尝试从存储中恢复最后复制的文本
        chrome.storage.local.get(['lastCopiedText'], function(result) {
            if (result.lastCopiedText) {
                lastCopiedText = result.lastCopiedText;
                console.log('从存储恢复最后复制的文本');
            }
        });
    }
})();