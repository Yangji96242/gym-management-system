# Vercel 部署说明

## 1. 环境变量配置（重要！）

在 Vercel 项目设置中，必须配置以下环境变量：

### MONGODB_URI
你的 MongoDB Atlas 连接字符串，格式如下：
```
mongodb+srv://username:password@cluster.mongodb.net/gym-management?retryWrites=true&w=majority
```

## 2. 配置步骤

1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 选择你的 `gym-management-system` 项目
3. 进入 **Settings** 标签页
4. 点击 **Environment Variables**
5. 添加以下变量：
   - **Name**: `MONGODB_URI`
   - **Value**: 你的 MongoDB Atlas 连接字符串
   - **Environment**: Production, Preview, Development (全选)
6. 点击 **Save**

## 3. 重新部署

配置环境变量后，需要重新部署项目：

1. 在 Vercel 控制台中点击 **Deployments** 标签页
2. 找到最新的部署记录
3. 点击 **Redeploy** 按钮
4. 等待部署完成

## 4. 测试部署

部署成功后，访问以下链接测试：

### 基础测试
- 测试端点: `https://your-domain.vercel.app/api/test`
- 健康检查: `https://your-domain.vercel.app/api/health`

### 功能测试
- 客户列表: `https://your-domain.vercel.app/api/customers`
- 今日打卡: `https://your-domain.vercel.app/api/checkins/today`

## 5. 故障排除

### 500 错误
1. **检查环境变量**：
   - 确保 `MONGODB_URI` 已正确设置
   - 检查连接字符串格式是否正确
   - 确保选择了所有环境（Production, Preview, Development）

2. **检查 MongoDB Atlas**：
   - 确保集群状态正常
   - 检查网络访问设置（建议设置为允许所有 IP：`0.0.0.0/0`）
   - 验证用户名和密码是否正确

3. **检查 Vercel 日志**：
   - 在 Vercel 控制台中查看部署日志
   - 检查 Function Logs 中的错误信息

### 连接超时
- 确保 MongoDB Atlas 集群状态正常
- 检查网络连接
- 尝试重新部署

### 环境变量问题
如果健康检查显示 `mongodb_uri_set: false`，说明环境变量未正确设置。

## 6. 本地开发

本地开发时，创建 `.env` 文件：
```
MONGODB_URI=your_mongodb_connection_string
NODE_ENV=development
```

## 7. 常见错误信息

### "数据库连接失败"
- 检查 `MONGODB_URI` 环境变量
- 确保 MongoDB Atlas 网络访问设置正确

### "FUNCTION_INVOCATION_FAILED"
- 通常是环境变量或数据库连接问题
- 检查 Vercel 函数日志

### "Unexpected token '<'"
- 通常是路由配置问题
- 检查 `vercel.json` 配置

## 8. 性能优化

- 函数超时设置为 30 秒
- 使用 sfo1 区域部署
- 启用缓存（如需要）

## 9. 监控和维护

- 定期检查 Vercel 函数日志
- 监控 MongoDB Atlas 连接状态
- 检查应用性能指标 