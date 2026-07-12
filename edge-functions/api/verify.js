// edge-functions/api/verify.js - 邀请码验证
// ★★★ 支持已使用的邀请码重复登录 ★★★

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
        const { code } = await request.json()
        
        // 验证邀请码是否为空
        if (!code || code.trim() === '') {
            return new Response(JSON.stringify({ 
                success: false, 
                message: '请输入邀请码' 
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
        
        const trimmedCode = code.trim()
        
        // ★★★ 1. 查询邀请码（不限制 used 状态） ★★★
        const queryUrl = `${supabaseUrl}/rest/v1/invites?code=eq.${encodeURIComponent(trimmedCode)}&select=name,used`
        
        const queryResponse = await fetch(queryUrl, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        })
        
        if (!queryResponse.ok) {
            console.error('Supabase 查询失败:', queryResponse.status)
            return new Response(JSON.stringify({ 
                success: false, 
                message: '验证服务异常，请稍后重试' 
            }), {
                headers: { 
                    'Content-Type': 'application/json', 
                    'Access-Control-Allow-Origin': '*' 
                }
            })
        }
        
        const data = await queryResponse.json()
        
        // 邀请码不存在
        if (!data || data.length === 0) {
            return new Response(JSON.stringify({ 
                success: false, 
                message: '邀请码无效，请检查输入' 
            }), {
                headers: { 
                    'Content-Type': 'application/json', 
                    'Access-Control-Allow-Origin': '*' 
                }
            })
        }
        
        const record = data[0]
        
        // ★★★ 2. 如果是首次使用（未被标记），则标记为已使用 ★★★
        if (!record.used) {
            try {
                const updateUrl = `${supabaseUrl}/rest/v1/invites?code=eq.${encodeURIComponent(trimmedCode)}`
                
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
                })
                console.log(`✅ 邀请码 ${trimmedCode} 已标记为已使用`)
            } catch (updateError) {
                // 更新失败不影响登录，只记录日志
                console.warn('标记邀请码失败:', updateError)
            }
        } else {
            console.log(`ℹ️ 邀请码 ${trimmedCode} 已被使用，允许重复登录`)
        }
        
        // ★★★ 3. 返回成功（无论是否已使用） ★★★
        return new Response(JSON.stringify({ 
            success: true, 
            name: record.name,
            used: record.used,
            isReturning: record.used === true,
            message: record.used ? '欢迎回来！' : '首次登录成功！'
        }), {
            headers: { 
                'Content-Type': 'application/json', 
                'Access-Control-Allow-Origin': '*' 
            }
        })
        
    } catch (error) {
        console.error('验证错误:', error)
        return new Response(JSON.stringify({ 
            success: false, 
            message: '服务器错误，请稍后重试' 
        }), {
            headers: { 
                'Content-Type': 'application/json', 
                'Access-Control-Allow-Origin': '*' 
            }
        })
    }
}