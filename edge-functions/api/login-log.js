// edge-functions/api/login-log.js - 记录登录日志

import logger from '../utils/logger.js';

const MODULE = 'login-log';

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
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            }
        });
    }
    
    if (request.method !== 'POST') {
        logger.warn(MODULE, '❌ 非 POST 请求', { method: request.method });
        return new Response(JSON.stringify({ 
            success: false, 
            message: '请使用 POST 请求' 
        }), {
            status: 405,
            headers: { 
                'Content-Type': 'application/json', 
                'Access-Control-Allow-Origin': '*' 
            }
        });
    }
    
    try {
        const rawBody = await request.text();
        logger.requestBody(MODULE, rawBody);
        
        if (!rawBody || rawBody.trim() === '') {
            logger.error(MODULE, '❌ 请求体为空');
            return new Response(JSON.stringify({ 
                success: false, 
                message: '请求体为空，请发送有效的 JSON' 
            }), {
                status: 400,
                headers: { 
                    'Content-Type': 'application/json', 
                    'Access-Control-Allow-Origin': '*' 
                }
            });
        }
        
        let bodyData;
        try {
            bodyData = JSON.parse(rawBody);
            logger.debug(MODULE, '✅ JSON 解析成功', bodyData);
        } catch (parseError) {
            logger.error(MODULE, '❌ JSON 解析失败', {
                error: parseError.message,
                raw: rawBody.substring(0, 200)
            });
            return new Response(JSON.stringify({
                success: false,
                message: '请求体格式错误，请发送有效的 JSON',
                raw_preview: rawBody.substring(0, 100)
            }), {
                status: 400,
                headers: { 
                    'Content-Type': 'application/json', 
                    'Access-Control-Allow-Origin': '*' 
                }
            });
        }
        
        const { user_name, invite_code, user_agent } = bodyData;
        
        logger.info(MODULE, `👤 用户: ${user_name || '(空)'}`, {
            invite_code: invite_code || '(空)',
            user_agent: user_agent ? `${user_agent.substring(0, 50)}...` : '(空)'
        });
        
        if (!user_name || !invite_code) {
            logger.error(MODULE, '❌ 缺少必要参数', { user_name, invite_code });
            return new Response(JSON.stringify({ 
                success: false, 
                message: '缺少必要参数: user_name 和 invite_code 为必填' 
            }), {
                status: 400,
                headers: { 
                    'Content-Type': 'application/json', 
                    'Access-Control-Allow-Origin': '*' 
                }
            });
        }
        
        logger.env(MODULE, env);
        
        const supabaseUrl = env.SUPABASE_URL;
        const supabaseKey = env.SUPABASE_SERVICE_KEY;
        
        if (!supabaseUrl || !supabaseKey) {
            logger.error(MODULE, '❌ 环境变量未配置');
            return new Response(JSON.stringify({ 
                success: false, 
                message: '服务器配置错误，请联系管理员' 
            }), {
                status: 500,
                headers: { 
                    'Content-Type': 'application/json', 
                    'Access-Control-Allow-Origin': '*' 
                }
            });
        }
        
        const ip = request.headers.get('x-forwarded-for') || 
                   request.headers.get('cf-connecting-ip') || 
                   request.headers.get('x-real-ip') ||
                   'unknown';
        logger.debug(MODULE, `📥 客户端 IP: ${ip}`);
        
        let sessionId;
        try {
            sessionId = crypto.randomUUID();
        } catch (e) {
            sessionId = Date.now().toString(36) + Math.random().toString(36).substring(2, 15);
        }
        logger.debug(MODULE, `🔑 session_id: ${sessionId}`);
        
        const insertUrl = `${supabaseUrl}/rest/v1/login_logs`;
        const insertBody = {
            user_name: user_name,
            invite_code: invite_code,
            login_time: new Date().toISOString(),
            ip_address: ip,
            user_agent: user_agent || null,
            session_id: sessionId
        };
        
        logger.supabase(MODULE, '插入', insertUrl, insertBody);
        
        const response = await fetch(insertUrl, {
            method: 'POST',
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(insertBody)
        });
        
        logger.debug(MODULE, `📤 Supabase 响应状态: ${response.status}`);
        
        if (!response.ok) {
            const errorText = await response.text();
            logger.error(MODULE, `❌ Supabase 插入失败: ${response.status}`, errorText);
            return new Response(JSON.stringify({ 
                success: false, 
                message: '记录登录日志失败',
                detail: errorText
            }), {
                status: response.status,
                headers: { 
                    'Content-Type': 'application/json', 
                    'Access-Control-Allow-Origin': '*' 
                }
            });
        }
        
        const responseText = await response.text();
        logger.debug(MODULE, `📤 Supabase 响应体: ${responseText || '(空)'}`);
        
        let data = null;
        if (responseText && responseText.trim() !== '') {
            try {
                data = JSON.parse(responseText);
                logger.debug(MODULE, '✅ 响应解析成功', data);
            } catch (parseError) {
                logger.warn(MODULE, '⚠️ 响应体不是 JSON，忽略', parseError.message);
                data = { inserted: true, status: response.status };
            }
        } else {
            logger.info(MODULE, '✅ 响应体为空，插入成功');
            data = { inserted: true, status: response.status };
        }
        
        const responseData = {
            success: true,
            message: '登录记录成功',
            data: data
        };
        logger.response(MODULE, 200, responseData);
        
        return new Response(JSON.stringify(responseData), {
            headers: { 
                'Content-Type': 'application/json', 
                'Access-Control-Allow-Origin': '*' 
            }
        });
        
    } catch (error) {
        logger.errorWithStack(MODULE, error);
        return new Response(JSON.stringify({ 
            success: false, 
            message: '服务器错误，请稍后重试',
            error: error.message
        }), {
            status: 500,
            headers: { 
                'Content-Type': 'application/json', 
                'Access-Control-Allow-Origin': '*' 
            }
        });
    }
}