/**
 * 诗词数据存储管理
 */

const STORAGE_KEY = 'user_custom_poems';

/**
 * 获取所有自定义诗词
 * @returns {Array} 诗词数组
 */
function getCustomPoems() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error('读取自定义诗词失败:', e);
        return [];
    }
}

/**
 * 保存单首自定义诗词
 * @param {object} poem - 诗词对象
 * @returns {boolean} 是否保存成功
 */
function saveCustomPoem(poem) {
    try {
        const poems = getCustomPoems();
        // 检查标题是否重复（可选）
        // const exists = poems.some(p => p.title === poem.title && p.id !== poem.id);
        // if (exists) return false;
        
        poems.push(poem);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(poems));
        return true;
    } catch (e) {
        console.error('保存自定义诗词失败:', e);
        return false;
    }
}

/**
 * 更新单首自定义诗词
 * @param {string} id - 诗词ID
 * @param {object} updatedPoem - 更新后的诗词对象
 * @returns {boolean} 是否更新成功
 */
function updateCustomPoem(id, updatedPoem) {
    try {
        const poems = getCustomPoems();
        const index = poems.findIndex(p => p.id === id);
        if (index === -1) return false;
        poems[index] = { ...updatedPoem, id: id };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(poems));
        return true;
    } catch (e) {
        console.error('更新自定义诗词失败:', e);
        return false;
    }
}

/**
 * 删除单首自定义诗词
 * @param {string} id - 诗词ID
 * @returns {boolean} 是否删除成功
 */
function deleteCustomPoem(id) {
    try {
        let poems = getCustomPoems();
        poems = poems.filter(p => p.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(poems));
        return true;
    } catch (e) {
        console.error('删除自定义诗词失败:', e);
        return false;
    }
}

/**
 * 根据ID获取单首诗词
 * @param {string} id - 诗词ID
 * @returns {object|null} 诗词对象
 */
function getCustomPoemById(id) {
    const poems = getCustomPoems();
    return poems.find(p => p.id === id) || null;
}

/**
 * 检查是否为自定义诗词（通过ID前缀判断）
 * @param {string} id - 诗词ID
 * @returns {boolean}
 */
function isCustomPoemId(id) {
    return id && id.startsWith('user_');
}

/**
 * 生成唯一ID
 * @returns {string}
 */
function generatePoemId() {
    return `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
}

/**
 * 导出所有自定义诗词为JSON字符串
 * @returns {string}
 */
function exportCustomPoems() {
    const poems = getCustomPoems();
    return JSON.stringify(poems, null, 2);
}

/**
 * 导入自定义诗词（从JSON字符串）
 * @param {string} jsonStr 
 * @returns {boolean}
 */
function importCustomPoems(jsonStr) {
    try {
        const poems = JSON.parse(jsonStr);
        if (!Array.isArray(poems)) return false;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(poems));
        return true;
    } catch (e) {
        console.error('导入自定义诗词失败:', e);
        return false;
    }
}

// 导出（如果使用模块化）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getCustomPoems,
        saveCustomPoem,
        updateCustomPoem,
        deleteCustomPoem,
        getCustomPoemById,
        isCustomPoemId,
        generatePoemId,
        exportCustomPoems,
        importCustomPoems
    };
}