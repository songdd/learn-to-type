// edge-functions/api/get-poem-count.js
export async function onRequest(context) {
    const { request, env } = context;

    if (request.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            }
        });
    }

    if (request.method !== 'GET') {
        return new Response(JSON.stringify({
            success: false,
            message: '请使用 GET 请求'
        }), {
            status: 405,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }

    try {
        const url = new URL(request.url);
        const dynasty = url.searchParams.get('dynasty') || '';
        const author = url.searchParams.get('author') || '';

        const supabaseUrl = env.SUPABASE_URL;
        const supabaseKey = env.SUPABASE_SERVICE_KEY;

        if (!supabaseUrl || !supabaseKey) {
            return new Response(JSON.stringify({
                success: false,
                message: '服务器配置错误'
            }), {
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }

        let filters = [];
        if (dynasty && dynasty !== 'all') {
            filters.push(`dynasty=eq.${encodeURIComponent(dynasty)}`);
        }
        if (author && author !== 'all') {
            filters.push(`author=eq.${encodeURIComponent(author)}`);
        }
        const filterStr = filters.length > 0 ? '&' + filters.join('&') : '';

        const queryUrl = `${supabaseUrl}/rest/v1/poems?select=id${filterStr}`;

        const response = await fetch(queryUrl, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });

        if (!response.ok) {
            throw new Error(`查询失败: ${response.status}`);
        }

        const data = await response.json();

        return new Response(JSON.stringify({
            success: true,
            count: data.length
        }), {
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });

    } catch (error) {
        console.error('获取数量失败:', error);
        return new Response(JSON.stringify({
            success: false,
            message: error.message || '服务器错误'
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
}