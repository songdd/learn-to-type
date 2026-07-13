// edge-functions/api/add-invite.js - 添加邀请码

import logger from '../utils/logger.js';

const MODULE = 'add-invite';

export async function onRequest({ request, env }) {
    logger.init(env);
    logger.request(MODULE, request);
    
    if (request.method === 'OPTIONS') {
        logger.debug(MODULE, 'CORS 预检请求');
        return new Response(null, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            }
        });
    }
    
    if (request.method !== 'POST') {
        logger.warn(MODULE, '❌ 非 POST 请求', { method: request.method });
        return new Response(JSON.stringify({ success: false, message: '请使用 POST 请求' }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }
    
    try {
        const rawBody = await request.text();
        logger.requestBody(MODULE, rawBody);
        
        if (!rawBody || rawBody.trim() === '') {
            logger.warn(MODULE, '❌ 请求体为空');
            return new Response(JSON.stringify({ success: false, message: '缺少必要参数' }), {
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }
        
        let bodyData;
        try {
            bodyData = JSON.parse(rawBody);
            logger.debug(MODULE, '✅ JSON 解析成功', bodyData);
        } catch (parseError) {
            logger.error(MODULE, '❌ JSON 解析失败', parseError.message);
            return new Response(JSON.stringify({ success: false, message: '请求格式错误' }), {
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }
        
        const { code, name } = bodyData;
        logger.info(MODULE, `📝 添加邀请码: ${code}`, { name });
        
        if (!code || !name) {
            logger.warn(MODULE, '❌ 缺少必要参数', { code, name });
            return new Response(JSON.stringify({ success: false, message: '缺少必要参数' }), {
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }
        
        logger.env(MODULE, env);
        
        const supabaseUrl = env.SUPABASE_URL;
        const supabaseKey = env.SUPABASE_SERVICE_KEY;
        
        if (!supabaseUrl || !supabaseKey) {
            logger.error(MODULE, '❌ 环境变量未配置');
            return new Response(JSON.stringify({ success: false, message: '服务器配置错误' }), {
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }
        
        const insertUrl = `${supabaseUrl}/rest/v1/invites`;
        logger.supabase(MODULE, '插入', insertUrl, { code, name });
        
        const response = await fetch(insertUrl, {
            method: 'POST',
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ code, name, used: false })
        });
        
        if (!response.ok) {
            const error = await response.text();
            logger.error(MODULE, `❌ 插入失败: ${response.status}`, error);
            return new Response(JSON.stringify({ success: false, message: '邀请码可能已存在' }), {
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }
        
        logger.info(MODULE, `✅ 邀请码 ${code} 入库成功`);
        return new Response(JSON.stringify({ success: true, message: '入库成功' }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
        
    } catch (error) {
        logger.errorWithStack(MODULE, error);
        return new Response(JSON.stringify({ success: false, message: '服务器错误' }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }
}