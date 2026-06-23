/**
 * 通用Toast提示组件
 */

/**
 * 显示Toast提示
 * @param {string} msg - 提示消息
 * @param {boolean} isError - 是否为错误消息
 * @param {number} duration - 显示时长（毫秒）
 */
function showToast(msg, isError = false, duration = 2400) {
    // 移除已存在的Toast
    const old = document.querySelector('.toast-global');
    if (old) old.remove();
    
    const toast = document.createElement('div');
    toast.className = 'toast-global';
    toast.textContent = msg;
    
    if (isError) {
        toast.style.background = '#FF6B6B';
        toast.style.color = '#fff';
    }
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        if (toast.parentNode) toast.remove();
    }, duration);
}

// 添加全局样式（如果还没添加）
function ensureToastStyles() {
    if (document.getElementById('toastStyles')) return;
    const style = document.createElement('style');
    style.id = 'toastStyles';
    style.textContent = `
        .toast-global {
            position: fixed;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%);
            background: #3D2B1A;
            color: #FFF6ED;
            padding: 10px 24px;
            border-radius: 40px;
            font-weight: 600;
            font-size: 14px;
            z-index: 9999;
            box-shadow: 0 6px 20px rgba(0,0,0,0.2);
            animation: toastPop 2.4s ease forwards;
            white-space: nowrap;
            max-width: 90vw;
            overflow: hidden;
            text-overflow: ellipsis;
            font-family: 'Segoe UI', 'PingFang SC', sans-serif;
        }
        @keyframes toastPop {
            0% { opacity: 0; transform: translateX(-50%) translateY(20px); }
            15% { opacity: 1; transform: translateX(-50%) translateY(0); }
            85% { opacity: 1; transform: translateX(-50%) translateY(0); }
            100% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
        }
    `;
    document.head.appendChild(style);
}

// 自动注入样式
if (typeof document !== 'undefined') {
    ensureToastStyles();
}

// 导出（如果使用模块化）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { showToast };
}