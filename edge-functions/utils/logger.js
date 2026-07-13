// edge-functions/utils/logger.js - 适用于 EdgeOne Makers

// ============================================================
// 日志级别定义
// ============================================================
const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    NONE: 4
};

const LEVEL_MAP = {
    'DEBUG': 0,
    'INFO': 1,
    'WARN': 2,
    'ERROR': 3,
    'NONE': 4
};

// ============================================================
// 默认配置（未初始化时的默认值）
// ============================================================
let currentLogLevel = LOG_LEVELS.DEBUG;
let debugMode = true;
let debugRequestBody = true;
let debugSupabaseQuery = true;

// ============================================================
// 核心：从 env 初始化日志配置
// ============================================================
export function initLogger(env) {
    if (!env) return;
    
    // 从 env 读取 LOG_LEVEL
    const logLevel = env.LOG_LEVEL ? env.LOG_LEVEL.toUpperCase() : 'DEBUG';
    currentLogLevel = LEVEL_MAP[logLevel] !== undefined ? LEVEL_MAP[logLevel] : LOG_LEVELS.DEBUG;
    
    // 从 env 读取调试开关
    debugMode = env.DEBUG_MODE === 'true' || env.DEBUG_MODE === true;
    debugRequestBody = env.DEBUG_REQUEST_BODY === 'true' || env.DEBUG_REQUEST_BODY === true;
    debugSupabaseQuery = env.DEBUG_SUPABASE_QUERY === 'true' || env.DEBUG_SUPABASE_QUERY === true;
    
    // 启动时打印配置
    console.log(`🔍 [Logger] 日志级别: ${logLevel}`);
    console.log(`🔍 [Logger] 调试模式: ${debugMode ? 'ON' : 'OFF'}`);
    console.log(`🔍 [Logger] 请求体调试: ${debugRequestBody ? 'ON' : 'OFF'}`);
    console.log(`🔍 [Logger] Supabase查询调试: ${debugSupabaseQuery ? 'ON' : 'OFF'}`);
}

// ============================================================
// 日志函数
// ============================================================
function formatLog(level, module, message, data = null) {
    const timestamp = new Date().toISOString();
    const levelLabels = {
        [LOG_LEVELS.DEBUG]: '🔍 DEBUG',
        [LOG_LEVELS.INFO]: 'ℹ️ INFO',
        [LOG_LEVELS.WARN]: '⚠️ WARN',
        [LOG_LEVELS.ERROR]: '❌ ERROR'
    };
    const levelLabel = levelLabels[level] || '📌 LOG';
    const moduleLabel = module ? `[${module}]` : '';
    
    let logMessage = `${timestamp} ${levelLabel} ${moduleLabel} ${message}`;
    if (data && debugMode) {
        logMessage += `\n${JSON.stringify(data, null, 2)}`;
    }
    return logMessage;
}

function log(level, module, message, data = null) {
    if (level < currentLogLevel) return;
    const formatted = formatLog(level, module, message, data);
    if (level >= LOG_LEVELS.ERROR) {
        console.error(formatted);
    } else if (level >= LOG_LEVELS.WARN) {
        console.warn(formatted);
    } else {
        console.log(formatted);
    }
}

// ============================================================
// 导出 logger
// ============================================================
export const logger = {
    init: initLogger,
    
    debug: (module, message, data = null) => log(LOG_LEVELS.DEBUG, module, message, data),
    info: (module, message, data = null) => log(LOG_LEVELS.INFO, module, message, data),
    warn: (module, message, data = null) => log(LOG_LEVELS.WARN, module, message, data),
    error: (module, message, data = null) => log(LOG_LEVELS.ERROR, module, message, data),
    
    request: (module, request) => {
        const url = new URL(request.url);
        logger.debug(module, `📥 收到请求`, {
            method: request.method,
            pathname: url.pathname,
            search: url.search,
            headers: {
                'content-type': request.headers.get('content-type'),
                'user-agent': request.headers.get('user-agent')
            }
        });
    },
    
    requestBody: (module, body) => {
        if (debugRequestBody) {
            logger.debug(module, `📥 请求体`, typeof body === 'string' ? body : JSON.stringify(body));
        }
    },
    
    response: (module, status, data = null) => {
        logger.debug(module, `📤 响应状态: ${status}`, data);
    },
    
    env: (module, env) => {
        const supabaseUrl = env.SUPABASE_URL ? '✅ 已配置' : '❌ 未配置';
        const supabaseKey = env.SUPABASE_SERVICE_KEY ? '✅ 已配置' : '❌ 未配置';
        logger.debug(module, `🔑 环境变量`, { supabaseUrl, supabaseKey });
    },
    
    supabase: (module, operation, url, data = null) => {
        if (debugSupabaseQuery) {
            logger.debug(module, `🗄️ Supabase ${operation}`, { url, data });
        } else {
            logger.debug(module, `🗄️ Supabase ${operation}`);
        }
    },
    
    errorWithStack: (module, error) => {
        logger.error(module, `❌ ${error.message}`, {
            stack: error.stack,
            name: error.name
        });
    }
};

export default logger;