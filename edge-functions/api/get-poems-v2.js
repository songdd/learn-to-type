// edge-functions/api/get-poems-v2.js - 诗词列表（分页+筛选）

import logger from '../utils/logger.js';

const MODULE = 'get-poems-v2';

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
        const dynasty = url.searchParams.get('dynasty') || '';
        const author = url.searchParams.get('author') || '';
        const search = url.searchParams.get('search') || '';
        const page = parseInt(url.searchParams.get('page')) || 1;
        const pageSize = parseInt(url.searchParams.get('pageSize')) || 12;
        const offset = (page - 1) * pageSize;
        
        logger.info(MODULE, `📋 查询诗词`, {
            dynasty: dynasty || '(全部)',
            author: author || '(全部)',
            search: search || '(无)',
            page,
            pageSize,
            offset
        });
        
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
        
        let filters = [];
        if (dynasty && dynasty !== 'all') {
            filters.push(`dynasty=eq.${encodeURIComponent(dynasty)}`);
        }
        if (author && author !== 'all') {
            filters.push(`author=eq.${encodeURIComponent(author)}`);
        }
        if (search && search.trim() !== '') {
            const searchTerm = encodeURIComponent(search.trim());
            filters.push(`or=(title.ilike.*${searchTerm}*,author.ilike.*${searchTerm}*,content.ilike.*${searchTerm}*)`);
        }
        
        const filterStr = filters.length > 0 ? '&' + filters.join('&') : '';
        
        // 获取总数
        let total = 0;
        
        if (search && search.trim() !== '') {
            try {
                const countUrl = `${supabaseUrl}/rest/v1/poems?select=id${filterStr}&limit=0`;
                const countResponse = await fetch(countUrl, {
                    headers: {
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${supabaseKey}`,
                        'Prefer': 'count=exact'
                    }
                });
                
                if (countResponse.ok) {
                    const contentRange = countResponse.headers.get('Content-Range');
                    if (contentRange) {
                        const match = contentRange.match(/items \d+-\d+\/(\d+)/);
                        if (match) {
                            total = parseInt(match[1]);
                        }
                    }
                    if (total === 0) {
                        const countData = await countResponse.json();
                        total = Array.isArray(countData) ? countData.length : 0;
                    }
                }
                logger.debug(MODULE, `📊 搜索总数: ${total}`);
            } catch (e) {
                logger.warn(MODULE, '⚠️ 搜索计数失败', e.message);
                total = 0;
            }
        } else if (author && author !== 'all') {
            try {
                const queryUrl = `${supabaseUrl}/rest/v1/authors?select=poem_count&name=eq.${encodeURIComponent(author)}`;
                const response = await fetch(queryUrl, {
                    headers: {
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${supabaseKey}`
                    }
                });
                if (response.ok) {
                    const data = await response.json();
                    total = data[0]?.poem_count || 0;
                    logger.debug(MODULE, `📊 作者 ${author} 总数: ${total}`);
                }
            } catch (e) {
                logger.warn(MODULE, '⚠️ 获取作者总数失败', e.message);
                total = 0;
            }
        } else if (dynasty && dynasty !== 'all') {
            try {
                const queryUrl = `${supabaseUrl}/rest/v1/dynasties?select=poem_count&name=eq.${encodeURIComponent(dynasty)}`;
                const response = await fetch(queryUrl, {
                    headers: {
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${supabaseKey}`
                    }
                });
                if (response.ok) {
                    const data = await response.json();
                    total = data[0]?.poem_count || 0;
                    logger.debug(MODULE, `📊 朝代 ${dynasty} 总数: ${total}`);
                }
            } catch (e) {
                logger.warn(MODULE, '⚠️ 获取朝代总数失败', e.message);
                total = 0;
            }
        } else {
            try {
                const queryUrl = `${supabaseUrl}/rest/v1/dynasties?select=poem_count`;
                const response = await fetch(queryUrl, {
                    headers: {
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${supabaseKey}`
                    }
                });
                if (response.ok) {
                    const data = await response.json();
                    total = data.reduce((sum, item) => sum + (item.poem_count || 0), 0);
                    logger.debug(MODULE, `📊 全部总数: ${total}`);
                }
            } catch (e) {
                logger.warn(MODULE, '⚠️ 获取全部总数失败', e.message);
                total = 0;
            }
        }
        
        const totalPages = Math.ceil(total / pageSize);
        
        const queryUrl = `${supabaseUrl}/rest/v1/poems?select=id,title,author,category,dynasty,content&order=id.asc&limit=${pageSize}&offset=${offset}${filterStr}`;
        logger.supabase(MODULE, '查询分页数据', queryUrl);
        
        const response = await fetch(queryUrl, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            logger.error(MODULE, `❌ 查询失败: ${response.status}`, errorText);
            throw new Error(`查询数据失败: ${response.status}`);
        }
        
        const data = await response.json();
        logger.info(MODULE, `✅ 返回 ${data.length} 条数据 (第${page}页，共${totalPages}页)`);
        
        return new Response(JSON.stringify({
            success: true,
            data: data,
            total: total,
            page: page,
            pageSize: pageSize,
            totalPages: totalPages,
            filters: { dynasty, author, search }
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
            message: error.message || '服务器错误',
            data: [],
            total: 0,
            totalPages: 0
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
}