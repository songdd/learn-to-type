// edge-functions/api/export-logs.js - 导出登录记录为 CSV

import logger from '../utils/logger.js';

const MODULE = 'export-logs';

export async function onRequest(context) {
    const { request, env } = context;
    
    logger.init(env);
    logger.request(MODULE, request);
    
    if (request.method === 'OPTIONS') {
        logger.debug(MODULE, 'CORS 预检请求');
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
        logger.warn(MODULE, '❌ 非 GET 请求', { method: request.method });
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
        logger.env(MODULE, env);
        
        const supabaseUrl = env.SUPABASE_URL;
        const supabaseKey = env.SUPABASE_SERVICE_KEY;
        
        if (!supabaseUrl || !supabaseKey) {
            logger.error(MODULE, '❌ 环境变量未配置');
            return new Response(JSON.stringify({ 
                success: false, 
                message: '服务器配置错误，请联系管理员' 
            }), {
                headers: { 
                    'Content-Type': 'application/json', 
                    'Access-Control-Allow-Origin': '*' 
                }
            });
        }
        
        const queryUrl = `${supabaseUrl}/rest/v1/login_logs?select=id,user_name,invite_code,login_time,ip_address,user_agent&order=login_time.desc`;
        logger.supabase(MODULE, '查询导出数据', queryUrl);
        
        const response = await fetch(queryUrl, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });
        
        if (!response.ok) {
            throw new Error('查询登录记录失败');
        }
        
        const data = await response.json();
        logger.info(MODULE, `📊 导出 ${data.length} 条记录`);
        
        const headers = ['ID', '用户名称', '邀请码', '登录时间', 'IP地址', '设备信息'];
        const rows = data.map(row => [
            row.id || '',
            row.user_name || '',
            row.invite_code || '',
            row.login_time ? new Date(row.login_time).toLocaleString('zh-CN') : '',
            row.ip_address || '-',
            (row.user_agent || '-').substring(0, 100)
        ]);
        
        let csv = headers.join(',') + '\n';
        rows.forEach(row => {
            const escapedRow = row.map(cell => {
                if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"') || cell.includes('\n'))) {
                    return `"${cell.replace(/"/g, '""')}"`;
                }
                return cell;
            });
            csv += escapedRow.join(',') + '\n';
        });
        
        const csvWithBOM = '\uFEFF' + csv;
        
        logger.info(MODULE, '✅ CSV 导出成功');
        
        return new Response(csvWithBOM, {
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename=login_logs_${new Date().toISOString().split('T')[0]}.csv`,
                'Access-Control-Allow-Origin': '*'
            }
        });
        
    } catch (error) {
        logger.errorWithStack(MODULE, error);
        return new Response(JSON.stringify({ 
            success: false, 
            message: '导出失败，请稍后重试' 
        }), {
            status: 500,
            headers: { 
                'Content-Type': 'application/json', 
                'Access-Control-Allow-Origin': '*' 
            }
        });
    }
}