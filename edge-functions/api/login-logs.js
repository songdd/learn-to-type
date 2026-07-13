// edge-functions/api/login-logs.js - 登录记录列表（分页+筛选）

import logger from '../utils/logger.js';

const MODULE = 'login-logs';

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
        const page = parseInt(url.searchParams.get('page')) || 1;
        const pageSize = parseInt(url.searchParams.get('pageSize')) || 20;
        const offset = (page - 1) * pageSize;
        
        const userName = url.searchParams.get('userName') || '';
        const inviteCode = url.searchParams.get('inviteCode') || '';
        const startDate = url.searchParams.get('startDate') || '';
        const endDate = url.searchParams.get('endDate') || '';
        
        logger.info(MODULE, `📋 查询登录记录`, {
            page,
            pageSize,
            offset,
            userName: userName || '(无)',
            inviteCode: inviteCode || '(无)',
            startDate: startDate || '(无)',
            endDate: endDate || '(无)'
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
                headers: { 
                    'Content-Type': 'application/json', 
                    'Access-Control-Allow-Origin': '*' 
                }
            });
        }
        
        const filters = [];
        
        if (userName && userName.trim() !== '') {
            filters.push(`user_name=ilike.*${encodeURIComponent(userName.trim())}*`);
        }
        if (inviteCode && inviteCode.trim() !== '') {
            filters.push(`invite_code=ilike.*${encodeURIComponent(inviteCode.trim())}*`);
        }
        if (startDate && startDate.trim() !== '') {
            const start = new Date(startDate.trim());
            if (!isNaN(start.getTime())) {
                filters.push(`login_time=gte.${start.toISOString()}`);
            }
        }
        if (endDate && endDate.trim() !== '') {
            const end = new Date(endDate.trim());
            if (!isNaN(end.getTime())) {
                end.setHours(23, 59, 59, 999);
                filters.push(`login_time=lte.${end.toISOString()}`);
            }
        }
        
        const filterString = filters.length > 0 ? '&' + filters.join('&') : '';
        
        const dataUrl = `${supabaseUrl}/rest/v1/login_logs?select=id,user_name,invite_code,login_time,ip_address,user_agent&order=login_time.desc&limit=${pageSize}&offset=${offset}${filterString}`;
        logger.supabase(MODULE, '查询数据', dataUrl);
        
        const response = await fetch(dataUrl, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            logger.error(MODULE, `❌ 查询失败: ${response.status}`, errorText);
            return new Response(JSON.stringify({
                success: false,
                message: `查询失败: ${response.status}`,
                data: [],
                total: 0,
                totalPages: 0
            }), {
                headers: { 
                    'Content-Type': 'application/json', 
                    'Access-Control-Allow-Origin': '*' 
                }
            });
        }
        
        const data = await response.json();
        
        const countUrl = `${supabaseUrl}/rest/v1/login_logs?select=id${filterString}`;
        logger.supabase(MODULE, '查询总数', countUrl);
        
        const countResponse = await fetch(countUrl, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });
        
        let total = data.length;
        if (countResponse.ok) {
            const countData = await countResponse.json();
            total = countData.length;
        }
        
        const totalPages = Math.ceil(total / pageSize);
        logger.info(MODULE, `✅ 返回 ${data.length} 条记录，共 ${total} 条`);
        
        return new Response(JSON.stringify({
            success: true,
            data: data,
            total: total,
            page: page,
            pageSize: pageSize,
            totalPages: totalPages
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
            message: error.message || '查询失败，请稍后重试',
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