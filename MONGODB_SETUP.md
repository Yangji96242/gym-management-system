# MongoDB Atlas 配置指南

## 第一步：注册MongoDB Atlas账号

1. 访问 https://www.mongodb.com/atlas/database
2. 点击 "Try Free" 或 "Get Started Free"
3. 填写注册信息并创建账号

## 第二步：创建免费集群

1. 登录后点击 "Build a Database"
2. 选择 "FREE" 计划（M0）
3. 选择云服务商（AWS/Google Cloud/Azure）和地区（建议选择离您最近的）
4. 点击 "Create"

## 第三步：创建数据库用户

1. 在 "Security Quickstart" 中创建数据库用户
2. 用户名：`gym-admin`（或您喜欢的用户名）
3. 密码：设置一个强密码（请记住这个密码）
4. 点击 "Create User"

## 第四步：配置网络访问

1. 在 "Network Access" 中点击 "Add IP Address"
2. 选择 "Allow Access from Anywhere"（输入 0.0.0.0/0）
3. 点击 "Confirm"

## 第五步：获取连接字符串

1. 点击 "Database" 标签
2. 点击 "Connect"
3. 选择 "Connect your application"
4. 复制连接字符串，格式如下：
   ```
   mongodb+srv://gym-admin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

## 第六步：配置本地环境

1. 在项目根目录创建 `.env` 文件
2. 添加以下内容（替换为您的实际连接字符串）：
   ```
   MONGODB_URI=mongodb+srv://gym-admin:您的密码@cluster0.xxxxx.mongodb.net/gym-management?retryWrites=true&w=majority
   PORT=3000
   NODE_ENV=development
   ```

## 第七步：测试连接

运行以下命令测试连接：
```bash
npm start
```

如果看到 "已连接到MongoDB Atlas" 消息，说明配置成功！

## 第八步：Vercel部署配置

在Vercel项目设置中添加环境变量：
- 变量名：`MONGODB_URI`
- 变量值：您的MongoDB Atlas连接字符串

## 注意事项

1. **密码安全**：不要在代码中硬编码密码
2. **网络访问**：生产环境建议限制IP访问
3. **备份**：定期备份数据库
4. **监控**：关注数据库使用量（免费版有512MB限制）

## 故障排除

如果连接失败：
1. 检查用户名和密码是否正确
2. 确认网络访问设置
3. 检查连接字符串格式
4. 查看控制台错误信息

## 免费版限制

- 存储空间：512MB
- 共享RAM：512MB
- 每日操作：500次
- 适合开发和测试使用 