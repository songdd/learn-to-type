// edge-functions/api/login-stats.js - 登录统计概览

import logger from '../utils/logger.js';

const MODULE = 'login-stats';

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
                message: '服务器配置错误，请联系管理员' 
            }), {
                headers: { 
                    'Content-Type': 'application/json', 
                    'Access-Control-Allow-Origin': '*' 
                }
            });
        }
        
        // 1. 总登录次数
        const totalUrl = `${supabaseUrl}/rest/v1/login_logs?select=id`;
        logger.supabase(MODULE, '查询总登录数', totalUrl);
        
        const totalResponse = await fetch(totalUrl, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });
        
        if (!totalResponse.ok) {
            throw new Error('查询总登录数失败');
        }
        
        const totalData = await totalResponse.json();
        const totalLogins = totalData.length;
        
        // 2. 今日登录次数
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString();
        
        const todayUrl = `${supabaseUrl}/rest/v1/login_logs?select=id&login_time=gte.${todayStr}`;
        logger.supabase(MODULE, '查询今日登录数', todayUrl);
        
        const todayResponse = await fetch(todayUrl, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });
        
        if (!todayResponse.ok) {
            throw new Error('查询今日登录数失败');
        }
        
        const todayData = await todayResponse.json();
        const todayLogins = todayData.length;
        
        // 3. 所有用户列表
        const usersUrl = `${supabaseUrl}/rest/v1/login_logs?select=user_name`;
        logger.supabase(MODULE, '查询用户列表', usersUrl);
        
        const usersResponse = await fetch(usersUrl, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });
        
        if (!usersResponse.ok) {
            throw new Error('查询用户列表失败');
        }
        
        const usersData = await usersResponse.json();
        const uniqueUsers = new Set(usersData.map(u => u.user_name));
        const activeUsers = uniqueUsers.size;
        
        // 4. 今日活跃用户
        const todayUsersUrl = `${supabaseUrl}/rest/v1/login_logs?select=user_name&login_time=gte.${todayStr}`;
        logger.supabase(MODULE, '查询今日活跃用户', todayUsersUrl);
        
        const todayUsersResponse = await fetch(todayUsersUrl, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });
        
        if (!todayUsersResponse.ok) {
            throw new Error('查询今日活跃用户失败');
        }
        
        const todayUsersData = await todayUsersResponse.json();
        const todayUniqueUsers = new Set(todayUsersData.map(u => u.user_name));
        const todayActiveUsers = todayUniqueUsers.size;
        
        // 5. 用户登录排行
        const userCountMap = {};
        usersData.forEach(u => {
            userCountMap[u.user_name] = (userCountMap[u.user_name] || 0) + 1;
        });
        
        const userRanking = Object.entries(userCountMap)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
        
        logger.info(MODULE, `📊 统计数据`, {
            totalLogins,
            todayLogins,
            activeUsers,
            todayActiveUsers,
            topUsers: userRanking.length
        });
        
        return new Response(JSON.stringify({
            success: true,
            data: {
                totalLogins,
                todayLogins,
                activeUsers,
                todayActiveUsers,
                userRanking
            }
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
            message: '获取统计失败，请稍后重试' 
        }), {
            status: 500,
            headers: { 
                'Content-Type': 'application/json', 
                'Access-Control-Allow-Origin': '*' 
            }
        });
    }
}