// edge-functions/api/get-poems.js
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

        // ============================================================
        // 1. 先获取总数
        // ============================================================
        const countUrl = `${supabaseUrl}/rest/v1/poems?select=id`;
        const countRes = await fetch(countUrl, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });
        const countData = await countRes.json();
        const total = countData.length;
        console.log(`📊 总诗词数: ${total}`);

        // ============================================================
        // 2. 分页获取所有数据（每页 5000 条）
        // ============================================================
        const pageSize = 5000;
        const totalPages = Math.ceil(total / pageSize);
        let allData = [];

        console.log(`📖 开始分页获取，共 ${totalPages} 页`);

        for (let page = 0; page < totalPages; page++) {
            const offset = page * pageSize;
            const queryUrl = `${supabaseUrl}/rest/v1/poems?select=id,title,author,category,dynasty,content&order=id.asc&limit=${pageSize}&offset=${offset}`;

            console.log(`  📄 获取第 ${page + 1}/${totalPages} 页 (offset: ${offset})`);

            const response = await fetch(queryUrl, {
                headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`
                }
            });

            if (!response.ok) {
                throw new Error(`查询第 ${page + 1} 页失败: ${response.status}`);
            }

            const data = await response.json();
            allData = allData.concat(data);

            // 避免请求过快，稍微延迟
            if (page < totalPages - 1) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        console.log(`✅ 获取完成，共 ${allData.length} 条数据`);

        return new Response(JSON.stringify({
            success: true,
            data: allData,
            total: allData.length
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