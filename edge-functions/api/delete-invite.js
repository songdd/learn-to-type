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
        const { id } = await request.json()
        
        if (!id) {
            return new Response(JSON.stringify({ success: false, message: '缺少参数' }), {
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            })
        }
        
        const supabaseUrl = env.SUPABASE_URL
        const supabaseKey = env.SUPABASE_SERVICE_KEY
        
        const deleteUrl = `${supabaseUrl}/rest/v1/invites?id=eq.${id}`
        
        const response = await fetch(deleteUrl, {
            method: 'DELETE',
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        })
        
        if (!response.ok) {
            throw new Error('删除失败')
        }
        
        return new Response(JSON.stringify({ success: true, message: '删除成功' }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        })
        
    } catch (error) {
        console.error('删除错误:', error)
        return new Response(JSON.stringify({ success: false, message: '服务器错误' }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        })
    }
}