export async function onRequest({ request, env }) {
    // 处理 CORS
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            }
        })
    }
    
    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ success: false, message: '请使用 POST 请求' }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        })
    }
    
    try {
        const { code, name } = await request.json()
        
        if (!code || !name) {
            return new Response(JSON.stringify({ success: false, message: '缺少必要参数' }), {
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            })
        }
        
        const supabaseUrl = env.SUPABASE_URL
        const supabaseKey = env.SUPABASE_SERVICE_KEY
        
        // 插入邀请码
        const insertUrl = `${supabaseUrl}/rest/v1/invites`
        const response = await fetch(insertUrl, {
            method: 'POST',
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ code, name, used: false })
        })
        
        if (!response.ok) {
            const error = await response.text()
            console.error('插入失败:', error)
            return new Response(JSON.stringify({ success: false, message: '邀请码可能已存在' }), {
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            })
        }
        
        return new Response(JSON.stringify({ success: true, message: '入库成功' }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        })
        
    } catch (error) {
        console.error('入库错误:', error)
        return new Response(JSON.stringify({ success: false, message: '服务器错误' }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        })
    }
}