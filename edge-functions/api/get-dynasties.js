// edge-functions/api/get-dynasties.js
export async function onRequest(context) {
    const { request, env } = context;

    // CORS 预检
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

        // ✅ 使用 dynasties 表（毫秒级响应）
        const queryUrl = `${supabaseUrl}/rest/v1/dynasties?select=name,poem_count&order=poem_count.desc`;

        console.log('📊 查询朝代（dynasties 表）');

        const response = await fetch(queryUrl, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('查询失败:', response.status, errorText);
            
            // 降级：如果表不存在，尝试从 poems 表查询
            return await fallbackQuery(supabaseUrl, supabaseKey);
        }

        const data = await response.json();

        // 转换为前端期望格式
        const result = data.map(item => ({
            dynasty: item.name,
            count: item.poem_count
        }));

        console.log(`✅ 获取到 ${result.length} 个朝代（dynasties 表）`);

        return new Response(JSON.stringify({
            success: true,
            data: result,
            total: result.length,
            source: 'dynasties_table'
        }), {
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });

    } catch (error) {
        console.error('获取朝代列表失败:', error);
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

// 降级方案：直接从 poems 表查询
async function fallbackQuery(supabaseUrl, supabaseKey) {
    try {
        console.warn('⚠️ dynasties 表查询失败，降级到 poems 表');
        
        const queryUrl = `${supabaseUrl}/rest/v1/poems?select=dynasty`;
        const response = await fetch(queryUrl, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });

        if (!response.ok) {
            throw new Error('降级查询失败');
        }

        const data = await response.json();

        // 手动统计
        const dynastyMap = new Map();
        data.forEach(item => {
            if (item.dynasty && item.dynasty.trim()) {
                const d = item.dynasty.trim();
                dynastyMap.set(d, (dynastyMap.get(d) || 0) + 1);
            }
        });

        const result = Array.from(dynastyMap.entries())
            .map(([dynasty, count]) => ({ dynasty, count }))
            .sort((a, b) => b.count - a.count);

        console.log(`✅ 降级查询获取到 ${result.length} 个朝代`);

        return new Response(JSON.stringify({
            success: true,
            data: result,
            total: result.length,
            source: 'fallback_poems_table'
        }), {
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    } catch (e) {
        console.error('降级查询失败:', e);
        return new Response(JSON.stringify({
            success: false,
            message: '查询失败',
            data: []
        }), {
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
}