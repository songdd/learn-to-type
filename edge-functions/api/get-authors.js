// edge-functions/api/get-authors.js - 作者列表

import logger from '../utils/logger.js';

const MODULE = 'get-authors';

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
        const url = new URL(request.url);
        const dynasty = url.searchParams.get('dynasty');
        
        logger.info(MODULE, `📋 查询作者${dynasty && dynasty !== 'all' ? '（' + dynasty + '朝）' : '（全部）'}`);
        
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
        
        let queryUrl = `${supabaseUrl}/rest/v1/authors?select=name,dynasty_name,poem_count&order=poem_count.desc&limit=500`;
        
        if (dynasty && dynasty !== 'all') {
            queryUrl = `${supabaseUrl}/rest/v1/authors?select=name,dynasty_name,poem_count&dynasty_name=eq.${encodeURIComponent(dynasty)}&order=poem_count.desc&limit=500`;
        }
        
        logger.supabase(MODULE, '查询作者', queryUrl);
        
        const response = await fetch(queryUrl, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            logger.error(MODULE, `❌ 查询失败: ${response.status}`, errorText);
            return await fallbackQuery(supabaseUrl, supabaseKey, dynasty);
        }
        
        const data = await response.json();
        
        const result = data.map(item => ({
            author: item.name,
            count: item.poem_count
        }));
        
        logger.info(MODULE, `✅ 获取到 ${result.length} 位作者`);
        
        return new Response(JSON.stringify({
            success: true,
            data: result,
            total: result.length,
            dynasty: dynasty || 'all',
            source: 'authors_table'
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

async function fallbackQuery(supabaseUrl, supabaseKey, dynasty) {
    try {
        logger.warn('get-authors', '⚠️ authors 表查询失败，降级到 poems 表');
        
        let queryUrl = `${supabaseUrl}/rest/v1/poems?select=author,dynasty`;
        
        if (dynasty && dynasty !== 'all') {
            queryUrl += `&dynasty=eq.${encodeURIComponent(dynasty)}`;
        }
        
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
        
        const authorMap = new Map();
        data.forEach(item => {
            if (item.author && item.author.trim()) {
                const a = item.author.trim();
                authorMap.set(a, (authorMap.get(a) || 0) + 1);
            }
        });
        
        const result = Array.from(authorMap.entries())
            .map(([author, count]) => ({ author, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 500);
        
        logger.info('get-authors', `✅ 降级查询获取到 ${result.length} 位作者`);
        
        return new Response(JSON.stringify({
            success: true,
            data: result,
            total: result.length,
            dynasty: dynasty || 'all',
            source: 'fallback_poems_table'
        }), {
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    } catch (e) {
        logger.error('get-authors', '❌ 降级查询失败', e);
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