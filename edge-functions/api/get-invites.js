// edge-functions/api/get-invites.js - 邀请码列表（分页+筛选）

import logger from '../utils/logger.js';

const MODULE = 'get-invites';

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
        const url = new URL(request.url);
        const page = parseInt(url.searchParams.get('page')) || 1;
        const pageSize = parseInt(url.searchParams.get('pageSize')) || 20;
        const offset = (page - 1) * pageSize;
        
        const filterName = url.searchParams.get('name') || '';
        const filterUsed = url.searchParams.get('used');
        
        logger.info(MODULE, `📋 查询邀请码`, {
            page,
            pageSize,
            offset,
            filterName: filterName || '(无)',
            filterUsed: filterUsed || '(全部)'
        });
        
        logger.env(MODULE, env);
        
        const supabaseUrl = env.SUPABASE_URL;
        const supabaseKey = env.SUPABASE_SERVICE_KEY;
        
        if (!supabaseUrl || !supabaseKey) {
            logger.error(MODULE, '❌ 环境变量未配置');
            return new Response(JSON.stringify({
                success: false,
                message: '服务器配置错误',
                data: [],
                total: 0,
                totalPages: 0
            }), {
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }
        
        let filters = [];
        if (filterName) {
            filters.push(`name=ilike.*${encodeURIComponent(filterName)}*`);
        }
        if (filterUsed !== null) {
            filters.push(`used=eq.${filterUsed}`);
        }
        
        const filterStr = filters.length > 0 ? `&${filters.join('&')}` : '';
        
        const countUrl = `${supabaseUrl}/rest/v1/invites?select=id${filterStr}`;
        logger.supabase(MODULE, '查询总数', countUrl);
        
        const countResponse = await fetch(countUrl, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });
        
        const allData = await countResponse.json();
        const total = allData.length;
        const totalPages = Math.ceil(total / pageSize);
        
        logger.debug(MODULE, `📊 总数: ${total}, 总页数: ${totalPages}`);
        
        const queryUrl = `${supabaseUrl}/rest/v1/invites?select=*&order=id.desc&limit=${pageSize}&offset=${offset}${filterStr}`;
        logger.supabase(MODULE, '查询分页数据', queryUrl);
        
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
        logger.info(MODULE, `✅ 返回 ${data.length} 条记录`);
        
        return new Response(JSON.stringify({
            success: true,
            data: data,
            total: total,
            page: page,
            pageSize: pageSize,
            totalPages: totalPages
        }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
        
    } catch (error) {
        logger.errorWithStack(MODULE, error);
        return new Response(JSON.stringify({
            success: false,
            message: '服务器错误',
            data: [],
            total: 0,
            totalPages: 0
        }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }
}