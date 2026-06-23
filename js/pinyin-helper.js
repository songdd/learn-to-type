/**
 * 拼音注音工具
 * 依赖 pinyin-pro 库
 */

// 从CDN加载 pinyin-pro
// 在HTML中通过 <script src="..."> 引入

function getPinyinPro() {
    // 检查全局是否已加载 pinyin-pro
    if (typeof pinyin !== 'undefined') {
        return pinyin;
    }
    // 如果未加载，尝试动态导入
    throw new Error('pinyin-pro 库未加载，请检查网络连接');
}

/**
 * 获取单个字的拼音（默认无音调）
 * @param {string} char - 单个汉字
 * @param {string} context - 上下文（用于多音字判断）
 * @param {object} options - 配置项
 * @returns {string} 拼音字符串
 */
function getCharPinyin(char, context = '', options = {}) {
    const pinyinFn = getPinyinPro();
    const defaultOptions = {
        toneType: 'none',
        type: 'string',
        multiple: false,
    };
    const mergedOptions = { ...defaultOptions, ...options };
    
    // 非中文字符返回空
    if (!/[\u4e00-\u9fa5]/.test(char)) {
        return '';
    }
    
    // 获取所有读音用于多音字判断
    const allPinyin = pinyinFn(char, {
        toneType: 'none',
        multiple: true,
        type: 'array'
    });
    
    if (!allPinyin || allPinyin.length === 0) return '';
    if (allPinyin.length === 1) return allPinyin[0];
    
    // 多音字上下文规则库
    const contextRules = {
        '重': { '要': 'zhong', '复': 'chong', '新': 'chong', '量': 'zhong', '大': 'zhong', '点': 'zhong' },
        '长': { '短': 'chang', '大': 'zhang', '久': 'chang', '远': 'chang', '征': 'chang', '江': 'chang' },
        '行': { '走': 'xing', '业': 'hang', '为': 'xing', '动': 'xing', '列': 'hang', '知': 'xing' },
        '乐': { '快': 'le', '音': 'yue', '曲': 'yue', '器': 'yue', '章': 'yue' },
        '了': { '解': 'liao', '却': 'le', '结': 'liao', '然': 'liao', '事': 'le' },
        '的': { '确': 'di', '话': 'de', '是': 'de', '目': 'di', '士': 'di' },
        '觉': { '得': 'jiao', '悟': 'jue', '察': 'jue', '醒': 'jue', '知': 'jue' },
        '着': { '火': 'zhao', '急': 'zhao', '陆': 'zhuo', '手': 'zhuo', '落': 'zhao' },
        '降': { '低': 'jiang', '落': 'jiang', '服': 'xiang', '临': 'lin' },
        '华': { '中': 'hua', '山': 'hua', '夏': 'hua', '实': 'hua', '丽': 'hua' },
        '为': { '人': 'wei', '了': 'wei', '国': 'wei', '民': 'wei', '什': 'wei', '何': 'wei' },
        '得': { '到': 'de', '过': 'de', '不': 'de', '意': 'de', '失': 'de' },
        '还': { '回': 'huan', '有': 'hai', '是': 'hai', '好': 'hai', '钱': 'huan' },
        '会': { '面': 'hui', '有': 'hui', '员': 'hui', '见': 'hui', '计': 'kuai' },
        '单': { '位': 'dan', '人': 'dan', '词': 'dan', '纯': 'dan', '于': 'chan' },
        '空': { '气': 'kong', '中': 'kong', '白': 'kong', '间': 'kong', '缺': 'kong' },
        '难': { '过': 'nan', '处': 'nan', '题': 'nan', '民': 'nan', '兄': 'nan' },
        '好': { '人': 'hao', '了': 'hao', '处': 'hao', '像': 'hao', '奇': 'hao' },
        '和': { '平': 'he', '气': 'he', '好': 'he', '声': 'he', '面': 'he' },
        '地': { '方': 'di', '下': 'di', '球': 'di', '理': 'di', '的': 'de' },
    };
    
    if (contextRules[char]) {
        for (let [key, value] of Object.entries(contextRules[char])) {
            if (context.includes(key)) {
                return value;
            }
        }
    }
    
    // 默认返回第一个读音
    return allPinyin[0];
}

/**
 * 对整首诗词进行自动注音
 * @param {string} rawText - 用户输入的原始诗词文本
 * @param {object} options - 注音选项
 * @returns {Array<{char: string, pinyin: string}>} 注音后的字符数组
 */
function autoPinyinPoem(rawText, options = {}) {
    const lines = rawText.split('\n').filter(line => line.trim() !== '');
    const result = [];
    
    for (let line of lines) {
        const trimmedLine = line.trim();
        const chars = trimmedLine.split('');
        for (let char of chars) {
            if (/[\u4e00-\u9fa5]/.test(char)) {
                // 获取上下文用于多音字判断
                const context = trimmedLine;
                const py = getCharPinyin(char, context, options);
                result.push({
                    char: char,
                    pinyin: py || ''
                });
            } else {
                // 标点符号或特殊字符
                result.push({
                    char: char,
                    pinyin: ''
                });
            }
        }
        // 行末不加额外标记，保持原有结构
    }
    
    return result;
}

/**
 * 获取诗词的纯文本摘要（用于预览）
 * @param {Array<{char: string}>} poemData 
 * @returns {string} 
 */
function getPoemTextSummary(poemData) {
    return poemData.map(item => item.char).join('');
}

/**
 * 统计诗词信息
 * @param {Array<{char: string, pinyin: string}>} poemData 
 * @returns {{ total: number, chinese: number, hasPinyin: number }}
 */
function getPoemStats(poemData) {
    const total = poemData.length;
    const chineseChars = poemData.filter(item => /[\u4e00-\u9fa5]/.test(item.char));
    const hasPinyin = chineseChars.filter(item => item.pinyin && item.pinyin.length > 0);
    return {
        total: total,
        chinese: chineseChars.length,
        hasPinyin: hasPinyin.length
    };
}

// 导出（如果使用模块化）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getCharPinyin,
        autoPinyinPoem,
        getPoemTextSummary,
        getPoemStats
    };
}