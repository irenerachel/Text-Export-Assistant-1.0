// 后台脚本 - 处理插件的后台逻辑

// 插件安装时的初始化
chrome.runtime.onInstalled.addListener(() => {
    console.log('文本导出助手插件已安装');
});

// 监听来自content script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'copyDetected') {
        // 可以在这里添加复制检测后的逻辑
        console.log('检测到复制操作:', request.text);
        
        // 可选：存储最近的复制内容
        chrome.storage.local.set({
            lastCopiedText: request.text,
            lastCopyTime: Date.now()
        });
        
        sendResponse({ success: true });
    }

    // 新增：监听来自content script的打开弹窗请求
    if (request.action === 'openExportDialog') {
        chrome.action.openPopup();
        sendResponse({ success: true });
    }

    // 保持通道开放以进行异步响应
    return true;
});

// 监听快捷键或其他事件
chrome.commands?.onCommand?.addListener((command) => {
    if (command === 'open-export-dialog') {
        // 打开导出对话框
        chrome.action.openPopup();
    }
});

// 处理右键菜单（可选功能）
chrome.contextMenus?.create({
    id: 'exportText',
    title: '导出选中文本',
    contexts: ['selection']
});

chrome.contextMenus?.onClicked?.addListener((info, tab) => {
    if (info.menuItemId === 'exportText') {
        // 发送消息到content script处理选中的文本
        chrome.tabs.sendMessage(tab.id, {
            action: 'exportSelectedText',
            text: info.selectionText
        });
    }
});