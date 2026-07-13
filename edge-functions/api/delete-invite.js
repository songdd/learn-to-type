// edge-functions/api/delete-invite.js - 删除邀请码

import logger from '../utils/logger.js';

const MODULE = 'delete-invite';

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
        
        const { id } = bodyData;
        logger.info(MODULE, `🗑️ 删除邀请码 ID: ${id}`);
        
        if (!id) {
            logger.warn(MODULE, '❌ 缺少 ID 参数');
            return new Response(JSON.stringify({ success: false, message: '缺少参数' }), {
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
        
        const deleteUrl = `${supabaseUrl}/rest/v1/invites?id=eq.${id}`;
        logger.supabase(MODULE, '删除', deleteUrl);
        
        const response = await fetch(deleteUrl, {
            method: 'DELETE',
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });
        
        if (!response.ok) {
            logger.error(MODULE, `❌ 删除失败: ${response.status}`);
            throw new Error('删除失败');
        }
        
        logger.info(MODULE, `✅ 邀请码 ID ${id} 删除成功`);
        return new Response(JSON.stringify({ success: true, message: '删除成功' }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
        
    } catch (error) {
        logger.errorWithStack(MODULE, error);
        return new Response(JSON.stringify({ success: false, message: '服务器错误' }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }
}