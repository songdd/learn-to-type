// edge-functions/api/login-log.js - 记录登录日志

export async function onRequest(context) {
    const { request, env } = context;
    
    // 处理 CORS 预检请求
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            }
        })
    }
    
    // 只接受 POST 请求
    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ 
            success: false, 
            message: '请使用 POST 请求' 
        }), {
            status: 405,
            headers: { 
                'Content-Type': 'application/json', 
                'Access-Control-Allow-Origin': '*' 
            }
        })
    }
    
    try {
        const { user_name, invite_code, user_agent } = await request.json()
        
        // 验证必要参数
        if (!user_name || !invite_code) {
            return new Response(JSON.stringify({ 
                success: false, 
                message: '缺少必要参数' 
            }), {
                headers: { 
                    'Content-Type': 'application/json', 
                    'Access-Control-Allow-Origin': '*' 
                }
            })
        }
        
        // 获取环境变量
        const supabaseUrl = env.SUPABASE_URL
        const supabaseKey = env.SUPABASE_SERVICE_KEY
        
        if (!supabaseUrl || !supabaseKey) {
            console.error('环境变量未配置')
            return new Response(JSON.stringify({ 
                success: false, 
                message: '服务器配置错误，请联系管理员' 
            }), {
                headers: { 
                    'Content-Type': 'application/json', 
                    'Access-Control-Allow-Origin': '*' 
                }
            })
        }
        
        // 获取客户端 IP
        const ip = request.headers.get('x-forwarded-for') || 
                   request.headers.get('cf-connecting-ip') || 
                   request.headers.get('x-real-ip') ||
                   'unknown'
        
        // 生成 session_id
        let sessionId
        try {
            sessionId = crypto.randomUUID()
        } catch (e) {
            // 降级方案
            sessionId = Date.now().toString(36) + Math.random().toString(36).substring(2, 15)
        }
        
        // 插入登录日志
        const insertUrl = `${supabaseUrl}/rest/v1/login_logs`
        
        const response = await fetch(insertUrl, {
            method: 'POST',
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_name: user_name,
                invite_code: invite_code,
                login_time: new Date().toISOString(),
                ip_address: ip,
                user_agent: user_agent || null,
                session_id: sessionId
            })
        })
        
        if (!response.ok) {
            const errorText = await response.text()
            console.error('Supabase 插入失败:', response.status, errorText)
            return new Response(JSON.stringify({ 
                success: false, 
                message: '记录登录日志失败' 
            }), {
                headers: { 
                    'Content-Type': 'application/json', 
                    'Access-Control-Allow-Origin': '*' 
                }
            })
        }
        
        const data = await response.json()
        
        return new Response(JSON.stringify({ 
            success: true, 
            message: '登录记录成功',
            data: data 
        }), {
            headers: { 
                'Content-Type': 'application/json', 
                'Access-Control-Allow-Origin': '*' 
            }
        })
        
    } catch (error) {
        console.error('登录日志记录错误:', error)
        return new Response(JSON.stringify({ 
            success: false, 
            message: '服务器错误，请稍后重试' 
        }), {
            status: 500,
            headers: { 
                'Content-Type': 'application/json', 
                'Access-Control-Allow-Origin': '*' 
            }
        })
    }
}