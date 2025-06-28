# 轻刻运动 - 健身房客户管理系统

一个现代化的健身房客户管理系统，使用SQLite数据库存储数据。

## 功能特性

- ✅ 客户信息管理（姓名、手机号、性别、项目开始/结束日期）
- ✅ 每日打卡系统
- ✅ 实时中国时间显示
- ✅ 到期提醒（7天内到期）
- ✅ 缺席提醒（3天以上未打卡）
- ✅ 客户搜索功能
- ✅ 数据持久化存储（SQLite数据库）

## 技术栈

- **前端**: HTML5, CSS3, JavaScript (ES6+)
- **后端**: Node.js, Express.js
- **数据库**: SQLite3
- **UI框架**: Font Awesome 图标

## 安装和运行

### 1. 安装依赖

```bash
npm install
```

### 2. 启动服务器

```bash
npm start
```

或者使用开发模式（自动重启）：

```bash
npm run dev
```

### 3. 访问系统

打开浏览器访问：`http://localhost:3000`

## 数据库结构

### customers 表（客户信息）
- `id`: 主键，自增
- `name`: 客户姓名
- `phone`: 手机号（唯一）
- `gender`: 性别
- `start_date`: 项目开始日期
- `end_date`: 项目结束日期
- `created_at`: 创建时间

### checkins 表（打卡记录）
- `id`: 主键，自增
- `customer_id`: 客户ID（外键）
- `checkin_date`: 打卡日期
- `checkin_time`: 打卡时间
- `created_at`: 创建时间

## API接口

### 客户管理
- `GET /api/customers` - 获取所有客户
- `POST /api/customers` - 添加新客户
- `DELETE /api/customers/:id` - 删除客户
- `GET /api/customers/search?q=关键词` - 搜索客户

### 打卡管理
- `POST /api/checkins` - 客户打卡
- `GET /api/checkins/today` - 获取今日打卡记录

### 提醒功能
- `GET /api/reminders/expiry` - 获取到期提醒
- `GET /api/reminders/absence` - 获取缺席提醒

## 使用说明

### 添加客户
1. 在左侧"新增客户"区域填写客户信息
2. 点击"保存客户"按钮

### 客户打卡
1. 在"今日打卡"区域选择客户
2. 点击"打卡"按钮

### 查看提醒
- 右侧"到期提醒"显示7天内到期的客户
- 右侧"缺席提醒"显示3天以上未打卡的客户

### 搜索客户
在客户列表上方的搜索框中输入姓名或手机号

### 删除客户
点击客户列表中的客户项，在弹出的详情窗口中点击"删除客户"

## 文件结构

```
gym-management-system/
├── index.html          # 主页面
├── style.css           # 样式文件
├── app.js              # 前端JavaScript
├── server.js           # 后端服务器
├── package.json        # 项目配置
├── gym.db              # SQLite数据库文件（自动生成）
└── README.md           # 说明文档
```

## 注意事项

1. 确保Node.js版本 >= 14.0.0
2. 首次运行会自动创建数据库文件 `gym.db`
3. 数据库文件会保存在项目根目录
4. 建议定期备份数据库文件

## 开发说明

### 添加新功能
1. 在后端 `server.js` 中添加新的API路由
2. 在前端 `app.js` 中添加对应的功能逻辑
3. 如需要，更新数据库结构

### 数据库备份
```bash
# 备份数据库
cp gym.db gym_backup_$(date +%Y%m%d).db
```

## 许可证

MIT License 