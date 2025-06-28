# Vercel 部署指南

## 步骤 1: 准备代码

确保您的项目包含以下文件：
- `package.json` - 项目依赖配置
- `server.js` - 服务器代码
- `vercel.json` - Vercel配置文件
- `index.html` - 前端页面
- `style.css` - 样式文件
- `app.js` - 前端JavaScript

## 步骤 2: 创建GitHub仓库

1. 访问 [GitHub.com](https://github.com)
2. 点击 "New repository"
3. 输入仓库名称，如 `gym-management-system`
4. 选择 "Public" 或 "Private"
5. 点击 "Create repository"

## 步骤 3: 上传代码到GitHub

在您的项目目录中运行以下命令：

```bash
# 初始化Git仓库
git init

# 添加所有文件
git add .

# 提交更改
git commit -m "Initial commit: 健身房客户管理系统"

# 添加远程仓库（替换YOUR_USERNAME和YOUR_REPO_NAME）
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# 推送到GitHub
git push -u origin main
```

## 步骤 4: 部署到Vercel

1. 访问 [Vercel.com](https://vercel.com)
2. 使用GitHub账号登录
3. 点击 "New Project"
4. 选择您刚创建的GitHub仓库
5. 保持默认设置，点击 "Deploy"

## 步骤 5: 配置环境变量（可选）

在Vercel项目设置中，您可以添加环境变量：
- `NODE_ENV=production`

## 步骤 6: 访问您的应用

部署完成后，Vercel会提供一个URL，类似：
`https://your-project-name.vercel.app`

## 注意事项

1. **数据库限制**: Vercel使用无服务器函数，每次请求都会创建新的数据库连接。对于生产环境，建议使用外部数据库服务。

2. **文件系统**: Vercel的文件系统是只读的，SQLite数据库文件会在每次部署时重置。

3. **冷启动**: 首次访问可能需要几秒钟来启动服务器。

## 替代方案

如果您需要持久化数据存储，建议：
1. 使用 MongoDB Atlas（免费层）
2. 使用 Supabase（免费层）
3. 使用 PlanetScale（免费层）

## 故障排除

如果部署失败：
1. 检查 `package.json` 中的依赖是否正确
2. 确保 `vercel.json` 配置正确
3. 查看Vercel部署日志中的错误信息

## 本地测试

在部署前，您可以在本地测试：

```bash
npm install
npm start
```

然后访问 `http://localhost:3000` 