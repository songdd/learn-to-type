// edge-functions/api/get-poem-by-id.js
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
        const id = url.searchParams.get('id');

        if (!id) {
            return new Response(JSON.stringify({
                success: false,
                message: '缺少 id 参数'
            }), {
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }

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

        const queryUrl = `${supabaseUrl}/rest/v1/poems?select=id,title,author,category,dynasty,content&id=eq.${id}`;

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

        if (!data || data.length === 0) {
            return new Response(JSON.stringify({
                success: false,
                message: '未找到该诗词'
            }), {
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }

        return new Response(JSON.stringify({
            success: true,
            data: data[0]
        }), {
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });

    } catch (error) {
        console.error('获取诗词失败:', error);
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