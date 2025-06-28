# Vercel 部署说明

## 1. 环境变量配置

在 Vercel 项目设置中，必须配置以下环境变量：

### MONGODB_URI
你的 MongoDB Atlas 连接字符串，格式如下：
```
mongodb+srv://username:password@cluster.mongodb.net/gym-management?retryWrites=true&w=majority
```

## 2. 配置步骤

1. 登录 Vercel 控制台
2. 选择你的项目
3. 进入 "Settings" 标签页
4. 点击 "Environment Variables"
5. 添加以下变量：
   - **Name**: `MONGODB_URI`
   - **Value**: 你的 MongoDB Atlas 连接字符串
   - **Environment**: Production, Preview, Development (全选)

## 3. 重新部署

配置环境变量后，需要重新部署项目：

1. 在 Vercel 控制台中点击 "Deployments"
2. 找到最新的部署
3. 点击 "Redeploy" 按钮

## 4. 常见问题

### 500 错误
- 检查 `MONGODB_URI` 环境变量是否正确设置
- 确保 MongoDB Atlas 网络访问设置允许 Vercel 的 IP 地址
- 检查 MongoDB Atlas 用户名和密码是否正确

### 连接超时
- 确保 MongoDB Atlas 集群状态正常
- 检查网络连接

## 5. 测试部署

部署成功后，访问以下端点测试：

- 健康检查: `https://your-domain.vercel.app/api/health`
- 客户列表: `https://your-domain.vercel.app/api/customers`

## 6. 本地开发

本地开发时，创建 `.env` 文件并添加：
```
MONGODB_URI=your_mongodb_connection_string
PORT=3000
NODE_ENV=development
``` 