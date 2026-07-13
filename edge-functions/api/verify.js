// edge-functions/api/verify.js - 邀请码验证

import logger from '../utils/logger.js';

const MODULE = 'verify';

export async function onRequest(context) {
    const { request, env } = context;
    
    // 初始化 logger
    logger.init(env);
    logger.request(MODULE, request);
    
    // CORS 预检
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
            logger.warn(MODULE, '❌ 请求体为空');
            return new Response(JSON.stringify({ 
                success: false, 
                message: '请输入邀请码' 
            }), {
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
            logger.error(MODULE, '❌ JSON 解析失败', parseError.message);
            return new Response(JSON.stringify({ 
                success: false, 
                message: '请求格式错误' 
            }), {
                headers: { 
                    'Content-Type': 'application/json', 
                    'Access-Control-Allow-Origin': '*' 
                }
            });
        }
        
        const { code } = bodyData;
        logger.info(MODULE, `🔑 验证邀请码: ${code || '(空)'}`);
        
        if (!code || code.trim() === '') {
            logger.warn(MODULE, '❌ 邀请码为空');
            return new Response(JSON.stringify({ 
                success: false, 
                message: '请输入邀请码' 
            }), {
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
                headers: { 
                    'Content-Type': 'application/json', 
                    'Access-Control-Allow-Origin': '*' 
                }
            });
        }
        
        const trimmedCode = code.trim();
        
        const queryUrl = `${supabaseUrl}/rest/v1/invites?code=eq.${encodeURIComponent(trimmedCode)}&select=name,used`;
        logger.supabase(MODULE, '查询', queryUrl);
        
        const queryResponse = await fetch(queryUrl, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });
        
        if (!queryResponse.ok) {
            logger.error(MODULE, `❌ Supabase 查询失败: ${queryResponse.status}`);
            return new Response(JSON.stringify({ 
                success: false, 
                message: '验证服务异常，请稍后重试' 
            }), {
                headers: { 
                    'Content-Type': 'application/json', 
                    'Access-Control-Allow-Origin': '*' 
                }
            });
        }
        
        const data = await queryResponse.json();
        logger.debug(MODULE, `📊 查询结果`, data);
        
        if (!data || data.length === 0) {
            logger.warn(MODULE, `❌ 邀请码无效: ${trimmedCode}`);
            return new Response(JSON.stringify({ 
                success: false, 
                message: '邀请码无效，请检查输入' 
            }), {
                headers: { 
                    'Content-Type': 'application/json', 
                    'Access-Control-Allow-Origin': '*' 
                }
            });
        }
        
        const record = data[0];
        logger.info(MODULE, `✅ 邀请码有效: ${trimmedCode}`, {
            name: record.name,
            used: record.used
        });
        
        if (!record.used) {
            try {
                const updateUrl = `${supabaseUrl}/rest/v1/invites?code=eq.${encodeURIComponent(trimmedCode)}`;
                logger.supabase(MODULE, '更新', updateUrl);
                
                await fetch(updateUrl, {
                    method: 'PATCH',
                    headers: {
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${supabaseKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ 
                        used: true, 
                        used_at: new Date().toISOString() 
                    })
                });
                logger.info(MODULE, `✅ 邀请码 ${trimmedCode} 已标记为已使用`);
            } catch (updateError) {
                logger.warn(MODULE, '⚠️ 标记邀请码失败', updateError);
            }
        } else {
            logger.info(MODULE, `ℹ️ 邀请码 ${trimmedCode} 已被使用，允许重复登录`);
        }
        
        const responseData = {
            success: true,
            name: record.name,
            used: record.used,
            isReturning: record.used === true,
            message: record.used ? '欢迎回来！' : '首次登录成功！'
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
            message: '服务器错误，请稍后重试' 
        }), {
            headers: { 
                'Content-Type': 'application/json', 
                'Access-Control-Allow-Origin': '*' 
            }
        });
    }
}