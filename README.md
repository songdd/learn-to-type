# 邀请码管理系统设计文档

## 一、系统概述

### 1.1 项目背景
战机打字员游戏采用邀请制登录，只有获得有效邀请码的用户才能进入游戏。本系统负责邀请码的生成、入库、查询、统计和删除等管理功能。

### 1.2 技术架构
┌─────────────────────────────────────────────────────────────────┐
│ 前端（浏览器） │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐ │
│ │ login.html │ │ admin.html │ │ index.html │ │
│ │ 用户登录页 │ │ 管理后台 │ │ 游戏主页 │ │
│ └──────┬──────┘ └──────┬──────┘ └───────────┬─────────────┘ │
│ │ │ │ │
│ └────────────────┼──────────────────────┘ │
│ │ │
│ fetch('/api/xxx') │
└──────────────────────────┼───────────────────────────────────────┘
│
┌──────────────────────────┼───────────────────────────────────────┐
│ EdgeOne Pages Functions │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────┐ │
│ │ verify.js │ │ get-invites │ │ add-invite │ │ delete- │ │
│ │ 验证邀请码 │ │ 分页查询 │ │ 添加入库 │ │ invite │ │
│ └──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └────┬────┘ │
│ │ │ │ │ │
│ └────────────────┼────────────────┼──────────────┘ │
│ │ │ │
│ fetch REST API │
└──────────────────────────┼────────────────┼──────────────────────┘
│ │
┌──────────────────────────┼────────────────┼──────────────────────┐
│ Supabase 数据库 │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ invites 表 ││
│ │ ┌─────┬──────────────┬────────┬───────┬─────────────────┐ ││
│ │ │ id │ code │ name │ used │ created_at │ ││
│ │ ├─────┼──────────────┼────────┼───────┼─────────────────┤ ││
│ │ │ 1 │ zhangxiao_8a3f│ 张潇 │ false │ 2024-01-15 ... │ ││
│ │ │ 2 │ lihua_b4e9 │ 李华 │ true │ 2024-01-16 ... │ ││
│ │ └─────┴──────────────┴────────┴───────┴─────────────────┘ ││
│ └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘


---

## 二、数据库设计

### 2.1 表结构 `invites`

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `id` | SERIAL | PRIMARY KEY | 自增主键 |
| `code` | VARCHAR(50) | UNIQUE NOT NULL | 邀请码，唯一标识 |
| `name` | VARCHAR(100) | NOT NULL | 好友名称 |
| `used` | BOOLEAN | DEFAULT FALSE | 是否已使用 |
| `created_at` | TIMESTAMP | DEFAULT NOW() | 创建时间 |

### 2.2 建表 SQL

```sql
-- 创建邀请码表
CREATE TABLE IF NOT EXISTS invites (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 创建索引（提升查询性能）
CREATE INDEX IF NOT EXISTS idx_invites_code ON invites(code);
CREATE INDEX IF NOT EXISTS idx_invites_used ON invites(used);
```

### 2.3 常用 SQL 操作

```sql
-- 插入邀请码
INSERT INTO invites (code, name) VALUES ('zhangxiao_8a3f', '张潇');

-- 查询所有未使用的邀请码
SELECT * FROM invites WHERE used = false ORDER BY id DESC;

-- 标记邀请码为已使用
UPDATE invites SET used = true WHERE code = 'zhangxiao_8a3f';

-- 重置邀请码（好友换设备时使用）
UPDATE invites SET used = false WHERE code = 'zhangxiao_8a3f';

-- 删除邀请码
DELETE FROM invites WHERE code = 'zhangxiao_8a3f';

-- 统计信息
SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN used = true THEN 1 ELSE 0 END) as used,
    SUM(CASE WHEN used = false THEN 1 ELSE 0 END) as unused
FROM invites;

```

## 三、API 接口设计

### 3.1 验证邀请码 POST /api/verify

请求
{
    "code": "zhangxiao_8a3f"
}

响应（成功）
{
    "success": true,
    "name": "张潇",
    "message": "验证成功！"
}

响应（失败）
{
    "success": false,
    "message": "邀请码无效 / 此邀请码已被使用"
}

### 3.2 分页查询 GET /api/get-invites

请求参数
参数	类型	必填	说明
page	int	否	页码，默认 1
pageSize	int	否	每页数量，默认 20
name	string	否	按名称模糊搜索
used	string	否	状态过滤：true/false


响应

{
    "success": true,
    "data": [...],
    "total": 50,
    "page": 1,
    "pageSize": 20,
    "totalPages": 3
}


### 3.3 添加入库 POST /api/add-invite

请求
{
    "code": "zhangxiao_8a3f",
    "name": "张潇"
}

响应
{
    "success": true,
    "message": "入库成功"
}

### 3.4 删除邀请码 POST /api/delete-invite

请求

{
    "id": 1
}

响应

{
    "success": true,
    "message": "删除成功"
}

### 3.5 统计信息 GET /api/get-stats
响应

{
    "success": true,
    "total": 50,
    "used": 12,
    "unused": 38
}

## 四、前端页面设计
### 4.1 登录页 login.html
功能
    邀请码输入框
    验证按钮
    抖音/微信二维码展示（添加好友获取邀请码）
    支持 URL 参数自动填充 ?code=xxx
流程

用户访问 → 输入邀请码 → 点击验证 → 调用 /api/verify
                                    ↓
                              成功 → 保存登录凭证 → 跳转游戏
                              失败 → 显示错误提示
							  
### 4.2 管理后台 admin.html	

功能
    统计卡片（总数、已使用、未使用）
    生成邀请码（输入好友名称 → 预览 → 入库）
    筛选功能（按名称搜索、按状态过滤）
    邀请码列表（分页展示）
    操作功能（复制链接、复制邀请码、删除）

页面布局
┌─────────────────────────────────────────────────────────────┐
│                      统计卡片（全量数据）                      │
├─────────────────────────────────────────────────────────────┤
│  好友名称 [____]  抖音号 [____]  [💾 入库]                    │
│  预览：zhangxiao_8a3f / login.html?code=xxx                  │
├─────────────────────────────────────────────────────────────┤
│  名称搜索 [____]  状态 [全部▼]  [🔍搜索] [🗑️清空]            │
├─────────────────────────────────────────────────────────────┤
│  每页 [20▼] 条    ◀ 第1/3页 ▶    共 50 条                    │
├─────────────────────────────────────────────────────────────┤
│  ID │ 好友 │ 邀请码 │ 状态 │ 创建时间 │ 链接 │ 操作          │
│  1  │ 张潇 │ xxx   │ 未使用│ 2024... │ 链接 │ 📋🔑🗑️        │
└─────────────────────────────────────────────────────────────┘	


### 4.3 游戏页 index.html 登录检查
// 页面加载时检查登录状态
const loggedIn = localStorage.getItem('logged_in');
if (!loggedIn) {
    window.location.href = 'login.html';
}

## 五、邀请码生成规则

### 5.1 格式
{前缀}_{6位随机字符}

示例：zhangxiao_8a3f2c

### 5.2 前缀规则
场景	前缀来源	示例
填写了抖音号	使用抖音号	zhangxiao_8a3f2c
未填写抖音号	好友名称前4位	张潇_8a3f2c

### 5.3 随机后缀生成
const suffix = Math.random().toString(36).substring(2, 8);
// 结果示例：8a3f2c

## 六、登录凭证管理


### 6.1 存储方式

使用浏览器 localStorage 存储：
javascript

localStorage.setItem('logged_in', 'true');
localStorage.setItem('user_name', '张潇');

### 6.2 有效期策略

采用永久有效策略，不清除浏览器数据就一直有效。用户在以下情况需要重新登录：
    主动清除浏览器数据
    更换设备
    重装系统

### 6.3 重置邀请码

当用户因上述原因无法登录时，管理员在 Supabase 中执行：
sql

UPDATE invites SET used = false WHERE name = '好友名称';

