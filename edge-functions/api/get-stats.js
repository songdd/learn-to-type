// functions/get-stats.js - 统计信息

export async function onRequest({ request, env }) {
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            }
        })
    }
    
    try {
        const supabaseUrl = env.SUPABASE_URL;
        const supabaseKey = env.SUPABASE_SERVICE_KEY;
        
        // 查询所有数据用于统计（只取 used 字段）
        const queryUrl = `${supabaseUrl}/rest/v1/invites?select=used`;
        
        const response = await fetch(queryUrl, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });
        
        const data = await response.json();
        const total = data.length;
        const used = data.filter(item => item.used).length;
        const unused = total - used;
        
        return new Response(JSON.stringify({
            success: true,
            total: total,
            used: used,
            unused: unused
        }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
        
    } catch (error) {
        console.error('统计错误:', error);
        return new Response(JSON.stringify({ success: false, total: 0, used: 0, unused: 0 }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }
}