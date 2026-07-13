// edge-functions/api/get-stats.js - 邀请码统计

import logger from '../utils/logger.js';

const MODULE = 'get-stats';

export async function onRequest({ request, env }) {
    logger.init(env);
    logger.request(MODULE, request);
    
    if (request.method === 'OPTIONS') {
        logger.debug(MODULE, 'CORS 预检请求');
        return new Response(null, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            }
        });
    }
    
    try {
        logger.env(MODULE, env);
        
        const supabaseUrl = env.SUPABASE_URL;
        const supabaseKey = env.SUPABASE_SERVICE_KEY;
        
        if (!supabaseUrl || !supabaseKey) {
            logger.error(MODULE, '❌ 环境变量未配置');
            return new Response(JSON.stringify({ success: false, total: 0, used: 0, unused: 0 }), {
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }
        
        const queryUrl = `${supabaseUrl}/rest/v1/invites?select=used`;
        logger.supabase(MODULE, '查询统计', queryUrl);
        
        const response = await fetch(queryUrl, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });
        
        if (!response.ok) {
            logger.error(MODULE, `❌ 查询失败: ${response.status}`);
            throw new Error('查询失败');
        }
        
        const data = await response.json();
        const total = data.length;
        const used = data.filter(item => item.used).length;
        const unused = total - used;
        
        logger.info(MODULE, `📊 统计数据`, { total, used, unused });
        
        return new Response(JSON.stringify({
            success: true,
            total: total,
            used: used,
            unused: unused
        }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
        
    } catch (error) {
        logger.errorWithStack(MODULE, error);
        return new Response(JSON.stringify({ success: false, total: 0, used: 0, unused: 0 }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }
}