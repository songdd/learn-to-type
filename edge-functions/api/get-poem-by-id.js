// edge-functions/api/get-poem-by-id.js - 单首诗词详情

import logger from '../utils/logger.js';

const MODULE = 'get-poem-by-id';

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
        const id = url.searchParams.get('id');
        
        if (!id) {
            logger.warn(MODULE, '❌ 缺少 id 参数');
            return new Response(JSON.stringify({
                success: false,
                message: '缺少 id 参数'
            }), {
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }
        
        logger.info(MODULE, `📋 查询诗词 ID: ${id}`);
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
        
        const queryUrl = `${supabaseUrl}/rest/v1/poems?select=id,title,author,category,dynasty,content&id=eq.${id}`;
        logger.supabase(MODULE, '查询诗词', queryUrl);
        
        const response = await fetch(queryUrl, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });
        
        if (!response.ok) {
            logger.error(MODULE, `❌ 查询失败: ${response.status}`);
            throw new Error(`查询失败: ${response.status}`);
        }
        
        const data = await response.json();
        logger.debug(MODULE, `📊 查询结果`, data);
        
        if (!data || data.length === 0) {
            logger.warn(MODULE, `❌ 未找到诗词 ID: ${id}`);
            return new Response(JSON.stringify({
                success: false,
                message: '未找到该诗词'
            }), {
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }
        
        logger.info(MODULE, `✅ 找到诗词: ${data[0].title}`);
        
        return new Response(JSON.stringify({
            success: true,
            data: data[0]
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