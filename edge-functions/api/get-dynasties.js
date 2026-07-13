// edge-functions/api/get-dynasties.js - 朝代列表

import logger from '../utils/logger.js';

const MODULE = 'get-dynasties';

export async function onRequest(context) {
    const { request, env } = context;
    
    logger.init(env);
    logger.request(MODULE, request);
    
    if (request.method === 'OPTIONS') {
        logger.debug(MODULE, 'CORS 预检请求');
        return new Response(null, {
            status: 204,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            }
        });
    }
    
    if (request.method !== 'GET') {
        logger.warn(MODULE, '❌ 非 GET 请求', { method: request.method });
        return new Response(JSON.stringify({
            success: false,
            message: '请使用 GET 请求'
        }), {
            status: 405,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
    
    try {
        logger.env(MODULE, env);
        
        const supabaseUrl = env.SUPABASE_URL;
        const supabaseKey = env.SUPABASE_SERVICE_KEY;
        
        if (!supabaseUrl || !supabaseKey) {
            logger.error(MODULE, '❌ 环境变量未配置');
            return new Response(JSON.stringify({
                success: false,
                message: '服务器配置错误'
            }), {
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }
        
        const queryUrl = `${supabaseUrl}/rest/v1/dynasties?select=name,poem_count&order=poem_count.desc`;
        logger.supabase(MODULE, '查询朝代', queryUrl);
        
        const response = await fetch(queryUrl, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            logger.error(MODULE, `❌ 查询失败: ${response.status}`, errorText);
            return await fallbackQuery(supabaseUrl, supabaseKey);
        }
        
        const data = await response.json();
        
        const result = data.map(item => ({
            dynasty: item.name,
            count: item.poem_count
        }));
        
        logger.info(MODULE, `✅ 获取到 ${result.length} 个朝代`);
        
        return new Response(JSON.stringify({
            success: true,
            data: result,
            total: result.length,
            source: 'dynasties_table'
        }), {
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
        
    } catch (error) {
        logger.errorWithStack(MODULE, error);
        return new Response(JSON.stringify({
            success: false,
            message: error.message || '服务器错误'
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
}

async function fallbackQuery(supabaseUrl, supabaseKey) {
    try {
        logger.warn('get-dynasties', '⚠️ dynasties 表查询失败，降级到 poems 表');
        
        const queryUrl = `${supabaseUrl}/rest/v1/poems?select=dynasty`;
        const response = await fetch(queryUrl, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });
        
        if (!response.ok) {
            throw new Error('降级查询失败');
        }
        
        const data = await response.json();
        
        const dynastyMap = new Map();
        data.forEach(item => {
            if (item.dynasty && item.dynasty.trim()) {
                const d = item.dynasty.trim();
                dynastyMap.set(d, (dynastyMap.get(d) || 0) + 1);
            }
        });
        
        const result = Array.from(dynastyMap.entries())
            .map(([dynasty, count]) => ({ dynasty, count }))
            .sort((a, b) => b.count - a.count);
        
        logger.info('get-dynasties', `✅ 降级查询获取到 ${result.length} 个朝代`);
        
        return new Response(JSON.stringify({
            success: true,
            data: result,
            total: result.length,
            source: 'fallback_poems_table'
        }), {
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    } catch (e) {
        logger.error('get-dynasties', '❌ 降级查询失败', e);
        return new Response(JSON.stringify({
            success: false,
            message: '查询失败',
            data: []
        }), {
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
}