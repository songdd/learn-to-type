// edge-functions/api/get-poems-v2.js
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
        const search = url.searchParams.get('search') || '';
        const page = parseInt(url.searchParams.get('page')) || 1;
        const pageSize = parseInt(url.searchParams.get('pageSize')) || 12;
        const offset = (page - 1) * pageSize;

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
        // 构建过滤条件
        // ============================================================
        let filters = [];
        if (dynasty && dynasty !== 'all') {
            filters.push(`dynasty=eq.${encodeURIComponent(dynasty)}`);
        }
        if (author && author !== 'all') {
            filters.push(`author=eq.${encodeURIComponent(author)}`);
        }
        if (search && search.trim() !== '') {
            const searchTerm = encodeURIComponent(search.trim());
            filters.push(`or=(title.ilike.*${searchTerm}*,author.ilike.*${searchTerm}*,content.ilike.*${searchTerm}*)`);
        }

        const filterStr = filters.length > 0 ? '&' + filters.join('&') : '';

        // ============================================================
        // 1. 获取总数
        // ============================================================
        let total = 0;

        // 如果有搜索，必须从 poems 表 count
        if (search && search.trim() !== '') {
            try {
                const countUrl = `${supabaseUrl}/rest/v1/poems?select=id${filterStr}&limit=0`;
                const countResponse = await fetch(countUrl, {
                    headers: {
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${supabaseKey}`,
                        'Prefer': 'count=exact'
                    }
                });

                if (countResponse.ok) {
                    const contentRange = countResponse.headers.get('Content-Range');
                    if (contentRange) {
                        const match = contentRange.match(/items \d+-\d+\/(\d+)/);
                        if (match) {
                            total = parseInt(match[1]);
                        }
                    }
                    if (total === 0) {
                        const countData = await countResponse.json();
                        total = Array.isArray(countData) ? countData.length : 0;
                    }
                }
                console.log(`📊 搜索总数: ${total}`);
            } catch (e) {
                console.warn('搜索计数失败:', e.message);
                total = 0;
            }
        } 
        // ✅ 按作者：从 authors 表获取 poem_count
        else if (author && author !== 'all') {
            try {
                const queryUrl = `${supabaseUrl}/rest/v1/authors?select=poem_count&name=eq.${encodeURIComponent(author)}`;
                const response = await fetch(queryUrl, {
                    headers: {
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${supabaseKey}`
                    }
                });
                if (response.ok) {
                    const data = await response.json();
                    total = data[0]?.poem_count || 0;
                    console.log(`📊 作者 ${author} 总数: ${total}`);
                } else {
                    console.warn(`查询作者失败: ${response.status}`);
                }
            } catch (e) {
                console.warn('获取作者总数失败:', e.message);
                total = 0;
            }
        } 
        // ✅ 按朝代：从 dynasties 表获取 poem_count
        else if (dynasty && dynasty !== 'all') {
            try {
                const queryUrl = `${supabaseUrl}/rest/v1/dynasties?select=poem_count&name=eq.${encodeURIComponent(dynasty)}`;
                const response = await fetch(queryUrl, {
                    headers: {
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${supabaseKey}`
                    }
                });
                if (response.ok) {
                    const data = await response.json();
                    total = data[0]?.poem_count || 0;
                    console.log(`📊 朝代 ${dynasty} 总数: ${total}`);
                } else {
                    console.warn(`查询朝代失败: ${response.status}`);
                }
            } catch (e) {
                console.warn('获取朝代总数失败:', e.message);
                total = 0;
            }
        } 
        // ✅ 全部：从 dynasties 表汇总
        else {
            try {
                const queryUrl = `${supabaseUrl}/rest/v1/dynasties?select=poem_count`;
                const response = await fetch(queryUrl, {
                    headers: {
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${supabaseKey}`
                    }
                });
                if (response.ok) {
                    const data = await response.json();
                    total = data.reduce((sum, item) => sum + (item.poem_count || 0), 0);
                    console.log(`📊 全部总数: ${total}`);
                } else {
                    console.warn(`查询全部朝代失败: ${response.status}`);
                }
            } catch (e) {
                console.warn('获取全部总数失败:', e.message);
                total = 0;
            }
        }

        const totalPages = Math.ceil(total / pageSize);

        // ============================================================
        // 2. 查询分页数据
        //    ✅ 第1页: offset=0, 返回第1-12首
        //    ✅ 第2页: offset=12, 返回第13-24首
        // ============================================================
        const queryUrl = `${supabaseUrl}/rest/v1/poems?select=id,title,author,category,dynasty,content&order=id.asc&limit=${pageSize}&offset=${offset}${filterStr}`;

        console.log(`📖 查询: page=${page}, offset=${offset}, limit=${pageSize}, total=${total}`);

        const response = await fetch(queryUrl, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('查询数据失败:', response.status, errorText);
            throw new Error(`查询数据失败: ${response.status}`);
        }

        const data = await response.json();

        console.log(`✅ 返回 ${data.length} 条数据 (第${page}页，共${totalPages}页)`);

        return new Response(JSON.stringify({
            success: true,
            data: data,
            total: total,
            page: page,
            pageSize: pageSize,
            totalPages: totalPages,
            filters: { dynasty, author, search }
        }), {
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });

    } catch (error) {
        console.error('查询诗词失败:', error);
        return new Response(JSON.stringify({
            success: false,
            message: error.message || '服务器错误',
            data: [],
            total: 0,
            totalPages: 0
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
}