// edge-functions/api/export-logs.js - 导出登录记录为 CSV

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
        
        // 查询所有登录记录
        const queryUrl = `${supabaseUrl}/rest/v1/login_logs?select=id,user_name,invite_code,login_time,ip_address,user_agent&order=login_time.desc`
        
        const response = await fetch(queryUrl, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        })
        
        if (!response.ok) {
            throw new Error('查询登录记录失败')
        }
        
        const data = await response.json()
        
        // 构建 CSV
        const headers = ['ID', '用户名称', '邀请码', '登录时间', 'IP地址', '设备信息']
        const rows = data.map(row => [
            row.id || '',
            row.user_name || '',
            row.invite_code || '',
            row.login_time ? new Date(row.login_time).toLocaleString('zh-CN') : '',
            row.ip_address || '-',
            (row.user_agent || '-').substring(0, 100) // 截断过长的设备信息
        ])
        
        let csv = headers.join(',') + '\n'
        rows.forEach(row => {
            // 处理包含逗号、引号、换行的字段
            const escapedRow = row.map(cell => {
                if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"') || cell.includes('\n'))) {
                    return `"${cell.replace(/"/g, '""')}"`
                }
                return cell
            })
            csv += escapedRow.join(',') + '\n'
        })
        
        // 添加 BOM 以支持 Excel 中文
        const csvWithBOM = '\uFEFF' + csv
        
        return new Response(csvWithBOM, {
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename=login_logs_${new Date().toISOString().split('T')[0]}.csv`,
                'Access-Control-Allow-Origin': '*'
            }
        })
        
    } catch (error) {
        console.error('导出失败:', error)
        return new Response(JSON.stringify({ 
            success: false, 
            message: '导出失败，请稍后重试' 
        }), {
            status: 500,
            headers: { 
                'Content-Type': 'application/json', 
                'Access-Control-Allow-Origin': '*' 
            }
        })
    }
}