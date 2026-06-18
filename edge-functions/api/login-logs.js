// edge-functions/api/login-logs.js - 登录记录列表（分页+筛选）

export async function onRequest(context) {
    const { request, env } = context;
    
    // 处理 CORS 预检请求
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            }
        })
    }
    
    // 只接受 GET 请求
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
        })
    }
    
    try {
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
        
        // 获取分页参数
        const url = new URL(request.url)
        const page = parseInt(url.searchParams.get('page')) || 1
        const pageSize = parseInt(url.searchParams.get('pageSize')) || 20
        const offset = (page - 1) * pageSize
        
        // 获取筛选参数
        const userName = url.searchParams.get('userName') || ''
        const inviteCode = url.searchParams.get('inviteCode') || ''
        const startDate = url.searchParams.get('startDate') || ''
        const endDate = url.searchParams.get('endDate') || ''
        
        // 构建过滤条件数组
        const filters = []
        
        // 注意：ilike 的语法是 column=ilike.*value* 
        // 但 * 在 URL 中需要编码为 %2A
        if (userName && userName.trim() !== '') {
            filters.push(`user_name=ilike.*${encodeURIComponent(userName.trim())}*`)
        }
        if (inviteCode && inviteCode.trim() !== '') {
            filters.push(`invite_code=ilike.*${encodeURIComponent(inviteCode.trim())}*`)
        }
        if (startDate && startDate.trim() !== '') {
            const start = new Date(startDate.trim())
            if (!isNaN(start.getTime())) {
                filters.push(`login_time=gte.${start.toISOString()}`)
            }
        }
        if (endDate && endDate.trim() !== '') {
            const end = new Date(endDate.trim())
            if (!isNaN(end.getTime())) {
                end.setHours(23, 59, 59, 999)
                filters.push(`login_time=lte.${end.toISOString()}`)
            }
        }
        
        // 构建完整的查询 URL
        // 注意：使用 PostgREST 的过滤器，需要用 & 连接
        const filterString = filters.length > 0 ? '&' + filters.join('&') : ''
        
        // 数据查询
        const dataUrl = `${supabaseUrl}/rest/v1/login_logs?select=id,user_name,invite_code,login_time,ip_address,user_agent&order=login_time.desc&limit=${pageSize}&offset=${offset}${filterString}`
        
        console.log('查询数据 URL:', dataUrl)
        
        const response = await fetch(dataUrl, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        })
        
        if (!response.ok) {
            const errorText = await response.text()
            console.error('查询失败:', response.status, errorText)
            return new Response(JSON.stringify({
                success: false,
                message: `查询失败: ${response.status}`,
                error: errorText,
                data: [],
                total: 0,
                totalPages: 0
            }), {
                headers: { 
                    'Content-Type': 'application/json', 
                    'Access-Control-Allow-Origin': '*' 
                }
            })
        }
        
        const data = await response.json()
        
        // 获取总数 - 使用 count 查询
        let countUrl = `${supabaseUrl}/rest/v1/login_logs?select=id${filterString}`
        
        const countResponse = await fetch(countUrl, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        })
        
        let total = data.length
        if (countResponse.ok) {
            const countData = await countResponse.json()
            total = countData.length
        }
        
        const totalPages = Math.ceil(total / pageSize)
        
        return new Response(JSON.stringify({
            success: true,
            data: data,
            total: total,
            page: page,
            pageSize: pageSize,
            totalPages: totalPages,
            // 调试信息（生产环境可移除）
            _debug: {
                filters: filters,
                dataUrl: dataUrl
            }
        }), {
            headers: { 
                'Content-Type': 'application/json', 
                'Access-Control-Allow-Origin': '*' 
            }
        })
        
    } catch (error) {
        console.error('查询登录记录失败:', error)
        return new Response(JSON.stringify({ 
            success: false, 
            message: error.message || '查询失败，请稍后重试',
            stack: error.stack,
            data: [],
            total: 0,
            totalPages: 0
        }), {
            status: 500,
            headers: { 
                'Content-Type': 'application/json', 
                'Access-Control-Allow-Origin': '*' 
            }
        })
    }
}