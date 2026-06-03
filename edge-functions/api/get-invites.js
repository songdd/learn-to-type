// functions/get-invites.js - 支持过滤的后端分页查询

export async function onRequest({ request, env }) {
    // 处理 CORS
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
        const url = new URL(request.url);
        const page = parseInt(url.searchParams.get('page')) || 1;
        const pageSize = parseInt(url.searchParams.get('pageSize')) || 20;
        const offset = (page - 1) * pageSize;
        
        // 获取过滤参数
        const filterName = url.searchParams.get('name') || '';
        const filterUsed = url.searchParams.get('used'); // 'true' 或 'false' 或 null
        
        const supabaseUrl = env.SUPABASE_URL;
        const supabaseKey = env.SUPABASE_SERVICE_KEY;
        
        // 构建过滤条件
        let filters = [];
        if (filterName) {
            // 使用 ilike 进行模糊匹配（不区分大小写）
            filters.push(`name=ilike.*${encodeURIComponent(filterName)}*`);
        }
        if (filterUsed !== null) {
            filters.push(`used=eq.${filterUsed}`);
        }
        
        const filterStr = filters.length > 0 ? `&${filters.join('&')}` : '';
        
        // 1. 查询总数（带过滤条件）
        const countUrl = `${supabaseUrl}/rest/v1/invites?select=id${filterStr}`;
        const countResponse = await fetch(countUrl, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });
        
        const allData = await countResponse.json();
        const total = allData.length;
        const totalPages = Math.ceil(total / pageSize);
        
        // 2. 查询分页数据（带过滤条件和排序）
        const queryUrl = `${supabaseUrl}/rest/v1/invites?select=*&order=id.desc&limit=${pageSize}&offset=${offset}${filterStr}`;
        
        const response = await fetch(queryUrl, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });
        
        if (!response.ok) {
            throw new Error('查询失败');
        }
        
        const data = await response.json();
        
        return new Response(JSON.stringify({
            success: true,
            data: data,
            total: total,
            page: page,
            pageSize: pageSize,
            totalPages: totalPages
        }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
        
    } catch (error) {
        console.error('查询错误:', error);
        return new Response(JSON.stringify({ 
            success: false, 
            message: '服务器错误', 
            data: [],
            total: 0,
            totalPages: 0
        }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }
}