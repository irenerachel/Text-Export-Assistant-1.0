let clipboardText = '';
let clipboardContentType = 'text'; // 'text' or 'image'
let clipboardImageData = {
    blob: null,
    dataUrl: ''
};

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', async function() {
    // 获取所有需要的元素
    const mainContent = document.getElementById('mainContent');
    const emptyState = document.getElementById('emptyState');
    const textDisplay = document.getElementById('textDisplay');
    const imagePreviewContainer = document.getElementById('imagePreviewContainer');
    const loadingState = document.getElementById('loadingState');
    
    // 立即初始化剪贴板
    await initializeClipboard();

    // 为主要内容区域添加点击事件，以便在内容显示后切换到手动输入
    mainContent.addEventListener('click', function() {
        // 只有当剪贴板有真实内容时，才允许切换到编辑模式
        if (clipboardText && clipboardText.trim()) {
            if (textDisplay.style.display !== 'none' || imagePreviewContainer.style.display !== 'none') {
                showInputArea();
            }
        }
    });
    
    // 监听文本输入变化
    document.getElementById('textInput').addEventListener('input', function() {
        if (this.value.trim()) {
            updateClipboardDisplay(this.value.trim());
            updateButtonStates('text');
        }
    });
    
    // 监听粘贴事件
    document.getElementById('textInput').addEventListener('paste', function() {
        setTimeout(() => {
            if (this.value.trim()) {
                updateClipboardDisplay(this.value.trim());
                // 自动隐藏输入区域
                setTimeout(() => {
                    hideInputArea();
                }, 500);
            }
        }, 50);
    });
    
    // 监听键盘事件
    document.getElementById('textInput').addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            hideInputArea();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            if (this.value.trim()) {
                updateClipboardDisplay(this.value.trim());
                hideInputArea();
            }
        }
    });
    
    // 绑定"清空重新输入"按钮事件，使其功能与名称一致
    document.getElementById('refreshBtn').addEventListener('click', async function() {
        // 现在这个按钮的功能是"刷新"，所以我们直接调用初始化函数
        await initializeClipboard();
    });
    
    // 绑定清空按钮事件，点击后切换到可编辑的空文本框
    document.getElementById('clearBtn').addEventListener('click', function() {
        clipboardText = '';
        showInputArea();
        updateButtonStates('empty');
    });
    
    // 绑定格式按钮事件
    document.querySelectorAll('.format-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            const format = this.dataset.format;
            if (clipboardText && clipboardText.trim()) {
                // 显示加载状态
                this.style.opacity = '0.6';
                this.innerHTML = this.innerHTML.replace(/>.+<\/span>/, '>导出中...</span>');
                
                try {
                    await exportToFormat(format, clipboardText);
                } finally {
                    // 恢复按钮状态
                    setTimeout(() => {
                        this.style.opacity = '1';
                        const icons = {
                            'txt': '📄',
                            'pdf': '📕', 
                            'word': '📘',
                            'excel': '📊',
                            'jpg': '🖼️',
                            'png': '🎨',
                            'json': '📦',
                            'html': '🌐',
                            'md': '📝'
                        };
                        this.innerHTML = `<span class="format-icon">${icons[format]}</span>${format.toUpperCase()}`;
                    }, 1000);
                }
            } else {
                // 提示用户输入文本
                showInputArea();
                document.getElementById('textInput').focus();
                
                // 临时高亮提示
                mainContent.style.animation = 'shake 0.5s';
                setTimeout(() => {
                    mainContent.style.animation = '';
                }, 500);
            }
        });
    });

    // 绑定打赏按钮事件
    const donationBtn = document.getElementById('donationBtn');
    const donationModal = document.getElementById('donationModal');

    if (donationBtn && donationModal) {
        donationBtn.addEventListener('click', function() {
            donationModal.style.display = 'flex';
        });

        // 点击模态框背景时关闭
        donationModal.addEventListener('click', function(e) {
            if (e.target === donationModal) {
                donationModal.style.display = 'none';
            }
        });
    }
});

// 初始化剪贴板内容（由用户点击触发）
async function initializeClipboard() {
    console.log('开始初始化剪贴板 (v6)...');
    
    // 强制重置状态，确保每次都是新的开始
    clipboardText = '';
    clipboardContentType = 'text';
    clipboardImageData = { blob: null, dataUrl: '' };

    // 关键修复：在重新加载前，先隐藏所有可能的内容视图，确保状态干净。
    const textDisplay = document.getElementById('textDisplay');
    const imagePreviewContainer = document.getElementById('imagePreviewContainer');
    textDisplay.style.display = 'none';
    imagePreviewContainer.style.display = 'none';

    // 显示加载状态
    const mainContent = document.getElementById('mainContent');
    const emptyState = document.getElementById('emptyState');
    const loadingState = document.getElementById('loadingState');
    emptyState.style.display = 'none';
    loadingState.style.display = 'block';
    
    // 超时保护机制
    const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('读取超时')), 2000)
    );

    try {
        const clipboardItems = await Promise.race([
            navigator.clipboard.read(),
            timeoutPromise
        ]);

        let foundContent = false;

        for (const item of clipboardItems) {
            // 优先处理图片
            const imageType = item.types.find(type => type.startsWith('image/'));
            if (imageType) {
                const blob = await item.getType(imageType);
                clipboardContentType = 'image';
                clipboardImageData.blob = blob;
                clipboardImageData.dataUrl = await blobToDataURL(blob);

                updateDisplayForImage(clipboardImageData.dataUrl);
                updateButtonStates('image');
                
                console.log('从剪贴板读取到图片');
                foundContent = true;
                break; // 找到图片后即停止
            }
        }
        
        if (foundContent) {
            loadingState.style.display = 'none';
            return;
        }

        // 如果没有图片，再处理文本
        for (const item of clipboardItems) {
            if (item.types.includes('text/plain')) {
                const blob = await item.getType('text/plain');
                const text = await blob.text();
                if (text.trim()) {
                    clipboardContentType = 'text';
                    clipboardText = text;

                    updateDisplayForText(text);
                    updateButtonStates('text');
                    
                    console.log('从剪贴板读取到文本');
                    foundContent = true;
                    break;
                }
            }
        }
        
        if (foundContent) {
            loadingState.style.display = 'none';
            return;
        }

    } catch (err) {
        console.error('读取剪贴板失败:', err);
        // 如果失败，提示用户
        textDisplay.style.display = 'block'; // 确保文本框可见
        textDisplay.textContent = '读取失败：' + (err.message.includes('超时') ? '读取超时，请重试或检查页面权限' : err.message);
        textDisplay.classList.add('placeholder');
        updateButtonStates('empty');
    } finally {
        // 确保loading状态总是会被隐藏
        loadingState.style.display = 'none';
    }
    
    // 如果剪贴板为空或读取失败，尝试从存储中恢复
    try {
        const result = await chrome.storage.local.get(['lastCopiedText', 'lastCopyTime']);
        if (result.lastCopiedText && result.lastCopyTime) {
            const timeDiff = Date.now() - result.lastCopyTime;
            if (timeDiff < 5 * 60 * 1000) { // 5分钟
                clipboardContentType = 'text';
                clipboardText = result.lastCopiedText;
                
                updateDisplayForText(clipboardText);
                updateButtonStates('text');
                
                showRestoredNotification();
                console.log('从存储恢复文本成功');
                return;
            }
        }
    } catch (err) {
        console.log('从存储恢复文本失败:', err);
    }

    // 如果所有方法都失败，则停留在（可能已更新的）空状态
    if (!clipboardText) {
        updateDisplayForText('');
        updateButtonStates('empty');
    }
}

// 显示从存储恢复的通知
function showRestoredNotification() {
    const hint = document.querySelector('.paste-hint');
    if (hint) {
        hint.innerHTML = '📋 已恢复最近复制的文本';
        hint.style.color = '#90EE90';
        setTimeout(() => {
            hint.innerHTML = '点击下方区域粘贴文本内容';
            hint.style.color = 'rgba(255, 255, 255, 0.6)';
        }, 1500);
    }
}

// 更新UI以显示图片
function updateDisplayForImage(dataUrl) {
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('textDisplay').style.display = 'none';
    document.getElementById('inputArea').style.display = 'none';
    
    const imagePreview = document.getElementById('imagePreview');
    const imageContainer = document.getElementById('imagePreviewContainer');
    
    imagePreview.src = dataUrl;
    imageContainer.style.display = 'flex';
}

// 更新UI以显示文本
function updateDisplayForText(text) {
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('imagePreviewContainer').style.display = 'none';
    document.getElementById('inputArea').style.display = 'none';
    
    const textDisplay = document.getElementById('textDisplay');
    textDisplay.style.display = 'block';
    
    updateClipboardDisplay(text);
}

// 根据内容类型更新按钮的可用状态
function updateButtonStates(contentType) {
    const textFormats = ['txt', 'excel', 'json', 'md'];
    const allFormats = ['txt', 'pdf', 'word', 'excel', 'jpg', 'png', 'json', 'html', 'md'];
    
    allFormats.forEach(format => {
        const button = document.querySelector(`.format-btn[data-format="${format}"]`);
        if (!button) return;
        
        let disabled = false;
        if (contentType === 'image') {
            if (textFormats.includes(format)) {
                disabled = true;
            }
        } else if (contentType === 'empty') {
            disabled = true; // 如果内容为空，禁用所有按钮
        }
        
        button.disabled = disabled;
        button.style.opacity = disabled ? '0.4' : '1';
        button.style.cursor = disabled ? 'not-allowed' : 'pointer';
    });
}

// Blob to Data URL Converter
function blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
    });
}

// 显示输入区域
function showInputArea() {
    const mainContent = document.getElementById('mainContent');
    const inputArea = document.getElementById('inputArea');
    const textInput = document.getElementById('textInput');
    
    mainContent.style.display = 'none';
    inputArea.style.display = 'block';
    textInput.focus();
    
    // 如果已有文本，填充到输入框
    if (clipboardText) {
        textInput.value = clipboardText;
    }
}

// 隐藏输入区域
function hideInputArea() {
    const mainContent = document.getElementById('mainContent');
    const inputArea = document.getElementById('inputArea');
    
    inputArea.style.display = 'none';
    mainContent.style.display = 'block';
}

// 更新剪贴板显示
function updateClipboardDisplay(text) {
    const textDisplay = document.getElementById('textDisplay');
    const mainContent = document.getElementById('mainContent');
    
    clipboardText = text;

    if (text.trim()) {
        // 保存到存储，以便下次恢复
        chrome.storage.local.set({
            lastCopiedText: text,
            lastCopyTime: Date.now()
        });

        const displayText = text.length > 300 ? text.substring(0, 300) + '...' : text;
        
        // 恢复带有字数和提示的详细格式
        textDisplay.innerHTML = `
            <div style="color: white; font-size: 12px; line-height: 1.4;">
                ${displayText.replace(/\n/g, '<br>')}
                <div style="opacity: 0.7; font-size: 10px; margin-top: 8px; text-align: center; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 8px;">
                    ✅ 已准备 ${text.length} 字符 · 点击可修改
                </div>
            </div>
        `;
        textDisplay.classList.remove('placeholder');
        mainContent.classList.add('text-loaded');
    } else {
        // 剪贴板为空时，显示提示
        textDisplay.textContent = '剪贴板为空或内容不支持';
        textDisplay.classList.add('placeholder');
        mainContent.classList.remove('text-loaded');
    }
}

// 清空文本并切换到输入模式
function clearText() {
    clipboardText = '';
    clipboardContentType = 'text';
    clipboardImageData = { blob: null, dataUrl: '' };

    const emptyState = document.getElementById('emptyState');
    const textDisplay = document.getElementById('textDisplay');
    const imagePreviewContainer = document.getElementById('imagePreviewContainer');
    
    textDisplay.style.display = 'none';
    imagePreviewContainer.style.display = 'none';
    emptyState.style.display = 'flex';
    emptyState.innerHTML = `<div>📋 点击此处</div><div style="font-size: 11px; margin-top: 8px; opacity: 0.8;">从剪贴板读取内容</div>`;

    document.getElementById('textInput').value = '';
    document.getElementById('mainContent').classList.remove('text-loaded');
    updateButtonStates('empty');
}

// 添加震动动画CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
    }

    /* Custom Scrollbar Styles */
    .clipboard-text::-webkit-scrollbar {
        width: 8px;
    }
    .clipboard-text::-webkit-scrollbar-track {
        background: transparent;
    }
    .clipboard-text::-webkit-scrollbar-thumb {
        background-color: rgba(255, 255, 255, 0.5);
        border-radius: 10px;
    }
    .clipboard-text::-webkit-scrollbar-thumb:hover {
        background-color: rgba(255, 255, 255, 0.7);
    }

    .text-loaded {
        background: rgba(76, 175, 80, 0.1);
        border-color: rgba(76, 175, 80, 0.3);
    }

    /* Modal styles for PDF instructions */
    .modal-overlay {
        /* ... */
    }
`;
document.head.appendChild(style);

// 生成文件名（使用日期和文本前缀）
function generateFilename(text, extension) {
    const now = new Date();
    const dateStr = now.getFullYear().toString() + 
                   (now.getMonth() + 1).toString().padStart(2, '0') + 
                   now.getDate().toString().padStart(2, '0');
    
    // 提取文本前几个字符作为文件名前缀（去除特殊字符）
    const textPrefix = text.trim()
        .replace(/[^\u4e00-\u9fa5\w\s]/g, '') // 只保留中文、字母、数字、空格
        .replace(/\s+/g, '_') // 空格替换为下划线
        .substring(0, 10); // 取前10个字符
    
    const filename = textPrefix ? `${dateStr}_${textPrefix}` : dateStr;
    return `${filename}.${extension}`;
}

// 导出到指定格式
async function exportToFormat(format, text) {
    // 根据当前内容类型决定使用什么数据
    if (clipboardContentType === 'image') {
        const filename = generateFilename('image_export', getFileExtension(format));
        await exportImage(format, filename);
    } else {
        const filename = generateFilename(text, getFileExtension(format));
        await exportText(format, text, filename);
    }
}

// 导出文本内容的函数
async function exportText(format, text, filename) {
    try {
        switch (format) {
            case 'txt':
                downloadTextFile(text, filename);
                break;
            case 'pdf':
                exportToPDF(text, filename); // exportToPDF is sync
                break;
            case 'word':
                exportToWord(text, filename);
                break;
            case 'excel':
                exportToExcel(text, filename);
                break;
            case 'jpg':
            case 'png':
                await exportToImage(text, filename, format);
                break;
            case 'json':
                exportToJSON(text, filename);
                break;
            case 'html':
                exportToHTML(text, filename);
                break;
            case 'md':
                exportToMarkdown(text, filename);
                break;
            default:
                alert('不支持的格式');
        }
    } catch (error) {
        console.error(`导出${format}格式失败:`, error);
        alert(`扩展程序文本导出助手提示：\n\n导出${format}格式失败，请检查控制台错误信息`);
    }
}

// 新增：专门用于导出图片的函数
async function exportImage(format, filename) {
    if (!clipboardImageData.blob) {
        alert('没有找到图片数据!');
        return;
    }

    try {
        switch (format) {
            case 'jpg':
            case 'png':
                // 直接下载图片blob
                downloadBlob(clipboardImageData.blob, filename);
                break;
            case 'pdf':
            case 'word':
            case 'html':
                // 对于这些格式，我们将图片美化后嵌入到文档中
                const imageHtml = `
                    <div style="text-align: center; padding: 20px 0;">
                        <img src="${clipboardImageData.dataUrl}" alt="Copied Image" style="max-width: 95%; height: auto; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                        <p style="font-size: 12px; color: #888; margin-top: 12px; font-style: italic;">导出图片</p>
                    </div>
                `;

                if (format === 'word') {
                    exportToWord(imageHtml, filename);
                } else if (format === 'html') {
                    exportToHTML(imageHtml, filename);
                } else if (format === 'pdf') {
                    exportToPDF(imageHtml, filename);
                }
                break;
            default:
                // 对于不支持的格式，此函数不应被调用（按钮已禁用）
                console.warn(`不支持为图片导出 ${format} 格式`);
        }
    } catch (error) {
        console.error(`导出图片为 ${format} 格式失败:`, error);
        alert(`导出图片失败，详情请查看控制台。`);
    }
}

// 获取文件扩展名
function getFileExtension(format) {
    const extensions = {
        'txt': 'txt',
        'pdf': 'pdf',
        'word': 'docx',
        'excel': 'xlsx',
        'jpg': 'jpg',
        'png': 'png',
        'json': 'json',
        'html': 'html',
        'md': 'md'
    };
    return extensions[format] || 'txt';
}

// 下载文本文件
function downloadTextFile(text, filename) {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    downloadBlob(blob, filename);
}

// 导出为PDF（不依赖外部库）
function exportToPDF(text, filename) {
    // 只显示说明窗口，将后续操作交由弹窗按钮处理
    showPdfInstructions(text, filename);
}

// 显示PDF操作说明的自定义模态框
function showPdfInstructions(text, filename) {
    // 确保之前的弹窗被移除
    const existingModal = document.getElementById('pdf-instructions-modal');
    if (existingModal) {
        existingModal.remove();
    }

    // 创建模态框HTML
    const modalHTML = `
        <div id="pdf-instructions-modal" class="modal-overlay">
            <div class="modal-content">
                <h3>PDF转换步骤</h3>
                <ol>
                    <li>将为您下载一个HTML文件</li>
                    <li>请手动打开该文件</li>
                    <li>在打开的页面中点击"打印/转PDF"</li>
                    <li>在打印对话框选择"保存为PDF"</li>
                </ol>
                <button id="modal-close-btn" class="modal-btn">我知道了</button>
            </div>
        </div>
    `;
    
    // 将模态框添加到popup页面
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // 添加关闭事件
    document.getElementById('modal-close-btn').addEventListener('click', () => {
        // 1. 移除弹窗
        document.getElementById('pdf-instructions-modal').remove();
        
        // 2. 创建并下载用于打印的HTML文件
        const printableContent = createPrintableContent(text);
        const blob = new Blob([printableContent], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        // 将文件名后缀改为 .html 以便用户打开
        a.download = filename.replace(/\.pdf$/, '_for_printing.html');
        document.body.appendChild(a);
        a.click();
        
        // 清理
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
}

// 创建可打印的HTML内容（去除水印和多余元素）
function createPrintableContent(text) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>导出文档</title>
    <style>
        @page {
            size: A4;
            margin: 2cm;
        }
        body {
            font-family: 'Microsoft YaHei', Arial, sans-serif;
            font-size: 12pt;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 20px;
            background: white;
            display: flex;
            flex-direction: column;
            min-height: 90vh;
        }
        .content {
            white-space: pre-wrap;
            word-wrap: break-word;
            font-size: 11pt;
            flex-grow: 1;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid #ccc;
            font-size: 9pt;
            color: #666;
        }
        @media print {
            body { margin: 0; padding: 1cm; }
            .no-print { display: none; }
        }
        .print-instructions {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #f8f9fa;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.15);
            border: 1px solid #dee2e6;
            z-index: 1001;
            max-width: 300px;
            font-size: 14px;
        }
        .print-instructions h3 {
            margin-top: 0;
            font-size: 16px;
            color: #333;
        }
        .print-instructions p {
            margin-bottom: 15px;
        }
        .print-btn {
            display: inline-block;
            padding: 8px 15px;
            border: none;
            background: #007bff;
            color: white;
            border-radius: 5px;
            cursor: pointer;
            margin-right: 10px;
            font-size: 14px;
        }
        .print-btn:hover {
            background: #0056b3;
        }
        .close-btn {
            background: #6c757d;
        }
        .close-btn:hover {
            background: #5a6268;
        }
    </style>
</head>
<body>
    
    <div class="no-print print-instructions">
        <h3>📄 转换为PDF说明</h3>
        <p>此页面已为PDF打印优化，请按以下步骤转换为PDF：</p>
        <ol>
            <li>点击下方的"打印/转PDF"按钮</li>
            <li>在打印对话框中选择"保存为PDF"</li>
            <li>点击"保存"即可获得PDF文件</li>
        </ol>
        <button class="print-btn" onclick="window.print()">🖨️ 打印/转PDF</button>
        <button class="print-btn close-btn" onclick="window.close()">❌ 关闭</button>
    </div>
    
    <div class="content">${text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
    <div class="footer">
        导出时间: ${new Date().toLocaleString('zh-CN')}
    </div>
</body>
</html>`;
}

// 导出为Word文档（确保内容完整）
function exportToWord(text, filename) {
    // 创建完整的Word文档HTML结构
    const htmlContent = `
        <html>
        <head>
            <meta charset="utf-8">
            <title>导出文档</title>
            <style>
                @page {
                    size: A4;
                    margin: 2.5cm;
                }
                body { 
                    font-family: "Microsoft YaHei", "SimSun", Arial, sans-serif; 
                    margin: 0; 
                    padding: 20px;
                    line-height: 1.8; 
                    font-size: 12pt;
                    color: #333;
                }
                .content {
                    white-space: pre-wrap;
                    word-wrap: break-word;
                    font-size: 11pt;
                    line-height: 1.8;
                }
                .footer {
                    text-align: center;
                    margin-top: 30px;
                    padding-top: 15px;
                    border-top: 1px solid #ccc;
                    font-size: 10pt;
                    color: #666;
                }
            </style>
        </head>
        <body>
            <div class="content">${text.includes('<img') ? text : text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</div>
            <div class="footer">
                导出时间: ${new Date().toLocaleString('zh-CN')}
            </div>
        </body>
        </html>
    `;
    
    const blob = new Blob([htmlContent], { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
    });
    downloadBlob(blob, filename);
}

// 导出为Excel（确保内容完整）
function exportToExcel(text, filename) {
    // 将文本按行分割作为Excel行，确保所有内容都包含
    const lines = text.split('\n');
    
    // 创建CSV内容
    let csvContent = '';
    lines.forEach((line, index) => {
        // 转义双引号并包装每行
        const escapedLine = line.replace(/"/g, '""');
        csvContent += `"第${index + 1}行","${escapedLine}"\n`;
    });

    // 将时间戳作为页脚
    csvContent += '\n"---",""\n'; // 分割线
    csvContent += `"导出时间","${new Date().toLocaleString('zh-CN')}"\n`;
    
    // 添加BOM以支持中文
    const blob = new Blob(['\ufeff' + csvContent], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    downloadBlob(blob, filename);
}

/**
 * Renders text to an image using html2canvas for reliability.
 * @param {string} text The text to render.
 * @param {string} filename The desired filename.
 * @param {string} format The image format ('jpeg' or 'png').
 * @returns {Promise<void>}
 */
async function exportToImage(text, filename, format) {
    // Create a temporary element to render the image content
    const elementToRender = createExportImageElement(text);
    document.body.appendChild(elementToRender);

    try {
        const canvas = await html2canvas(elementToRender, {
            useCORS: true,
            scale: 2, // Use a fixed scale for high resolution
            backgroundColor: null, // We use a styled background
        });

        // Convert canvas to blob and trigger download
        const blob = await new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Canvas to Blob conversion failed.'));
                }
            }, `image/${format}`);
        });
        
        downloadBlob(blob, filename);

    } catch (error) {
        console.error('html2canvas rendering failed:', error);
        // Re-throw the error to be caught by the calling function
        throw error;
    } finally {
        // Ensure the temporary element is always removed
        document.body.removeChild(elementToRender);
    }
}

/**
 * Creates a styled HTML element in memory for image rendering.
 * @param {string} text The text to be included.
 * @returns {HTMLElement} The styled element ready for rendering.
 */
function createExportImageElement(text) {
    const textLength = text.trim().length;

    // Simplified adaptive logic for container width and font size
    let containerWidth, fontSize;
    if (textLength < 50) {
        containerWidth = 600;
        fontSize = 28;
    } else if (textLength < 150) {
        containerWidth = 700;
        fontSize = 24;
    } else if (textLength < 300) {
        containerWidth = 800;
        fontSize = 22;
    } else if (textLength < 800) {
        containerWidth = 900;
        fontSize = 20;
    } else {
        containerWidth = 1000;
        fontSize = 18;
    }

    // Main container, rendered off-screen
    const element = document.createElement('div');
    Object.assign(element.style, {
        position: 'absolute',
        left: '-9999px',
        top: '0px',
        padding: '40px',
        width: `${containerWidth}px`,
        background: 'linear-gradient(135deg, #f5f7fa, #c3cfe2)',
        fontFamily: `"Microsoft YaHei", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`,
    });

    // White content card
    const contentWrapper = document.createElement('div');
    Object.assign(contentWrapper.style, {
        background: '#ffffff',
        padding: '35px',
        borderRadius: '12px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
        minHeight: '200px',
        display: 'flex',
        flexDirection: 'column',
    });

    // Text content element
    const textContent = document.createElement('div');
    Object.assign(textContent.style, {
        whiteSpace: 'pre-wrap',
        wordWrap: 'break-word',
        color: '#333',
        fontSize: `${fontSize}px`,
        lineHeight: '1.7',
        margin: '0',
        flexGrow: '1',
    });
    textContent.textContent = text;

    // Footer with timestamp
    const footer = document.createElement('div');
    Object.assign(footer.style, {
        textAlign: 'center',
        paddingTop: '20px',
        marginTop: '30px',
        borderTop: '1px solid #eef2f7',
        fontSize: '14px',
        color: '#888',
    });
    footer.textContent = `导出时间: ${new Date().toLocaleString('zh-CN')}`;

    contentWrapper.appendChild(textContent);
    contentWrapper.appendChild(footer);
    element.appendChild(contentWrapper);
    
    return element;
}

// 导出为JSON格式
function exportToJSON(text, filename) {
    const jsonData = {
        timestamp: new Date().toISOString(),
        content: text,
        metadata: {
            length: text.length,
            lines: text.split('\n').length,
            words: text.trim().split(/\s+/).length,
            exportedBy: "文本导出助手"
        }
    };
    
    const jsonString = JSON.stringify(jsonData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
    downloadBlob(blob, filename);
}

// 导出为HTML格式
function exportToHTML(text, filename) {
    const htmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>导出文档</title>
    <style>
        body {
            font-family: "Microsoft YaHei", Arial, sans-serif;
            line-height: 1.8;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
            color: #333;
            background: #f9f9f9;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            display: flex;
            flex-direction: column;
            min-height: 80vh;
        }
        .content {
            white-space: pre-wrap;
            word-wrap: break-word;
            font-size: 16px;
            line-height: 1.8;
            flex-grow: 1;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            color: #666;
            font-size: 14px;
        }
        @media print {
            body { background: white; }
            .container { box-shadow: none; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="content">${text.includes('<img') ? text : text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</div>
        <div class="footer">
            导出时间: ${new Date().toLocaleString('zh-CN')}
        </div>
    </div>
</body>
</html>`;
    
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    downloadBlob(blob, filename);
}

// 导出为Markdown格式
function exportToMarkdown(text, filename) {
    // 创建Markdown内容
    const now = new Date();
    const mdContent = `# 导出文档

${text}

---

**导出时间:** ${now.toLocaleString('zh-CN')}

*导出工具: 文本导出助手*`;
    
    const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });
    downloadBlob(blob, filename);
}

// 通用下载函数
function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// 显示手动输入选项
function showManualInputOption() {
    const contentDiv = document.getElementById('clipboardContent');
    contentDiv.innerHTML = `
        <div style="text-align: center; color: #ffeb3b;">
            <div style="margin-bottom: 10px; font-size: 12px;">
                📋 无法自动读取剪贴板
            </div>
            <button onclick="showManualInput()" 
                    style="background: #4CAF50; border: none; color: white; 
                           padding: 8px 16px; border-radius: 6px; cursor: pointer; 
                           font-size: 12px; width: 100%;">
                📝 点击手动输入/粘贴文本
            </button>
            <div style="margin-top: 8px; font-size: 10px; opacity: 0.8;">
                或者复制文本后重新打开插件
            </div>
        </div>
    `;
}

// 显示手动输入界面
function showManualInput() {
    const contentDiv = document.getElementById('clipboardContent');
    contentDiv.innerHTML = `
        <div>
            <textarea id="manualTextInput" 
                      placeholder="请在此粘贴或输入文本内容..." 
                      style="width: 100%; height: 80px; background: rgba(255,255,255,0.95); 
                             border: 1px solid rgba(255,255,255,0.3); border-radius: 6px; 
                             padding: 8px; font-size: 12px; color: #333; resize: vertical; 
                             box-sizing: border-box;">
            </textarea>
            <div style="text-align: center; margin-top: 8px;">
                <button onclick="useManualText()" 
                        style="background: #4CAF50; border: none; color: white; 
                               padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                    ✅ 使用此文本
                </button>
                <button onclick="refreshClipboard()" 
                        style="background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); 
                               color: white; padding: 6px 12px; border-radius: 4px; cursor: pointer; 
                               font-size: 12px; margin-left: 5px;">
                    🔄 重试
                </button>
            </div>
            <div style="font-size: 10px; color: rgba(255,255,255,0.7); text-align: center; margin-top: 5px;">
                提示: 可以直接 Ctrl+V 粘贴文本到上面的框中
            </div>
        </div>
    `;
    
    // 聚焦到文本框并尝试自动粘贴
    setTimeout(() => {
        const textInput = document.getElementById('manualTextInput');
        textInput.focus();
        
        // 监听粘贴事件
        textInput.addEventListener('paste', function(e) {
            setTimeout(() => {
                if (textInput.value.trim()) {
                    // 自动使用粘贴的文本
                    setTimeout(() => {
                        useManualText();
                    }, 100);
                }
            }, 50);
        });
        
        // 尝试执行粘贴命令
        try {
            document.execCommand('paste');
        } catch (err) {
            console.log('自动粘贴失败，需要手动粘贴');
        }
    }, 100);
}

// 使用手动输入的文本
function useManualText() {
    const textInput = document.getElementById('manualTextInput');
    const inputText = textInput.value.trim();
    
    if (inputText) {
        clipboardText = inputText;
        
        // 保存到本地存储
        chrome.storage.local.set({
            lastCopiedText: inputText,
            lastCopyTime: Date.now()
        });
        
        updateClipboardDisplay(inputText);
    } else {
        alert('请输入一些文本内容');
    }
}

// 请求剪贴板权限（保留但简化）
async function requestClipboardPermission() {
    refreshClipboard();
}